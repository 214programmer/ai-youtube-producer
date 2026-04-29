import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/analyze', async (req, res) => {
  try {
    const { channelUrl, niche, customGeminiKey } = req.body;
    const hfToken = (customGeminiKey || '').trim();

    // 1. ДЕМО-РЕЖИМ
    if (hfToken === 'demo') {
      return res.json({
        status: 'success',
        data: {
          channelData: { title: "Демо Канал", subscribers: 100, totalViews: 1000, videoCount: 5 },
          userVideos: [], outlierVideos: [],
          aiAnalysis: { mistakes: ["Демо"], tips: ["Демо"], seoPack: {recommendedTags: [], titleTemplates: []}, contentPlan: [], scripts: [], competitors: [], collaborations: [], monetization: [] }
        }
      });
    }

    if (!hfToken.startsWith('hf_')) return res.status(400).json({ error: 'Нужен токен Hugging Face (hf_...)' });

    // 2. YouTube API
    const ytKey = (process.env.YOUTUBE_API_KEY || '').trim();
    if (!ytKey) return res.status(500).json({ error: 'YouTube API ключ не найден в настройках Vercel.' });

    const queryValue = channelUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@)?/, '');
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryValue)}&type=channel&maxResults=1&key=${ytKey}`;
    
    const sRes = await fetch(searchUrl);
    const sData: any = await sRes.json();
    if (!sData.items?.length) return res.status(404).json({ error: 'Канал не найден. Проверьте ссылку.' });
    const channelTitle = sData.items[0].snippet.title;

    // 3. ЗАПРОС К ИИ (Используем открытую модель Qwen)
    const aiResponse = await fetch('https://api-inference.huggingface.co/models/Qwen/Qwen2.5-1.5B-Instruct/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${hfToken}` 
      },
      body: JSON.stringify({
        model: "Qwen/Qwen2.5-1.5B-Instruct",
        messages: [{ role: "user", content: `Return JSON only. Analyze YouTube channel "${channelTitle}" (niche: ${niche}). Give 3 mistakes and 3 tips. Format: {"mistakes": [], "tips": [], "seoPack": {"recommendedTags": [], "titleTemplates": []}, "contentPlan": [], "scripts": [], "competitors": [], "collaborations": [], "monetization": []}` }],
        max_tokens: 800
      })
    });

    if (!aiResponse.ok) {
        const errData: any = await aiResponse.json();
        return res.status(400).json({ error: `ИИ ошибка: ${errData.error || 'Модель перегружена'}. Попробуйте через минуту.` });
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
    res.status(500).json({ error: 'Ошибка сервера: ' + error.message });
  }
});

export default app;
