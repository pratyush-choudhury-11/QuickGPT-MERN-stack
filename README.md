# 🚀 QuickGPT – MERN Stack AI Assistant

A full-stack AI chat application built using the MERN stack.  
Supports text + image generation, chat management, credits system, cloud uploads, and theme switching.

---

## 🔗 Live Demo  
👉 **https://quick-gpt-mern-stack.vercel.app/**

---

## 📌 Tech Stack
![MongoDB](https://img.shields.io/badge/MongoDB-4ea94b?style=for-the-badge&logo=mongodb&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![React](https://img.shields.io/badge/React.js-61dafb?style=for-the-badge&logo=react&logoColor=black)
![Node](https://img.shields.io/badge/Node.js-3c873a?style=for-the-badge&logo=node.js&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6441A5?style=for-the-badge&logo=vite&logoColor=yellow)
![ImageKit](https://img.shields.io/badge/ImageKit-0C9EDF?style=for-the-badge)
![JWT](https://img.shields.io/badge/JWT-black?style=for-the-badge&logo=jsonwebtokens)
![Axios](https://img.shields.io/badge/Axios-5A29E3?style=for-the-badge)

---

## ⚡ Features
- AI text/chat generation  
- AI image generation  
- Secure authentication (JWT)  
- Multi-chat system with history  
- Credit-based usage system  
- Light/Dark theme switching  
- Image upload storage (ImageKit)  
- Responsive UI  
- Clean dashboard layout  
- Community images section  

---

## 📂 Project Structure

```
/client     → React frontend (Vite)
/server     → Express backend
```

---


---

## 🛠️ Run Locally

### 1. Clone repo
```
git clone <your_repo_url>
cd your_repo
```

### 2. Install dependencies

#### Client
```
cd client
npm install
```

#### Server
```
cd server
npm install
```

### 3. Environment Variables

#### Server `.env`
```
MONGO_URI=
JWT_SECRET=
IMAGEKIT_PUBLIC_KEY=
IMAGEKIT_PRIVATE_KEY=
IMAGEKIT_URL_ENDPOINT=
AI_API_KEY=
```

#### Client `.env`
```
VITE_API_URL=http://localhost:3000
```

### 4. Start project

#### Server
```
npm run dev
```

#### Client
```
npm run dev
```

---

## 🚀 Deployment
- Client: Vercel  
- Backend: Works on Render / Cyclic / Railway / Vercel serverless

---

## 📜 License  
MIT License
