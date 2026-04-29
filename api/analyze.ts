import express from 'express';
const app = express();
app.use(express.json());

app.post('/api/analyze', async (req, res) => {
  try {
    // Если это демо - возвращаем JSON
    if (req.body.customGeminiKey === 'demo') {
      return res.json({ status: 'success', data: { channelData: { title: "Демо" }, aiAnalysis: { mistakes: [], tips: [], seoPack: {recommendedTags: []}, contentPlan: [], scripts: [], competitors: [], collaborations: [], monetization: [] } } });
    }

    const { channelUrl, niche, customGeminiKey } = req.body;
    
    // ВАЖНО: Выведи в логи Vercel, что пришло
    console.log("Запрос к API:", { niche, url: channelUrl });

    // Простая проверка ключа
    if (!customGeminiKey || !customGeminiKey.startsWith('gsk_')) {
      return res.status(400).json({ error: "Ключ должен начинаться с gsk_" });
    }

    // 1. YouTube
    const ytKey = process.env.YOUTUBE_API_KEY;
    if (!ytKey) throw new Error("YOUTUBE_API_KEY не найден в переменных Vercel");
    
    const query = channelUrl.split('/').pop().replace('@', '');
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=channel&maxResults=1&key=${ytKey}`;
    const sRes = await fetch(searchUrl);
    const sData: any = await sRes.json();
    
    if (!sData.items?.length) throw new Error("Канал не найден");
    const channelTitle = sData.items[0].snippet.title;

    // 2. Groq
    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${customGeminiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: `Analyze "${channelTitle}". Give JSON: {"mistakes":[], "tips":[], "seoPack":{"recommendedTags":[]}, "contentPlan":[], "scripts":[], "competitors":[], "collaborations":[], "monetization":[]}` }]
      })
    });

    const aiData: any = await aiResponse.json();
    if (aiData.error) throw new Error("Groq API Error: " + aiData.error.message);

    res.json({
      status: 'success',
      data: {
        channelData: { title: channelTitle },
        aiAnalysis: JSON.parse(aiData.choices[0].message.content.replace(/```json|```/g, ''))
      }
    });

  } catch (err: any) {
    console.error("SERVER ERROR:", err);
    // ВОТ ТУТ КЛЮЧЕВОЕ: Мы отправляем текст ошибки, чтобы ты увидел причину, а не 'A server error'
    res.status(500).json({ error: err.toString() });
  }
});

export default app;
