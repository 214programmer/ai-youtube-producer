import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/detailed', async (req, res) => {
  try {
    const { channelTitle, niche, apiKey, task } = req.body;

    let prompt = "";
    
    if (task === 'plan') {
        prompt = `Создай контент-план на 14 дней для YouTube канала "${channelTitle}" (ниша: ${niche}) на РУССКОМ. Каждый день: Заголовок и Суть видео. JSON: {"contentPlan":[{"day":1,"topic":"Заголовок: Описание"}]}`;
    } else if (task === 'business') {
        prompt = `Составь бизнес-стратегию для YouTube канала "${channelTitle}" (ниша: ${niche}) на РУССКОМ. Нужно: 10 тегов, 5 шаблонов заголовков, 3 способа монетизации, 3 идеи коллабораций. JSON: {"seoPack":{"recommendedTags":["#тег1"], "titleTemplates":["шаблон1"]}, "monetization":["способ1"], "collaborations":["коллаб1"]}`;
    }

    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.6,
        response_format: { type: 'json_object' }
      })
    });

    const aiData: any = await aiResponse.json();
    const parsedData = JSON.parse(aiData.choices[0].message.content.match(/\{[\s\S]*\}/)![0]);
    res.json(parsedData);

  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default app;
