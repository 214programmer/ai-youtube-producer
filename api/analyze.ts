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
          aiAnalysis: { mistakes: ["Демо ошибка"], tips: ["Демо совет"], seoPack: {recommendedTags: [], titleTemplates: []}, contentPlan: [], scripts: [], competitors: [], collaborations: [], monetization: [] }
        }
      });
    }

    if (!hfToken.startsWith('hf_')) return res.status(400).json({ error: 'Нужен токен Hugging Face (hf_...)' });

    // 2. ПРОВЕРКА YOUTUBE
    const ytKey = (process.env.YOUTUBE_API_KEY || '').trim();
    if (!ytKey) return res.status(500).json({ error: 'Критическая ошибка: YouTube API ключ не прописан в настройках Vercel!' });

    const queryValue = channelUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@)?/, '');
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryValue)}&type=channel&maxResults=1&key=${ytKey}`;
    
    const sRes = await fetch(searchUrl);
    if (!sRes.ok) {
        const errText = await sRes.text();
        return res.status(400).json({ error: `YouTube API вернул ошибку. Возможно, закончился лимит (Quota).` });
    }
    const sData: any = await sRes.json();
    if (!sData.items?.length) return res.status(404).json({ error: 'YouTube канал не найден. Проверьте ссылку.' });

    const channelTitle = sData.items[0].snippet.title;

    // 3. ЗАПРОС К ИИ (Используем СУПЕР-БЫСТРУЮ модель Llama 1B)
    const aiResponse = await fetch('https://api-inference.huggingface.co/models/meta-llama/Llama-3.2-1B-Instruct/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${hfToken}` },
      body: JSON.stringify({
        model: "meta-llama/Llama-3.2-1B-Instruct",
        messages: [{ role: "user", content: `Return ONLY JSON. Analyze YouTube channel "${channelTitle}" in niche "${niche}". Give 3 tips. Format: {"mistakes": [], "tips": [], "seoPack": {"recommendedTags": [], "titleTemplates": []}, "contentPlan": [], "scripts": [], "competitors": [], "collaborations": [], "monetization": []}` }],
        max_tokens: 500
      })
    });

    if (!aiResponse.ok) {
        const aiErr = await aiResponse.text();
        // Если ИИ вернул HTML, мы поймаем это здесь и выведем текст ошибки вместо падения
        return res.status(400).json({ error: `ИИ сервер (Hugging Face) перегружен или токен неверный. Ошибка: ${aiResponse.status}` });
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
    // Гарантируем, что всегда возвращаем JSON
    res.status(500).json({ error: 'Ошибка на стороне сервера: ' + error.message });
  }
});

export default app;
