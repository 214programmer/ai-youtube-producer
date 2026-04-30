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
    if (task === 'analyze') {
      let handle = channelUrl.trim();
      if (handle.includes('youtube.com/')) {
          handle = handle.split('/').pop()?.split('?')[0] || handle;
      }
      if (!handle.startsWith('@') && !handle.includes('UC')) handle = '@' + handle;

      // 1. НАХОДИМ КАНАЛ
      const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(handle)}&type=channel&maxResults=1&key=${ytKey}`).then(r => r.json());
      if (!searchRes.items?.length) throw new Error('YouTube не нашел канал. Проверьте @никнейм.');
      const chId = searchRes.items[0].id.channelId;

      // 2. СБОР ДАННЫХ
      const refinedNiche = `${niche} обзор 2025 хайп`;
      const [stats, lvRes, outliers, top] = await Promise.all([
        fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${chId}&key=${ytKey}`).then(r => r.json()),
        fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${chId}&order=date&type=video&maxResults=5&key=${ytKey}`).then(r => r.json()),
        fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(refinedNiche)}&type=video&order=viewCount&maxResults=4&key=${ytKey}`).then(r => r.json()),
        fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${chId}&order=viewCount&type=video&maxResults=1&key=${ytKey}`).then(r => r.json())
      ]);

      const title = stats.items?.[0]?.snippet?.title || "Канал";
      const hitTitle = top.items?.[0]?.snippet?.title || "Хит не найден";

      // Безопасный сбор видео для графика
      const vIds = lvRes.items?.map((v:any) => v.id.videoId).join(',') || '';
      let userVideos = [];
      if (vIds) {
        const vStats = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${vIds}&key=${ytKey}`).then(r => r.json());
        userVideos = vStats.items?.map((v:any) => ({ title: v.snippet.title, views: parseInt(v.statistics.viewCount) })).reverse() || [];
      }

      // 3. ЗАПРОС К ИИ
      const aiResponse = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: `Ты элитный стратег. Канал: "${title}" (Ниша: ${niche}). ХИТ: "${hitTitle}". Дай на РУССКОМ: 1. ПОДРОБНЫЙ разбор хита (почему взлетел + идея-клона). 2. 5 жестких ошибок. 3. 5 советов. JSON: {"bestVideoAnalysis":"", "mistakes":[], "tips":[]}` }],
          response_format: { type: 'json_object' }
        })
      });
      const aiData: any = await aiResponse.json();
      const parsed = JSON.parse(aiData.choices[0].message.content.match(/\{[\s\S]*\}/)![0]);

      return res.json({
        status: 'success',
        data: {
          channelData: { title, subscribers: parseInt(stats.items[0].statistics.subscriberCount), totalViews: parseInt(stats.items[0].statistics.viewCount), videoCount: parseInt(stats.items[0].statistics.videoCount) },
          userVideos,
          outlierVideos: outliers.items?.map((v:any) => ({ title: v.snippet.title, thumbnail: v.snippet.thumbnails?.high?.url, url: `https://www.youtube.com/watch?v=${v.id.videoId}` })) || [],
          aiAnalysis: parsed
        }
      });
    }

    if (task === 'explain') {
      const resAI = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: `Тема: "${text}". Объясни на РУССКОМ подробно: почему это важно для охватов и дай пошаговую инструкцию.` }]
        })
      });
      const dataAI: any = await resAI.json();
      return res.json({ explanation: dataAI.choices[0].message.content });
    }

    if (task === 'detailed') {
      const resAI = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: `Сделай на РУССКОМ: 1. План на 14 дней. 2. 10 тегов. 3. 3 способа монетизации. JSON: {"contentPlan":[{"day":1,"topic":""}], "seoPack":{"recommendedTags":[]}, "monetization":[]}` }],
          response_format: { type: 'json_object' }
        })
      });
      const dataAI: any = await resAI.json();
      return res.json(JSON.parse(dataAI.choices[0].message.content.match(/\{[\s\S]*\}/)![0]));
    }
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default app;
