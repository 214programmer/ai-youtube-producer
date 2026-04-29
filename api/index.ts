import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
app.use(cors());
app.use(express.json());

function checkYoutubeKey() {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw new Error('YOUTUBE_API_KEY не найден в настройках Vercel.');
  return key;
}

app.post('/api/analyze', async (req, res) => {
  try {
    const { channelUrl, niche, customGeminiKey } = req.body;
    const apiKey = checkYoutubeKey();

    // 1. Поиск ID канала (YouTube API)
    const queryValue = channelUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@)?/, '');
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryValue)}&type=channel&maxResults=1&key=${apiKey}`;
    
    const sRes = await fetch(searchUrl);
    const sData: any = await sRes.json();
    if (!sData.items?.length) throw new Error('Канал не найден в YouTube. Проверьте ссылку.');
    const channelTitle = sData.items[0].snippet.title;

    // 2. ИИ Анализ (Gemini API)
    const geminiKey = customGeminiKey || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    if (!geminiKey) throw new Error('Ключ Gemini не найден.');

    const genAI = new GoogleGenerativeAI(geminiKey);
    
    // ПРИНУДИТЕЛЬНО УКАЗЫВАЕМ СТАБИЛЬНУЮ ВЕРСИЮ v1
    const model = genAI.getGenerativeModel(
      { model: "gemini-1.5-flash" }, 
      { apiVersion: "v1" } 
    );

    const prompt = `Ты YouTube-продюсер. Проанализируй канал "${channelTitle}" в нише "${niche}". 
    Дай стратегию: ошибки, советы, контент-план. Ответь СТРОГО в JSON: 
    {"mistakes": ["ошибка"], "tips": ["совет"], "seoPack": {"recommendedTags": [], "titleTemplates": []}, "contentPlan": [], "scripts": [], "competitors": [], "collaborations": [], "monetization": []}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().replace(/```json|```/g, '').trim();

    res.json({
      status: 'success',
      data: {
        channelData: { title: channelTitle },
        aiAnalysis: JSON.parse(text)
      }
    });
  } catch (error: any) {
    console.error('SERVER ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default app;
