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
    const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryValue)}&type=channel&maxResults=1&key=${ytKey}`).then(r => r.json());
    if (!searchRes.items?.length) throw new Error('Канал не найден');
    const channelId = searchRes.items[0].id.channelId;

    // 2. Сбор данных (Статистика + Последние видео для графика + Аутлаеры)
    const [statsData, lvData, outliersData] = await Promise.all([
      fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${ytKey}`).then(r => r.json()),
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=5&key=${ytKey}`).then(r => r.json()),
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(niche + " обзор 2024")}&type=video&order=viewCount&maxResults=5&key=${ytKey}`).then(r => r.json())
    ]);

    const channelStats = statsData.items[0].statistics;
    const channelTitle = statsData.items[0].snippet.title;

    // ГРАФИК: Получаем РЕАЛЬНЫЕ просмотры для последних 5 видео
    let userVideos = [];
    if (lvData.items?.length) {
        const videoIds = lvData.items.map((v: any) => v.id.videoId).join(',');
        const vStats = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${ytKey}`).then(r => r.json());
        userVideos = vStats.items.map((v: any) => ({
            title: v.snippet.title,
            views: parseInt(v.statistics.viewCount)
        })).reverse();
    }

    // АУТЛАЕРЫ: Добавляем ссылки
    const outlierVideos = outliersData.items?.map((v: any) => ({
        title: v.snippet.title,
        channelTitle: v.snippet.channelTitle,
        thumbnail: v.snippet.thumbnails?.high?.url,
        url: `https://www.youtube.com/watch?v=${v.id.videoId}`
    })) || [];

    // 3. ЗАПРОС К ИИ
    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ 
            role: "user", 
            content: `Ты продюсер канала "${channelTitle}" в нише "${niche}". 
            ЗАПРЕЩЕНО использовать шаблоны вроде "%Название%". Пиши ГОТОВЫЕ, КЛИКБЕЙТНЫЕ заголовки.
            
            1. Проанализируй последние видео: ${userVideos.map(v => v.title).join(', ')}.
            2. Дай 5 жестких ошибок и 10 советов.
            3. Составь ПЛАН НА 14 ДНЕЙ: на каждый день дай ГОТОВЫЙ заголовок и краткий сценарий (Хук/Суть).
            4. SEO: Дай 10 тегов и 5 ГОТОВЫХ заголовков.
            5. Монетизация: 3 способа.

            ВЕРНИ JSON: {"mistakes":[], "tips":[], "seoPack":{"recommendedTags":[], "titleTemplates":[]}, "contentPlan":[{"day":1,"topic":""}], "scripts":[], "competitors":[], "collaborations":[], "monetization":[]}` 
        }],
        response_format: { type: 'json_object' }
      })
    });

    const aiData: any = await aiResponse.json();
    const parsed = JSON.parse(aiData.choices[0].message.content.match(/\{[\s\S]*\}/)![0]);

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
