import express from 'express';
const app = express();
app.use(express.json());

app.post('/api/detailed', async (req, res) => {
  try {
    const { channelTitle, niche, apiKey } = req.body;
    const aiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: `Ты продюсер. Сделай ГЛУБОКИЙ отчет для канала "${channelTitle}" (ниша: ${niche}). 
        Нужен детальный контент-план на 14 дней (каждый день: Хайповый заголовок, Сценарий, Почему это наберет). 3 полных сценария, 5 способов монетизации. 
        ПИШИ ОЧЕНЬ МНОГО И ПОДРОБНО НА РУССКОМ. 
        ВЕРНИ JSON: {"contentPlan":[{"day":1,"topic":""}], "scripts":[{"title":"","script":"","visuals":""}], "monetization":[], "seoPack":{"recommendedTags":[],"titleTemplates":[]}}` }],
        response_format: { type: 'json_object' }
      })
    });
    const aiData: any = await aiResponse.json();
    res.json(JSON.parse(aiData.choices[0].message.content));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
export default app;
