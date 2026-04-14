import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import rateLimit from "express-rate-limit";
import fs from "fs-extra";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ CORS: Allow only frontend origin
app.use(cors({
    origin: ["http://localhost:5173"], // Change in prod
}));

// ✅ Rate limiting middleware
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP
    message: { error: "Too many requests. Please try again later." },
});
app.use(limiter);

// ✅ Parse JSON request bodies
app.use(express.json());

// ✅ Main chat route
app.post("/api/chat", async (req, res) => {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: "Invalid messages format" });
    }

    try {
        const response = await fetch("https://api.together.xyz/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`,
            },
            body: JSON.stringify({
                model: "deepseek-ai/DeepSeek-V3",
                messages: [
                    { role: "system", content: "You are Clara, a helpful AI tutor." },
                    ...messages,
                ],
                max_tokens: 300,
                temperature: 0.7,
            }),
        });

        const data = await response.json();

        // ✅ Log successful exchange
        const logEntry = {
            time: new Date().toISOString(),
            ip: req.ip,
            userMessage: messages[messages.length - 1]?.content || "N/A",
            aiResponse: data.choices?.[0]?.message?.content || "No response",
        };

        await fs.appendFile("logs/chat.log", JSON.stringify(logEntry) + "\n");

        return res.json(data);
    } catch (error) {
        console.error("Server error:", error);

        // ✅ Log error separately
        const errorLog = {
            time: new Date().toISOString(),
            ip: req.ip,
            error: error.message,
        };

        await fs.appendFile("logs/chat.log", JSON.stringify(errorLog) + "\n");

        return res.status(500).json({ error: "Something went wrong on the server." });
    }
});

// ✅ Start server
app.listen(PORT, () => {
    console.log(`Clara backend running on http://localhost:${PORT}`);
});
