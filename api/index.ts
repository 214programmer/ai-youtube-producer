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
    // --- ЗАДАЧА 1: ГЛАВНЫЙ АНАЛИЗ (Статистика + График + Конкуренты + Аудит) ---
    if (task === 'analyze') {
      const query = channelUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@)?/, '');
      const sRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=channel&maxResults=1&key=${ytKey}`).then(r => r.json());
      if (!sRes.items?.length) throw new Error('Канал не найден');
      const chId = sRes.items[0].id.channelId;

      // Сбор статистики, видео для графика и конкурентов
      const [stats, lvRes, outliers] = await Promise.all([
        fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${chId}&key=${ytKey}`).then(r => r.json()),
        fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${chId}&order=date&type=video&maxResults=5&key=${ytKey}`).then(r => r.json()),
        fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(niche + " обзор 2025")}&type=video&order=viewCount&maxResults=4&key=${ytKey}`).then(r => r.json())
      ]);

      const title = stats.items[0].snippet.title;

      // Данные для графика (реальные просмотры)
      const vIds = lvRes.items.map((v:any) => v.id.videoId).join(',');
      const vStats = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${vIds}&key=${ytKey}`).then(r => r.json());
      const userVideos = vStats.items.map((v:any) => ({ title: v.snippet.title, views: parseInt(v.statistics.viewCount) })).reverse();

      // Конкуренты со ссылками
      const outlierVideos = outliers.items.map((v:any) => ({
        title: v.snippet.title,
        thumbnail: v.snippet.thumbnails?.high?.url,
        url: `https://www.youtube.com/watch?v=${v.id.videoId}`,
        channelTitle: v.snippet.channelTitle
      }));

      const aiRes = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: `Ты продюсер. Канал: "${title}" (Ниша: ${niche}). Дай 5 ошибок и 5 советов на РУССКОМ. JSON: {"mistakes":[], "tips":[]}` }],
          response_format: { type: 'json_object' }
        })
      });
      const aiData: any = await aiResponse.json();
      const parsed = JSON.parse(aiData.choices[0].message.content);

      return res.json({
        status: 'success',
        data: {
          channelData: { title, subscribers: parseInt(stats.items[0].statistics.subscriberCount), totalViews: parseInt(stats.items[0].statistics.viewCount) },
          userVideos, outlierVideos, aiAnalysis: parsed
        }
      });
    }

    // --- ЗАДАЧА 2: ПОДРОБНЕЕ (Для всего) ---
    if (task === 'explain') {
      const response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: `Тема: "${text}". Объясни на РУССКОМ максимально подробно, почему это важно и как это реализовать пошагово.` }]
        })
      });
      const data: any = await response.json();
      return res.json({ explanation: data.choices[0].message.content });
    }

    // --- ЗАДАЧА 3: ГЛУБОКИЙ ОТЧЕТ (14 дней + SEO + Монетизация) ---
    if (task === 'detailed') {
      const response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: `Сделай на РУССКОМ: 1. План на 14 дней. 2. 10 тегов. 3. 3 способа монетизации. 4. 3 идеи коллабораций. JSON: {"contentPlan":[{"day":1,"topic":""}], "seoPack":{"recommendedTags":[]}, "monetization":[], "collaborations":[]}` }],
          response_format: { type: 'json_object' }
        })
      });
      const data: any = await response.json();
      return res.json(JSON.parse(data.choices[0].message.content));
    }

  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default app;
