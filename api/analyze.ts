import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/analyze', async (req, res) => {
  try {
    const { channelUrl, niche, customGeminiKey } = req.body;
    
    // Возвращаем получение ключа ИИ из поля на сайте
    const apiKey = (customGeminiKey || '').trim(); 

    if (!apiKey) {
      return res.status(400).json({ error: 'Пожалуйста, вставьте ваш API ключ в поле ввода.' });
    }

    // Ключ YouTube всё еще должен быть в Vercel (Key: YOUTUBE_API_KEY)
    const ytKey = (process.env.YOUTUBE_API_KEY || '').trim();
    if (!ytKey) {
        return res.status(500).json({ error: 'Критическая ошибка: Добавьте YOUTUBE_API_KEY в настройки Vercel!' });
    }

    // 1. Поиск канала и получение ID
    const queryValue = channelUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@)?/, '');
    const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryValue)}&type=channel&maxResults=1&key=${ytKey}`);
    const sData: any = await searchRes.json();
    if (!sData.items?.length) throw new Error('Канал не найден. Проверьте ссылку.');
    
    const channelId = sData.items[0].id.channelId;

    // 2. Сбор РЕАЛЬНОЙ статистики и конкурентов
    const [statsRes, outliersRes] = await Promise.all([
      fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${ytKey}`),
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(niche + " trending")}&type=video&order=viewCount&maxResults=5&key=${ytKey}`)
    ]);

    const stData: any = await statsRes.json();
    const oData: any = await outliersRes.json();
    const channelStats = stData.items[0].statistics;
    const channelTitle = stData.items[0].snippet.title;

    const outlierVideos = oData.items?.map((v: any) => ({
        title: v.snippet.title,
        channelTitle: v.snippet.channelTitle,
        thumbnail: v.snippet.thumbnails?.high?.url
    })) || [];

    // 3. ЗАПРОС К ИИ (ПОДРОБНЫЙ, НА РУССКОМ)
    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ 
            role: "user", 
            content: `Ты — топовый YouTube продюсер. Проанализируй канал "${channelTitle}" в нише "${niche}". 
            Статистика: Подписчиков ${channelStats.subscriberCount}, Просмотров ${channelStats.viewCount}.
            
            НАПИШИ ОЧЕНЬ МНОГО ТЕКСТА НА РУССКОМ ЯЗЫКЕ:
            1. 5 критических ошибок (подробно).
            2. 10 советов по росту канала.
            3. SEO: 10 лучших тегов и 5 виральных заголовков.
            4. КОНТЕНТ-ПЛАН НА 14 ДНЕЙ: Распиши детально каждый день (тема, идея, почему это зайдет).
            5. СЦЕНАРИИ: 3 детальных сценария (Хук, Основная часть, Призыв).
            6. КОНКУРЕНТЫ: 5 фишек, которые нужно внедрить прямо сейчас.
            7. КОЛЛАБОРАЦИИ: 5 идей для совместных видео.
            8. МОНЕТИЗАЦИЯ: 5 подробных способов заработка на этом канале.
            
            ОТВЕТЬ СТРОГО В JSON: 
            {"mistakes":[], "tips":[], "seoPack":{"recommendedTags":[], "titleTemplates":[]}, "contentPlan":[{"day":1,"topic":""}], "scripts":[{"title":"","script":"","visuals":""}], "competitors":[], "collaborations":[], "monetization":[]}
            Пиши развернуто в каждом пункте.` 
        }],
        temperature: 0.5,
        response_format: { type: 'json_object' }
      })
    });

    const aiData: any = await aiResponse.json();
    const resultText = aiData.choices[0].message.content;
    const parsed = JSON.parse(resultText.match(/\{[\s\S]*\}/)![0]);

    // Возвращаем всё на фронтенд
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
        outlierVideos,
        aiAnalysis: parsed
      }
    });

  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
