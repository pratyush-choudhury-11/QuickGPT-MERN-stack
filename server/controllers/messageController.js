import axios from "axios"
import Chat from "../models/Chat.js"
import User from "../models/User.js"
import imagekit from "../configs/imageKit.js"
import openai from '../configs/openai.js'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Text-based AI Chat Message Controller
export const textMessageController = async (req, res) => {
    try {
        const userId = req.user._id

        // Check credits
        if(req.user.credits < 1){
            return res.json({success: false, message: "You don't have enough credits to use this feature"})
        }

        const {chatId, prompt} = req.body

        const chat = await Chat.findOne({userId, _id: chatId})
        if(!chat){
            return res.json({success: false, message: "Chat not found"})
        }

        chat.messages.push({role: "user", content: prompt, timestamp: Date.now(), isImage: false})

        const { choices } = await openai.chat.completions.create({
            model: "gemini-flash-latest",
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
        });

        const reply = {...choices[0].message, timestamp: Date.now(), isImage: false}

        chat.messages.push(reply)
        await chat.save()
        await User.updateOne({_id: userId}, {$inc: {credits: -1}})

        // Send the response last, so Vercel doesn't stop the function before saving
        res.json({success: true, reply})

    } catch (error) {
        console.log("Text error:", error.message)
        res.json({success: false, message: error.message})
    }
}

// Image Generation Message Controller
export const imageMessageController = async (req, res) => {
    try {
        const userId = req.user._id;

        // Check credits
        if(req.user.credits < 2){
            return res.json({success: false, message: "You don't have enough credits to use this feature"})
        }

        const {prompt, chatId, isPublished} = req.body

        // Find chat
        const chat = await Chat.findOne({userId, _id: chatId})
        if(!chat){
            return res.json({success: false, message: "Chat not found"})
        }

        // Push user message
        chat.messages.push({
            role: "user",
            content: prompt,
            timestamp: Date.now(),
            isImage: false
        });

        // Encode the prompt
        const encodedPrompt = encodeURIComponent(prompt)

        // ImageKit AI generation URL (smaller image = faster). The same URL is reused for every check.
        const generatedImageUrl = `${process.env.IMAGEKIT_URL_ENDPOINT}/ik-genimg-prompt-${encodedPrompt}/quickgpt/${Date.now()}.png?tr=w-512,h-512`;

        // ImageKit prepares AI images in the background.
        // Check every 1 second, so the image is picked up as soon as it is ready.
        
        let ready = false
        const maxAttempts = 45
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

            await sleep(1000)
        }

        if (!ready) {
            return res.json({success: false, message: "Image is taking too long to generate. Please try again."})
        }

        // Save to the Media Library straight from the URL (no base64 conversion on our server)
        const uploadResponse = await imagekit.upload({
            file: generatedImageUrl,
            fileName: `${Date.now()}.png`,
            folder: "quickgpt"
        })

        const reply = {
            role: 'assistant',
            content: uploadResponse.url,
            timestamp: Date.now(),
            isImage: true,
            isPublished
        }

        chat.messages.push(reply)
        await chat.save()
        await User.updateOne({_id: userId}, {$inc: {credits: -2}})

        // Send the response last, so Vercel doesn't stop the function before saving
        res.json({success: true, reply})

    } catch (error) {
        console.log("Image error:", error.message)
        res.json({ success: false, message: error.message });
    }
}
