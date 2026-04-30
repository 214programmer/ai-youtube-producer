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
      // 1. УЛЬТРА-ПАРСЕР: Извлекаем чистое имя/айди
      let raw = channelUrl.trim();
      let handle = raw;
      if (raw.includes('youtube.com/')) {
          handle = raw.split('/').pop()?.split('?')[0] || raw;
      }
      if (!handle.startsWith('@') && !handle.includes('UC')) handle = '@' + handle;

      // ПЕРВАЯ ПОПЫТКА: Официальный Handle (forHandle)
      let channelRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${encodeURIComponent(handle)}&key=${ytKey}`).then(r => r.json());
      
      let channel;
      if (channelRes.items?.length) {
          channel = channelRes.items[0];
      } else {
          // ВТОРАЯ ПОПЫТКА: Прямой поиск канала
          const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(handle)}&type=channel&maxResults=1&key=${ytKey}`).then(r => r.json());
          if (searchRes.items?.length) {
              const chId = searchRes.items[0].id.channelId;
              const statsRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${chId}&key=${ytKey}`).then(r => r.json());
              channel = statsRes.items[0];
          } else {
              throw new Error('Канал не найден. Пожалуйста, введите @никнейм из ссылки канала.');
          }
      }

      const chId = channel.id;
      const title = channel.snippet.title;

      // 2. СБОР «МЯСА»: Хит + Конкуренты + График
      const nicheSearch = `${niche} обзор 2025 хайп`;
      const [lvRes, outliers, top] = await Promise.all([
        fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${chId}&order=date&type=video&maxResults=5&key=${ytKey}`).then(r => r.json()),
        fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(nicheSearch)}&type=video&order=viewCount&maxResults=4&key=${ytKey}`).then(r => r.json()),
        fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${chId}&order=viewCount&type=video&maxResults=1&key=${ytKey}`).then(r => r.json())
      ]);

      const hitTitle = top.items?.[0]?.snippet?.title || "Не найдено";
      const vIds = lvRes.items?.map((v:any) => v.id.videoId).join(',') || '';
      let userVideos = [];
      if (vIds) {
        const vStats = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${vIds}&key=${ytKey}`).then(r => r.json());
        userVideos = vStats.items?.map((v:any) => ({ title: v.snippet.title, views: parseInt(v.statistics.viewCount) })).reverse() || [];
      }

      // 3. ГЛУБОКИЙ ИИ АНАЛИЗ (PROMPT V4)
      const aiResponse = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: `Ты элитный стратег. Канал: "${title}" (Ниша: ${niche}). ХИТ: "${hitTitle}". 
          ДАЙ НА РУССКОМ: 1. ПОДРОБНЫЙ разбор хита (почему взлетел + идею-клона). 2. 5 жестких ошибок. 3. 5 советов. JSON: {"bestVideoAnalysis":"", "mistakes":[], "tips":[]}` }],
          response_format: { type: 'json_object' }
        })
      });
      const aiData: any = await aiResponse.json();
      const parsed = JSON.parse(aiData.choices[0].message.content.match(/\{[\s\S]*\}/)![0]);

      return res.json({
        status: 'success',
        data: {
          channelData: { title, subscribers: parseInt(channel.statistics.subscriberCount), totalViews: parseInt(channel.statistics.viewCount), videoCount: parseInt(channel.statistics.videoCount) },
          userVideos,
          outlierVideos: outliers.items.map((v:any) => ({ title: v.snippet.title, thumbnail: v.snippet.thumbnails?.high?.url, url: `https://www.youtube.com/watch?v=${v.id.videoId}` })),
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
          messages: [{ role: "user", content: `Тема: "${text}". Объясни на РУССКОМ максимально подробно, почему это важно для охватов и дай план исправления.` }]
        })
      });
      const data: any = await resAI.json();
      return res.json({ explanation: data.choices[0].message.content });
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
      const data: any = await resAI.json();
      return res.json(JSON.parse(data.choices[0].message.content.match(/\{[\s\S]*\}/)![0]));
    }
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default app;
