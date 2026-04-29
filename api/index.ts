import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/analyze', async (req, res) => {
  try {
    const { channelUrl, niche, customGeminiKey } = req.body;
    
    // 1. YouTube часть
    const ytKey = process.env.YOUTUBE_API_KEY;
    if (!ytKey) throw new Error('YOUTUBE_API_KEY не найден в настройках Vercel.');

    const queryValue = channelUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@)?/, '');
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryValue)}&type=channel&maxResults=1&key=${ytKey}`;
    
    const sRes = await fetch(searchUrl);
    const sData: any = await sRes.json();
    const channelTitle = sData.items?.[0]?.snippet?.title || "YouTube Channel";

    // 2. AI часть с перебором моделей
    const geminiKey = customGeminiKey || process.env.VITE_GEMINI_API_KEY;
    if (!geminiKey) throw new Error('API ключ Gemini не найден.');

    const genAI = new GoogleGenerativeAI(geminiKey);
    const prompt = `Ты YouTube-продюсер. Проанализируй канал "${channelTitle}" в нише "${niche}". 
    Ответь СТРОГО в формате JSON: 
    {"mistakes": ["1", "2"], "tips": ["1", "2"], "seoPack": {"recommendedTags": [], "titleTemplates": []}, "contentPlan": [], "scripts": [], "competitors": [], "collaborations": [], "monetization": []}`;

    // Список моделей от лучшей к самой стабильной
    const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
    let lastError = "";

    for (const modelName of modelsToTry) {
      try {
        console.log(`Пробую модель: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const text = result.response.text().replace(/```json|```/g, '').trim();
        
        // Если дошли сюда - значит успех! Отправляем ответ.
        return res.json({
          status: 'success',
          data: {
            channelData: { title: channelTitle },
            aiAnalysis: JSON.parse(text)
          }
        });
      } catch (err: any) {
        lastError = err.message;
        console.warn(`Модель ${modelName} не сработала:`, lastError);
        continue; // Пробуем следующую модель
      }
    }

    // Если ни одна модель не сработала
    throw new Error(`Ни одна модель ИИ не ответила. Последняя ошибка: ${lastError}`);

  } catch (error: any) {
    console.error('SERVER ERROR:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default app;
