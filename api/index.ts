import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/analyze', async (req, res) => {
  try {
    const { channelUrl, niche, customGeminiKey } = req.body;
    
    // ПРИНУДИТЕЛЬНО используем только ключ из поля ввода
    if (!customGeminiKey) {
      throw new Error('Пожалуйста, вставьте ваш API ключ Gemini в поле ввода.');
    }

    console.log("Попытка анализа для ниши:", niche);

    // 1. YouTube часть (используем ключ из настроек Vercel)
    const ytKey = process.env.YOUTUBE_API_KEY;
    if (!ytKey) throw new Error('YOUTUBE_API_KEY не найден в настройках Vercel.');

    const queryValue = channelUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/(@)?/, '');
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(queryValue)}&type=channel&maxResults=1&key=${ytKey}`;
    
    const sRes = await fetch(searchUrl);
    const sData: any = await sRes.json();
    if (!sData.items?.length) throw new Error('YouTube канал не найден.');
    const channelTitle = sData.items[0].snippet.title;

    // 2. Gemini часть (СТРОГО через твой ключ)
    const genAI = new GoogleGenerativeAI(customGeminiKey);
    
    // Пробуем самую стандартную модель без лишних настроек версии
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Ты YouTube-эксперт. Канал: "${channelTitle}", ниша: "${niche}". 
    Дай 3 ошибки и 3 совета. Верни ответ СТРОГО в формате JSON: 
    {"mistakes": ["1", "2", "3"], "tips": ["1", "2", "3"], "seoPack": {"recommendedTags": [], "titleTemplates": []}, "contentPlan": [], "scripts": [], "competitors": [], "collaborations": [], "monetization": []}`;

    console.log("Отправка запроса в Gemini...");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().replace(/```json|```/g, '').trim();

    console.log("Успешный ответ от Gemini!");

    res.json({
      status: 'success',
      data: {
        channelData: { title: channelTitle },
        aiAnalysis: JSON.parse(text)
      }
    });

  } catch (error: any) {
    console.error('ОШИБКА СЕРВЕРА:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default app;
