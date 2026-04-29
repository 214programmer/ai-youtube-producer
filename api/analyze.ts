import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/analyze', async (req, res) => {
  try {
    const { channelUrl, niche, customGeminiKey } = req.body;
    
    // В поле на сайте вставляй ключ от Hugging Face (hf_...)
    const apiKey = (customGeminiKey || '').trim(); 

    if (!apiKey) {
      return res.status(400).json({ error: 'Пожалуйста, вставьте ваш API токен Hugging Face (hf_...)' });
    }

    // 1. YouTube часть (используем ключ из настроек Vercel)
    const ytKey = (process.env.YOUTUBE_API_KEY || '').trim();
    const queryValue = channelUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@)?/, '');
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryValue)}&type=channel&maxResults=1&key=${ytKey}`;
    
    const sRes = await fetch(searchUrl);
    const sData: any = await sRes.json();
    const channelTitle = sData.items?.[0]?.snippet?.title || "YouTube Channel";

    // 2. Запрос к Hugging Face (Модель Qwen 2.5 72B)
    const aiResponse = await fetch('https://api-inference.huggingface.co/models/Qwen/Qwen2.5-72B-Instruct/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "Qwen/Qwen2.5-72B-Instruct",
        messages: [
          {
            role: "user",
            content: `Проанализируй YouTube канал "${channelTitle}" в нише "${niche}". Дай 3 ошибки и 3 совета. Ответь СТРОГО в формате JSON: {"mistakes": ["ошибка 1", "ошибка 2", "ошибка 3"], "tips": ["совет 1", "совет 2", "совет 3"], "seoPack": {"recommendedTags": [], "titleTemplates": []}, "contentPlan": [], "scripts": [], "competitors": [], "collaborations": [], "monetization": []}`
          }
        ],
        max_tokens: 1500
      })
    });

    const aiData: any = await aiResponse.json();
    
    if (aiData.error) {
        return res.status(400).json({ error: 'Ошибка Hugging Face: ' + aiData.error });
    }

    const resultText = aiData.choices[0].message.content;
    // Очищаем ответ от возможных лишних знаков ИИ
    const cleanJson = resultText.replace(/```json|```/g, '').trim();

    res.json({
      status: 'success',
      data: {
        channelData: { title: channelTitle },
        aiAnalysis: JSON.parse(cleanJson)
      }
    });

  } catch (error: any) {
    res.status(500).json({ error: 'Ошибка сервера: ' + error.message });
  }
});

export default app;
