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
      // 1. УЛЬТРА-НАДЕЖНЫЙ ПОИСК КАНАЛА
      let query = channelUrl.trim();
      if (query.includes('@')) {
          query = '@' + query.split('@').pop()?.split('/')[0].split('?')[0];
      } else if (query.includes('youtube.com/')) {
          query = query.split('/').pop() || query;
      }
      
      const sRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=channel&maxResults=1&key=${ytKey}`).then(r => r.json());
      
      if (!sRes.items?.length) throw new Error('YouTube не видит этот канал. Проверьте @никнейм.');
      const chId = sRes.items[0].id.channelId;

      // 2. Сбор данных (Статистика + Хит + Конкуренты + Последние видео)
      const refinedNiche = `${niche} обзор 2025 trending`;
      const [stats, lvRes, outliers, top] = await Promise.all([
        fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${chId}&key=${ytKey}`).then(r => r.json()),
        fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${chId}&order=date&type=video&maxResults=5&key=${ytKey}`).then(r => r.json()),
        fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(refinedNiche)}&type=video&order=viewCount&maxResults=4&key=${ytKey}`).then(r => r.json()),
        fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${chId}&order=viewCount&type=video&maxResults=1&key=${ytKey}`).then(r => r.json())
      ]);

      const title = stats.items[0].snippet.title;
      const hitTitle = top.items?.[0]?.snippet?.title || "Не найдено";

      // Статистика для графика
      const vIds = lvRes.items.map((v:any) => v.id.videoId).join(',');
      const vStats = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${vIds}&key=${ytKey}`).then(r => r.json());
      const userVideos = vStats.items.map((v:any) => ({ title: v.snippet.title, views: parseInt(v.statistics.viewCount) })).reverse();

      // Запрос к ИИ (МАКСИМАЛЬНАЯ ПОДРОБНОСТЬ)
      const aiRes = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: `Ты элитный стратег. Канал: "${title}" (Ниша: ${niche}). ХИТ: "${hitTitle}". 
          ДАЙ НА РУССКОМ: 
          1. РАЗБОР ХИТА (почему взлетел + идея клона). 
          2. ОШИБКИ: 5 штук. 
          3. СОВЕТЫ: 10 штук. 
          4. МОНЕТИЗАЦИЯ: 3 способа.
          5. СЦЕНАРИЙ SHORTS.
          ОТВЕТЬ СТРОГО JSON: {"bestVideoAnalysis":"", "mistakes":[], "tips":[], "monetization":[], "scripts":[{"title":"","script":"","visuals":""}]}` }],
          response_format: { type: 'json_object' }
        })
      });
      const aiData: any = await aiRes.json();
      const parsed = JSON.parse(aiData.choices[0].message.content.match(/\{[\s\S]*\}/)![0]);

      return res.json({
        status: 'success',
        data: {
          channelData: { title, subscribers: parseInt(stats.items[0].statistics.subscriberCount), totalViews: parseInt(stats.items[0].statistics.viewCount), videoCount: parseInt(stats.items[0].statistics.videoCount) },
          userVideos,
          outlierVideos: outliers.items.map((v:any) => ({ title: v.snippet.title, thumbnail: v.snippet.thumbnails?.high?.url, url: `https://www.youtube.com/watch?v=${v.id.videoId}` })),
          aiAnalysis: parsed
        }
      });
    }

    if (task === 'explain') {
      const aiRes = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: `Тема: "${text}". Объясни на РУССКОМ подробно: почему это важно для алгоритмов 2025 и дай план исправления из 3 шагов.` }]
        })
      });
      const aiData: any = await aiRes.json();
      return res.json({ explanation: aiData.choices[0].message.content });
    }

    if (task === 'detailed') {
      const aiRes = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: `Сделай на РУССКОМ детальный план на 14 дней для канала "${channelTitle}". JSON: {"contentPlan":[{"day":1,"topic":""}]}` }],
          response_format: { type: 'json_object' }
        })
      });
      const aiData: any = await aiRes.json();
      return res.json(JSON.parse(aiData.choices[0].message.content.match(/\{[\s\S]*\}/)![0]));
    }
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default app;
