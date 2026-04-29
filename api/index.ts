import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/analyze', async (req, res) => {
  try {
    const { channelUrl, niche, customGeminiKey } = req.body;
    
    // В данном случае customGeminiKey — это будет твой ключ DeepSeek
    const apiKey = sk-4556b8cd4c7b454aa64bff4c2deca5d8 || process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      throw new Error('Пожалуйста, вставьте ваш API ключ (DeepSeek) в поле ввода.');
    }

    // 1. YouTube часть (используем ключ из настроек Vercel)
    const ytKey = process.env.YOUTUBE_API_KEY;
    const queryValue = channelUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@)?/, '');
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryValue)}&type=channel&maxResults=1&key=${ytKey}`;
    
    const sRes = await fetch(searchUrl);
    const sData: any = await sRes.json();
    const channelTitle = sData.items?.[0]?.snippet?.title || "YouTube Channel";

    // 2. Запрос к DeepSeek
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: "Ты YouTube-продюсер. Отвечай только в формате JSON."
          },
          {
            role: "user",
            content: `Проанализируй канал "${channelTitle}" в нише "${niche}". Дай 3 ошибки и 3 совета. Верни ответ СТРОГО в формате JSON: {"mistakes": ["1", "2", "3"], "tips": ["1", "2", "3"], "seoPack": {"recommendedTags": [], "titleTemplates": []}, "contentPlan": [], "scripts": [], "competitors": [], "collaborations": [], "monetization": []}`
          }
        ],
        response_format: { type: 'json_object' }
      })
    });

    const aiData: any = await response.json();
    if (aiData.error) throw new Error(aiData.error.message);

    const text = aiData.choices[0].message.content;

    res.json({
      status: 'success',
      data: {
        channelData: { title: channelTitle },
        aiAnalysis: JSON.parse(text)
      }
    });

  } catch (error: any) {
    console.error('DEEPSEEK ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default app;
