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

    // 2. Сбор статистики, конкурентов и САМОГО ПОПУЛЯРНОГО видео пользователя
    const [statsRes, outliersRes, topVideoRes] = await Promise.all([
      fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${ytKey}`),
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(niche + " хайп обзор")}&type=video&order=viewCount&maxResults=5&key=${ytKey}`),
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=viewCount&type=video&maxResults=1&key=${ytKey}`)
    ]);

    const stData: any = await statsRes.json();
    const oData: any = await outliersRes.json();
    const tData: any = await topVideoRes.json();

    const channelStats = stData.items[0].statistics;
    const channelTitle = stData.items[0].snippet.title;
    
    // Твое самое популярное видео
    const bestVideo = tData.items?.[0] ? {
        title: tData.items[0].snippet.title,
        id: tData.items[0].id.videoId
    } : null;

    // Конкуренты (теперь со ССЫЛКАМИ)
    const outlierVideos = oData.items?.map((v: any) => ({
        title: v.snippet.title,
        channelTitle: v.snippet.channelTitle,
        thumbnail: v.snippet.thumbnails?.high?.url,
        url: `https://www.youtube.com/watch?v=${v.id.videoId}` // ТЕПЕРЬ МОЖНО ПЕРЕЙТИ
    })) || [];

    // 3. ЗАПРОС К ИИ (ЖЕСТКАЯ АНАЛИТИКА)
    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ 
            role: "user", 
            content: `Ты — YouTube-стратег топ-уровня. Анализ канала "${channelTitle}" (ниша: ${niche}).
            
            ТВОЕ САМОЕ ПОПУЛЯРНОЕ ВИДЕО: "${bestVideo?.title || 'Нет данных'}".
            
            ЗАДАЧА НА РУССКОМ ЯЗЫКЕ:
            1. АНАЛИЗ ХИТА: Объясни, почему видео "${bestVideo?.title}" стало самым популярным. Какие триггеры там сработали?
            2. ИДЕЯ-КЛОН: Предложи новую идею видео на основе этого хита, которая наберет еще больше. Объясни почему.
            3. КОНТЕНТ-ПЛАН НА 14 ДНЕЙ: Никакой воды! Каждый день: Заголовок + Сценарий (Хук/Суть/Финал) + Психология клика.
            4. МОНЕТИЗАЦИЯ: 3 способа заработать именно в нише ${niche} прямо сейчас.

            ВЕРНИ СТРОГО JSON: 
            {
              "mistakes": [], 
              "tips": [], 
              "bestVideoAnalysis": "почему залетело + идея клона + почему она сработает",
              "seoPack": {"recommendedTags":[], "titleTemplates":[]}, 
              "contentPlan": [{"day":1, "topic":"ДЕТАЛЬНЫЙ ПЛАН: Заголовок, Сценарий, Психология"}], 
              "scripts": [], 
              "competitors": [], 
              "collaborations": [], 
              "monetization": []
            }` 
        }],
        temperature: 0.6,
        response_format: { type: 'json_object' }
      })
    });

    const aiData: any = await aiResponse.json();
    const resultText = aiData.choices[0].message.content;
    const parsed = JSON.parse(resultText.match(/\{[\s\S]*\}/)![0]);

    // Если ИИ засунул анализ хита в текст, выведем его в первую карточку советов
    if (parsed.bestVideoAnalysis) {
        parsed.tips.unshift("🔥 АНАЛИЗ ВАШЕГО ХИТА: " + parsed.bestVideoAnalysis);
    }

    res.json({
      status: 'success',
      data: {
        channelData: { 
            title: channelTitle, 
            subscribers: parseInt(channelStats.subscriberCount), 
            totalViews: parseInt(channelStats.viewCount), 
            videoCount: parseInt(channelStats.videoCount) 
        },
        userVideos: [], 
        outlierVideos, // Теперь со ссылками
        aiAnalysis: parsed
      }
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
