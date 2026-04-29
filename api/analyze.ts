import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/analyze', async (req, res) => {
  try {
    const { channelUrl, niche, customGeminiKey } = req.body;
    const apiKey = (customGeminiKey || '').trim();
    const ytKey = (process.env.YOUTUBE_API_KEY || '').trim();

    // 1. Поиск ID канала
    const queryValue = channelUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@)?/, '');
    const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryValue)}&type=channel&maxResults=1&key=${ytKey}`);
    const sData: any = await searchRes.json();
    if (!sData.items?.length) throw new Error('Канал не найден');
    const channelId = sData.items[0].id.channelId;

    // 2. Статистика канала и поиск реальных аутлаеров в нише
    const [statsRes, outliersRes] = await Promise.all([
      fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${ytKey}`),
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(niche + " trending")}&type=video&order=viewCount&maxResults=5&publishedAfter=2024-01-01T00:00:00Z&key=${ytKey}`)
    ]);

    const stData: any = await statsRes.json();
    const oData: any = await outliersRes.json();
    const channelStats = stData.items[0].statistics;
    const channelTitle = stData.items[0].snippet.title;

    // 3. ПОЛУЧЕНИЕ РЕАЛЬНЫХ ПРОСМОТРОВ ДЛЯ ГРАФИКА
    const videosSearchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=5&key=${ytKey}`);
    const vsData: any = await videosSearchRes.json();
    
    let userVideos = [];
    if (vsData.items?.length) {
        const videoIds = vsData.items.map((v: any) => v.id.videoId).join(',');
        const videoStatsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${ytKey}`);
        const vStData: any = await videoStatsRes.json();
        userVideos = vStData.items.map((v: any) => ({
            title: v.snippet.title,
            views: parseInt(v.statistics.viewCount)
        }));
    }

    const outlierVideos = oData.items?.map((v: any) => ({
        title: v.snippet.title,
        channelTitle: v.snippet.channelTitle,
        thumbnail: v.snippet.thumbnails?.high?.url
    })) || [];

    // 4. ЗАПРОС К ИИ (ПОДРОБНЫЙ ПЛАН НА 14 ДНЕЙ)
    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ 
          role: "user", 
          content: `Ты — топовый YouTube продюсер. Проанализируй канал "${channelTitle}" в нише "${niche}". 
          Статистика: ${JSON.stringify(channelStats)}. 
          ТВОЯ ЗАДАЧА:
          1. Ошибки и советы: Минимум по 5 пунктов с детальным разбором.
          2. КОНТЕНТ-ПЛАН НА 14 ДНЕЙ: Для каждого дня напиши подробную тему роликов, заголовок и краткую суть.
          3. Сценарии: 3 подробных сценария (Хук, Основная часть, Призыв).
          
          ОТВЕТЬ СТРОГО НА РУССКОМ В JSON:
          {"mistakes": ["ошибка + почему это плохо"], "tips": ["совет + как сделать"], "seoPack": {"recommendedTags": [], "titleTemplates": []}, "contentPlan": [{"day": 1, "topic": "ПОДРОБНОЕ ОПИСАНИЕ ТЕМЫ И ИДЕИ"}], "scripts": [{"title": "", "script": "ПОЛНЫЙ ТЕКСТ", "visuals": ""}], "competitors": [], "collaborations": [], "monetization": []}` 
        }],
        temperature: 0.5
      })
    });

    const aiData: any = await aiResponse.json();
    const resultText = aiData.choices[0].message.content;
    const parsed = JSON.parse(resultText.match(/\{[\s\S]*\}/)![0]);

    res.json({
      status: 'success',
      data: {
        channelData: { 
            title: channelTitle, 
            subscribers: parseInt(channelStats.subscriberCount), 
            totalViews: parseInt(channelStats.viewCount), 
            videoCount: parseInt(channelStats.videoCount) 
        },
        userVideos, 
        outlierVideos,
        aiAnalysis: parsed
      }
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
