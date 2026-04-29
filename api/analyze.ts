import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/analyze', async (req, res) => {
  try {
    const { channelUrl, niche, customGeminiKey } = req.body;
    const apiKey = (customGeminiKey || '').trim();

    if (apiKey === 'demo') {
      return res.json({ status: 'success', data: { /* тут демо данные */ } });
    }

    const ytKey = (process.env.YOUTUBE_API_KEY || '').trim();
    const queryValue = channelUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@)?/, '');
    
    // 1. Ищем ID канала и его базовые данные
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryValue)}&type=channel&maxResults=1&key=${ytKey}`;
    const sRes = await fetch(searchUrl);
    const sData: any = await sRes.json();
    if (!sData.items?.length) return res.status(404).json({ error: 'Канал не найден.' });
    
    const channelId = sData.items[0].id.channelId;

    // 2. Получаем ПОДРОБНУЮ статистику (подписчики, просмотры)
    const statsRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${ytKey}`);
    const statsData: any = await statsRes.json();
    const channelStats = statsData.items[0].statistics;
    const channelTitle = statsData.items[0].snippet.title;

    // 3. Получаем последние видео для графика
    const videosRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=5&key=${ytKey}`);
    const videosData: any = await videosRes.json();
    
    // Собираем просмотры для этих видео (нужен отдельный запрос за статистикой видео)
    let userVideos = [];
    if (videosData.items?.length) {
        const videoIds = videosData.items.map((v: any) => v.id.videoId).join(',');
        const vStatsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${ytKey}`);
        const vStatsData: any = await vStatsRes.json();
        userVideos = vStatsData.items.map((v: any) => ({
            title: v.snippet.title,
            views: parseInt(v.statistics.viewCount || '0')
        }));
    }

    // 4. ЗАПРОС К ИИ (Приказываем писать на РУССКОМ)
    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ 
            role: "user", 
            content: `Ты профессиональный YouTube-продюсер. Проанализируй канал "${channelTitle}" в нише "${niche}". 
            Ответь СТРОГО на РУССКОМ ЯЗЫКЕ. Верни только JSON.
            Формат: {"mistakes": ["ошибка1", "ошибка2"], "tips": ["совет1", "совет2"], "seoPack": {"recommendedTags": ["#тег"], "titleTemplates": ["заголовок"]}, "contentPlan": [{"day": 1, "topic": "тема"}], "scripts": [{"title": "название", "script": "текст", "visuals": "описание"}], "competitors": ["имя1"], "collaborations": ["идея1"], "monetization": ["способ1"]}` 
        }],
        response_format: { type: 'json_object' }
      })
    });

    const aiData: any = await aiResponse.json();
    const resultText = aiData.choices[0].message.content;
    const parsed = JSON.parse(resultText.match(/\{[\s\S]*\}/)![0]);

    // ОТПРАВЛЯЕМ РЕАЛЬНЫЕ ЦИФРЫ НА САЙТ
    res.json({
      status: 'success',
      data: {
        channelData: { 
            title: channelTitle, 
            subscribers: parseInt(channelStats.subscriberCount), 
            totalViews: parseInt(channelStats.viewCount), 
            videoCount: parseInt(channelStats.videoCount) 
        },
        userVideos: userVideos, // Теперь тут реальные видео для графика!
        outlierVideos: [{ title: "Топ видео в нише", views: 1000000, channelTitle: "Конкурент" }],
        aiAnalysis: parsed
      }
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
