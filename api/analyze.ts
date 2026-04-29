import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/analyze', async (req, res) => {
  try {
    const { channelUrl, niche, customGeminiKey } = req.body;
    const hfToken = (customGeminiKey || '').trim();

    // ПОЛНЫЙ ДЕМО-РЕЖИМ (чтобы интерфейс не падал)
    if (hfToken === 'demo') {
      return res.json({
        status: 'success',
        data: {
          channelData: { title: "Демо Канал ИИ", subscribers: 1250, totalViews: 45000, videoCount: 12 },
          userVideos: [{ title: "Как использовать ИИ", views: 500 }, { title: "Тест системы", views: 300 }],
          outlierVideos: [{ title: "Вирусное видео про ИИ", views: 1000000, channelTitle: "AI Master" }],
          aiAnalysis: {
            mistakes: ["Слишком длинные заголовки", "Мало взаимодействия в комментариях", "Плохое качество звука"],
            tips: ["Делайте монтаж динамичнее", "Добавьте субтитры", "Используйте трендовую музыку"],
            seoPack: {
              recommendedTags: ["#ИИ", "#технологии", "#обучение"],
              titleTemplates: ["Как я сделал [Результат] за 5 минут", "Секрет успеха в [Ниша]"]
            },
            contentPlan: [
              { day: 1, topic: "Обзор нейросетей" },
              { day: 2, topic: "Как сэкономить время с ИИ" },
              { day: 3, topic: "Топ 5 инструментов" },
              { day: 4, topic: "Ответы на вопросы" },
              { day: 5, topic: "Финальный туториал" }
            ],
            scripts: [
              { title: "Хук для Shorts", script: "Вы не поверите, что может этот ИИ...", visuals: "Быстрая смена кадров с результатом работы нейросети" }
            ],
            competitors: ["Использовать похожий стиль обложек", "Анализировать их самые популярные видео"],
            collaborations: ["Стрим с экспертом по ИИ", "Совместный обзор инструментов"],
            monetization: ["Реклама сервисов", "Продажа гайдов", "Донаты от зрителей"]
          }
        }
      });
    }

    // Если не демо - идем в Hugging Face
    if (!hfToken.startsWith('hf_')) return res.status(400).json({ error: 'Нужен токен hf_...' });
    const ytKey = (process.env.YOUTUBE_API_KEY || '').trim();
    
    // ... здесь идет твой стандартный код запроса к YouTube и HF ...
    // (Я его сократил для краткости, оставь свою рабочую часть с fetch)
    
    res.status(400).json({ error: "Для полной работы вставьте ключ Hugging Face. Либо напишите 'demo' для теста." });

  } catch (error: any) {
    res.status(500).json({ error: 'Ошибка: ' + error.message });
  }
});

export default app;
