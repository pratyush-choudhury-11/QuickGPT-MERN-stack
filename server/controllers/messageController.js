import axios from "axios"
import Chat from "../models/Chat.js"
import User from "../models/User.js"
import imagekit from "../configs/imageKit.js"
import openai from '../configs/openai.js'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Fastest Gemini model, no "thinking" delay. Change if you prefer another one.
const TEXT_MODEL = "gemini-2.5-flash-lite"

// Set to true to skip re-uploading the generated image to ImageKit (faster).
// The generated URL is saved directly instead of a Media Library copy.
const SKIP_IMAGE_REUPLOAD = false

// Text-based AI Chat Message Controller (STREAMING)
export const textMessageController = async (req, res) => {
    try {
        const userId = req.user._id

        if (req.user.credits < 1) {
            return res.json({ success: false, message: "You don't have enough credits to use this feature" })
        }

        const { chatId, prompt, stream: wantStream } = req.body

        const chat = await Chat.findOne({ userId, _id: chatId })
        if (!chat) {
            return res.json({ success: false, message: "Chat not found" })
        }

        chat.messages.push({ role: "user", content: prompt, timestamp: Date.now(), isImage: false })

        // OLD CLIENT: normal JSON reply (still faster: quick model + parallel saves)
        if (!wantStream) {
            const { choices } = await openai.chat.completions.create({
                model: TEXT_MODEL,
                messages: [{ role: "user", content: prompt }],
            })

            const reply = { ...choices[0].message, timestamp: Date.now(), isImage: false }
            chat.messages.push(reply)

            await Promise.all([
                chat.save(),
                User.updateOne({ _id: userId }, { $inc: { credits: -1 } }),
            ])

            return res.json({ success: true, reply })
        }

        // NEW CLIENT: streaming reply
        res.setHeader("Content-Type", "text/event-stream")
        res.setHeader("Cache-Control", "no-cache, no-transform")
        res.setHeader("Connection", "keep-alive")
        res.setHeader("X-Accel-Buffering", "no")
        res.flushHeaders()

        const stream = await openai.chat.completions.create({
            model: TEXT_MODEL,
            messages: [{ role: "user", content: prompt }],
            stream: true,
        })

        let content = ""
        for await (const chunk of stream) {
            const token = chunk.choices[0]?.delta?.content || ""
            if (!token) continue
            content += token
            res.write(`data: ${JSON.stringify({ token })}\n\n`)
        }

        const reply = { role: "assistant", content, timestamp: Date.now(), isImage: false }
        chat.messages.push(reply)

        await Promise.all([
            chat.save(),
            User.updateOne({ _id: userId }, { $inc: { credits: -1 } }),
        ])

        res.write(`data: ${JSON.stringify({ done: true, reply })}\n\n`)
        res.end()

    } catch (error) {
        console.log("Text error:", error.message)
        if (res.headersSent) {
            res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
            res.end()
        } else {
            res.json({ success: false, message: error.message })
        }
    }
}

// Image Generation Message Controller
export const imageMessageController = async (req, res) => {
    try {
        const userId = req.user._id

        // Check credits
        if (req.user.credits < 2) {
            return res.json({ success: false, message: "You don't have enough credits to use this feature" })
        }

        const { prompt, chatId, isPublished } = req.body

        // Find chat
        const chat = await Chat.findOne({ userId, _id: chatId })
        if (!chat) {
            return res.json({ success: false, message: "Chat not found" })
        }

        // Push user message
        chat.messages.push({
            role: "user",
            content: prompt,
            timestamp: Date.now(),
            isImage: false
        })

        // Encode the prompt
        const encodedPrompt = encodeURIComponent(prompt)

        // ImageKit AI generation URL (smaller image = faster). The same URL is reused for every check.
        const generatedImageUrl = `${process.env.IMAGEKIT_URL_ENDPOINT}/ik-genimg-prompt-${encodedPrompt}/quickgpt/${Date.now()}.png?tr=w-512,h-512`

        // ImageKit prepares AI images in the background.
        // Check every 0.5 seconds, so the image is picked up as soon as it is ready.
        let ready = false
        const maxAttempts = 90
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const response = await axios.get(generatedImageUrl, {
                responseType: "arraybuffer",
                timeout: 30000,
                validateStatus: () => true
            })

            const contentType = response.headers['content-type'] || ''
            if (response.status === 200 && contentType.startsWith('image/')) {
                ready = true
                break
            }

            const text = Buffer.from(response.data).toString('utf8').slice(0, 200)
            console.log(`ImageKit attempt ${attempt}: status ${response.status}, ${contentType}, ${text}`)

            await sleep(500)
        }

        if (!ready) {
            return res.json({ success: false, message: "Image is taking too long to generate. Please try again." })
        }

        let imageUrl = generatedImageUrl

        if (!SKIP_IMAGE_REUPLOAD) {
            // Save to the Media Library straight from the URL (no base64 conversion on our server)
            const uploadResponse = await imagekit.upload({
                file: generatedImageUrl,
                fileName: `${Date.now()}.png`,
                folder: "quickgpt"
            })
            imageUrl = uploadResponse.url
        }

        const reply = {
            role: 'assistant',
            content: imageUrl,
            timestamp: Date.now(),
            isImage: true,
            isPublished
        }

        chat.messages.push(reply)

        // Save in parallel
        await Promise.all([
            chat.save(),
            User.updateOne({ _id: userId }, { $inc: { credits: -2 } }),
        ])

        // Send the response last, so Vercel doesn't stop the function before saving
        res.json({ success: true, reply })

    } catch (error) {
        console.log("Image error:", error.message)
        res.json({ success: false, message: error.message })
    }
}
