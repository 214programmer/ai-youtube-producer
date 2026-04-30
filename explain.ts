import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/explain', async (req, res) => {
  try {
    const { text, apiKey } = req.body;
    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: `YouTube совет: "${text}". Подробно объясни на РУССКОМ, почему это важно, какие алгоритмы на это влияют и дай 3 пошаговых инструкции, как это исправить прямо сейчас.` }]
      })
    });
    const data: any = await aiResponse.json();
    res.json({ explanation: data.choices[0].message.content });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
export default app;
