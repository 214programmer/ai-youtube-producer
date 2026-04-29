import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/analyze', async (req, res) => {
  try {
    const { channelUrl, niche } = req.body;

    // Ключи берем из настроек Vercel
    const ytKey = (process.env.YOUTUBE_API_KEY || '').trim();
    const groqKey = (process.env.GROQ_API_KEY || '').trim();

    if (!ytKey || !groqKey) {
        throw new Error('Ключи API (YouTube или Groq) не настроены в Vercel.');
    }

    // 1. YouTube API: Поиск канала и подробной статистики
    const queryValue = channelUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@)?/, '');
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryValue)}&type=channel&maxResults=1&key=${ytKey}`;
    
    const sRes = await fetch(searchUrl);
    const sData: any = await sRes.json();
    if (!sData.items?.length) throw new Error('YouTube канал не найден. Проверьте ссылку.');
    
    const channelId = sData.items[0].id.channelId;

    // Запрашиваем статистику канала и реальных конкурентов в нише
    const [statsRes, outliersRes] = await Promise.all([
      fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${ytKey}`),
      fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(niche + " trending")}&type=video&order=viewCount&maxResults=5&key=${ytKey}`)
    ]);

    const stData: any = await statsRes.json();
    const oData: any = await outliersRes.json();
    
    const channelStats = stData.items[0].statistics;
    const channelTitle = stData.items[0].snippet.title;

    // Собираем данные конкурентов для фронтенда
    const outlierVideos = oData.items?.map((v: any) => ({
        title: v.snippet.title,
        channelTitle: v.snippet.channelTitle,
        thumbnail: v.snippet.thumbnails?.high?.url
    })) || [];

    // 2. ЗАПРОС К ИИ (ПОДРОБНЫЙ, НА РУССКОМ, СО ВСЕМИ ГАЙДАМИ)
    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ 
            role: "user", 
            content: `Ты — топовый YouTube продюсер. Проанализируй канал "${channelTitle}" в нише "${niche}". 
            Статистика: Подписчиков ${channelStats.subscriberCount}, Просмотров ${channelStats.viewCount}.
            
            НАПИШИ МАКСИМАЛЬНО ПОДРОБНО НА РУССКОМ ЯЗЫКЕ:
            1. 5 критических ошибок и 10 советов по росту.
            2. SEO: 10 лучших тегов и 5 шаблонов заголовков.
            3. КОНТЕНТ-ПЛАН НА 14 ДНЕЙ: Распиши подробно тему и идею для каждого из 14 дней.
            4. СЦЕНАРИИ: 3 полных сценария (Хук, Основная часть, Призыв к действию).
            5. КОНКУРЕНТЫ: 5 фишек, которые можно у них забрать.
            6. КОЛЛАБОРАЦИИ: 5 конкретных идей для совместных видео.
            7. МОНЕТИЗАЦИЯ: 5 детальных способов как заработать на этом канале.
            
            ВЕРНИ ТОЛЬКО ЧИСТЫЙ JSON: 
            {"mistakes":[], "tips":[], "seoPack":{"recommendedTags":[], "titleTemplates":[]}, "contentPlan":[{"day":1,"topic":""}], "scripts":[{"title":"","script":"","visuals":""}], "competitors":[], "collaborations":[], "monetization":[]}
            Заполняй массивы полностью, пиши много текста.` 
        }],
        temperature: 0.5,
        response_format: { type: 'json_object' }
      })
    });

    const aiData: any = await aiResponse.json();
    const resultText = aiData.choices[0].message.content;
    
    // Безопасно вырезаем JSON
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("ИИ не смог подготовить данные. Попробуйте еще раз.");
    const parsed = JSON.parse(jsonMatch[0]);

    // Отправляем всё на сайт
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
        outlierVideos: outlierVideos,
        aiAnalysis: parsed
      }
    });

  } catch (error: any) {
    console.error("SERVER ERROR:", error.message);
    res.status(500).json({ error: error.message });
  }
});

export default app;
