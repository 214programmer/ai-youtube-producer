import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

app.post('/api/index', async (req, res) => {
  const { task, channelUrl, niche, customGeminiKey, text, channelTitle } = req.body;
  const apiKey = (customGeminiKey || '').trim();
  const ytKey = (process.env.YOUTUBE_API_KEY || '').trim();

  try {
    // --- ЗАДАЧА 1: ГЛАВНЫЙ АНАЛИЗ ---
    if (task === 'analyze') {
      const query = channelUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@)?/, '');
      const sRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=channel&maxResults=1&key=${ytKey}`).then(r => r.json());
      if (!sRes.items?.length) throw new Error('Канал не найден');
      const chId = sRes.items[0].id.channelId;

      const [stats, top] = await Promise.all([
        fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${chId}&key=${ytKey}`).then(r => r.json()),
        fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${chId}&order=viewCount&type=video&maxResults=1&key=${ytKey}`).then(r => r.json())
      ]);

      const title = stats.items[0].snippet.title;
      const hit = top.items?.[0]?.snippet?.title || "Не найдено";

      const aiRes = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: `Ты продюсер. Канал: "${title}" (Ниша: ${niche}). ХИТ: "${hit}". Дай разбор хита, 5 ошибок и 5 советов на РУССКОМ. JSON: {"bestVideoAnalysis":"", "mistakes":[], "tips":[]}` }],
          response_format: { type: 'json_object' }
        })
      });
      const aiData: any = await aiRes.json();
      const parsed = JSON.parse(aiData.choices[0].message.content);

      return res.json({
        status: 'success',
        data: {
          channelData: { title, subscribers: parseInt(stats.items[0].statistics.subscriberCount), totalViews: parseInt(stats.items[0].statistics.viewCount) },
          aiAnalysis: parsed
        }
      });
    }

    // --- ЗАДАЧА 2: ПОДРОБНЕЕ ---
    if (task === 'explain') {
      const response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: `YouTube совет: "${text}". Объясни на РУССКОМ подробно: почему это важно и дай 3 шага по исправлению.` }]
        })
      });
      const data: any = await response.json();
      return res.json({ explanation: data.choices[0].message.content });
    }

    // --- ЗАДАЧА 3: ПЛАН НА 14 ДНЕЙ ---
    if (task === 'detailed') {
      const response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: `Сделай на РУССКОМ детальный план на 14 дней для канала "${channelTitle}" (ниша: ${niche}). JSON: {"contentPlan":[{"day":1,"topic":""}]}` }],
          response_format: { type: 'json_object' }
        })
      });
      const data: any = await response.json();
      return res.json(JSON.parse(data.choices[0].message.content));
    }

  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default app;
