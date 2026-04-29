import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/analyze', async (req, res) => {
  try {
    const { channelUrl, niche, customGeminiKey } = req.body;
    
    // В это поле на сайте нужно будет вставить ключ от GROQ (начинается с gsk_)
    const groqKey = (customGeminiKey || '').trim();

    if (groqKey === 'demo') {
      return res.json({
        status: 'success',
        data: {
          channelData: { title: "Демо Канал", subscribers: 100, totalViews: 1000, videoCount: 5 },
          userVideos: [], outlierVideos: [],
          aiAnalysis: { mistakes: ["Демо"], tips: ["Демо"], seoPack: {recommendedTags: [], titleTemplates: []}, contentPlan: [], scripts: [], competitors: [], collaborations: [], monetization: [] }
        }
      });
    }

    if (!groqKey.startsWith('gsk_')) {
      return res.status(400).json({ error: 'Пожалуйста, вставьте API ключ от Groq (начинается на gsk_)' });
    }

    const ytKey = (process.env.YOUTUBE_API_KEY || '').trim();
    if (!ytKey) return res.status(500).json({ error: 'YouTube ключ не найден в Vercel.' });

    // YouTube API
    const queryValue = channelUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@)?/, '');
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryValue)}&type=channel&maxResults=1&key=${ytKey}`;
    
    const sRes = await fetch(searchUrl);
    const sData: any = await sRes.json();
    if (!sData.items?.length) return res.status(404).json({ error: 'Канал не найден. Проверьте ссылку.' });
    const channelTitle = sData.items[0].snippet.title;

    // ЗАПРОС К GROQ (Самый быстрый бесплатный ИИ)
    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: "llama3-8b-8192", // Очень быстрая и умная модель
        messages: [{ 
            role: "user", 
            content: `Return ONLY JSON. Analyze YouTube channel "${channelTitle}" (niche: ${niche}). Give 3 mistakes and 3 tips. Format: {"mistakes": ["1","2","3"], "tips": ["1","2","3"], "seoPack": {"recommendedTags": [], "titleTemplates": []}, "contentPlan": [], "scripts": [], "competitors": [], "collaborations": [], "monetization": []}` 
        }],
        temperature: 0.5
      })
    });

    if (!aiResponse.ok) {
        const errData: any = await aiResponse.json();
        return res.status(400).json({ error: `Groq Ошибка: ${errData.error?.message || 'Сервер перегружен'}` });
    }

    const aiData: any = await aiResponse.json();
    const resultText = aiData.choices[0].message.content;
    const cleanJson = resultText.replace(/```json|```/g, '').trim();

    res.json({
      status: 'success',
      data: {
        channelData: { title: channelTitle, subscribers: 0, totalViews: 0, videoCount: 0 },
        userVideos: [], outlierVideos: [],
        aiAnalysis: JSON.parse(cleanJson)
      }
    });

  } catch (error: any) {
    res.status(500).json({ error: 'Внутренняя ошибка: ' + error.message });
  }
});

export default app;
