import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/generate-thumbnail-prompt', async (req, res) => {
    try {
        const { title, visuals, customGeminiKey } = req.body;
        const apiKey = (customGeminiKey || '').trim();

        const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: `Create a professional Midjourney v6 prompt for a YouTube thumbnail. Video Title: "${title}". Visual Scene: "${visuals}". Output ONLY the English prompt text.` }]
            })
        });

        const aiData: any = await aiResponse.json();
        const prompt = aiData.choices[0].message.content;
        res.json({ imagePrompt: prompt });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default app;
