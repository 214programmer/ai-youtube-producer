import React, { useState } from 'react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/ui/card';
import { Loader2, Search, Youtube, TrendingUp, AlertTriangle, Lightbulb, FileText, Zap, ExternalLink, Users, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function App() {
  const [channelUrl, setChannelUrl] = useState('');
  const [niche, setNiche] = useState('');
  const [customGeminiKey, setCustomGeminiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeepLoading, setIsDeepLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [deepReportDone, setDeepReportDone] = useState(false);

  const handleAnalyze = async () => {
    if (!channelUrl || !niche) {
      alert('Заполните ссылку и нишу');
      return;
    }
    setIsLoading(true); setData(null); setDeepReportDone(false);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelUrl, niche, customGeminiKey })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setData(result.data);
    } catch (e: any) { alert(e.message); } finally { setIsLoading(false); }
  };

  const handleDeepReport = async () => {
    setIsDeepLoading(true);
    try {
      const res = await fetch('/api/detailed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelTitle: data.channelData.title, niche, apiKey: customGeminiKey })
      });
      const deepData = await res.json();
      setData({ ...data, aiAnalysis: { ...data.aiAnalysis, ...deepData } });
      setDeepReportDone(true);
    } catch (e: any) { alert(e.message); } finally { setIsDeepLoading(false); }
  };

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <header className="flex items-center space-x-3 pb-8 border-b border-zinc-800">
          <div className="bg-emerald-500/10 p-2 rounded-lg">
            <Youtube className="w-8 h-8 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-50 uppercase italic">AI YouTube Producer <span className="text-emerald-500">Ultra</span></h1>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Левая колонка - Форма */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-zinc-900 border-zinc-800 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Параметры анализа</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="Ссылка на канал" value={channelUrl} onChange={(e) => setChannelUrl(e.target.value)} className="bg-zinc-950 border-zinc-800" />
                <Input placeholder="Ниша (Игры, ИИ и т.д.)" value={niche} onChange={(e) => setNiche(e.target.value)} className="bg-zinc-950 border-zinc-800" />
                <Input type="password" placeholder="Ключ Groq (gsk_...)" value={customGeminiKey} onChange={(e) => setCustomGeminiKey(e.target.value)} className="bg-zinc-950 border-zinc-800" />
                
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12" onClick={handleAnalyze} disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                  БЫСТРЫЙ АУДИТ
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Правая колонка - Результаты */}
          <div className="lg:col-span-2 space-y-8">
            {!data && !isLoading && (
              <div className="h-64 border-2 border-dashed border-zinc-800 rounded-3xl flex items-center justify-center text-zinc-600 font-bold uppercase tracking-widest">
                ОЖИДАНИЕ ДАННЫХ...
              </div>
            )}

            {isLoading && (
              <div className="h-64 flex flex-col items-center justify-center space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-emerald-500" />
                <p className="text-zinc-500 animate-pulse font-medium">ИИ сканирует ваш канал и ищет слабые места...</p>
              </div>
            )}

            {data && (
              <div className="space-y-8 animate-in fade-in duration-700">
                
                {/* Статистика */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {label: "Подписчики", val: data.channelData.subscribers, icon: <Users className="w-4 h-4 text-emerald-500" />},
                    {label: "Просмотры", val: data.channelData.totalViews, icon: <BarChart3 className="w-4 h-4 text-emerald-500" />},
                    {label: "Видео", val: data.channelData.videoCount, icon: <Youtube className="w-4 h-4 text-emerald-500" />},
                    {label: "Конкуренты", val: data.outlierVideos.length, icon: <Zap className="w-4 h-4 text-emerald-500" />}
                  ].map((s, i) => (
                    <Card key={i} className="bg-zinc-900 border-zinc-800 p-4">
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-[10px] text-zinc-500 uppercase font-bold">{s.label}</p>
                        {s.icon}
                      </div>
                      <p className="text-xl font-black text-zinc-100 font-mono">{s.val.toLocaleString()}</p>
                    </Card>
                  ))}
                </div>

                {/* Кнопка подробного отчета */}
                {!deepReportDone && (
                    <Button onClick={handleDeepReport} disabled={isDeepLoading} className="w-full bg-violet-600 hover:bg-violet-500 h-20 text-xl font-black italic rounded-[30px] shadow-xl shadow-violet-900/20 border-t border-violet-400/20 transition-all animate-bounce">
                        {isDeepLoading ? <Loader2 className="animate-spin mr-3 w-6 h-6"/> : <FileText className="mr-3 w-6 h-6"/>}
                        ПОЛУЧИТЬ ПЛАН НА 14 ДНЕЙ
                    </Button>
                )}

                {/* График */}
                <Card className="bg-zinc-900 border-zinc-800 p-6 rounded-[30px]">
                  <CardTitle className="text-sm uppercase text-zinc-500 mb-6 tracking-widest">Динамика последних видео</CardTitle>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.userVideos}>
                        <CartesianGrid stroke="#27272a" vertical={false} />
                        <XAxis hide />
                        <YAxis stroke="#52525b" fontSize={10} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{backgroundColor:'#18181b', border:'none', borderRadius:'15px'}} />
                        <Line type="monotone" dataKey="views" stroke="#10b981" strokeWidth={5} dot={{r:6, fill:'#10b981', strokeWidth:0}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Вирусные видео */}
                <div className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center text-zinc-300 italic"><Zap className="mr-2 text-yellow-500 fill-yellow-500 w-5 h-5"/> РЕФЕРЕНСЫ НИШИ (КЛИКАБЕЛЬНО)</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {data.outlierVideos.map((v:any, i:number) => (
                            <a key={i} href={v.url} target="_blank" rel="noreferrer" className="group">
                                <Card className="bg-zinc-900 border-zinc-800 overflow-hidden group-hover:border-emerald-500 transition-all duration-300 rounded-2xl h-full">
                                    <div className="relative">
                                      <img src={v.thumbnail} className="aspect-video object-cover" alt="" />
                                      <div className="absolute top-2 right-2 bg-emerald-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full flex items-center">
                                        СМОТРЕТЬ <ExternalLink className="w-2 h-2 ml-1" />
                                      </div>
                                    </div>
                                    <div className="p-3">
                                        <p className="text-xs font-bold line-clamp-2 leading-tight text-zinc-100">{v.title}</p>
                                        <p className="text-[10px] text-zinc-500 mt-2 italic">{v.channelTitle}</p>
                                    </div>
                                </Card>
                            </a>
                        ))}
                    </div>
                </div>

                {/* Ошибки и советы */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h4 className="text-red-500 font-bold flex items-center uppercase text-xs tracking-tighter"><AlertTriangle className="mr-2 w-4 h-4"/> Критические ошибки</h4>
                        {data.aiAnalysis.mistakes.map((m:string, i:number) => (
                            <div key={i} className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl text-sm text-zinc-300 italic leading-relaxed">“ {m} ”</div>
                        ))}
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-emerald-500 font-bold flex items-center uppercase text-xs tracking-tighter"><Lightbulb className="mr-2 w-4 h-4"/> Стратегия роста</h4>
                        {data.aiAnalysis.tips.map((t:string, i:number) => (
                            <div key={i} className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl text-sm text-zinc-300 leading-relaxed">{t}</div>
                        ))}
                    </div>
                </div>

                {/* Подробный план */}
                {deepReportDone && (
                    <div className="space-y-8 pt-10 border-t border-zinc-800 animate-in slide-in-from-bottom-10 duration-1000">
                        <h3 className="text-3xl font-black text-violet-400 italic uppercase tracking-tighter text-center">ГЛУБОКАЯ СТРАТЕГИЯ</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {data.aiAnalysis.contentPlan.map((p:any, i:number) => (
                                <div key={i} className="p-6 bg-zinc-900 rounded-[30px] border border-zinc-800 hover:border-violet-500/30 transition-all shadow-xl">
                                    <span className="bg-violet-600 text-white px-4 py-1 rounded-full font-black text-[10px] uppercase">День {p.day}</span>
                                    <p className="text-base font-bold mt-4 text-zinc-100 leading-tight">{p.topic}</p>
                                </div>
                            ))}
                        </div>
                        
                        {/* SEO и Монетизация из глубокого отчета */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {data.aiAnalysis.seoPack && (
                                <Card className="bg-zinc-900 border-zinc-800 p-6">
                                    <h4 className="text-blue-400 font-bold mb-4 uppercase text-xs">SEO Оптимизация</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {data.aiAnalysis.seoPack.recommendedTags.map((tag:string, idx:number)=>(
                                            <span key={idx} className="bg-black px-2 py-1 rounded border border-zinc-800 text-[10px] text-zinc-400 font-mono">{tag}</span>
                                        ))}
                                    </div>
                                </Card>
                            )}
                            {data.aiAnalysis.monetization && (
                                <Card className="bg-zinc-900 border-zinc-800 p-6">
                                    <h4 className="text-emerald-400 font-bold mb-4 uppercase text-xs">Бизнес-стратегия</h4>
                                    <ul className="space-y-2 text-sm text-zinc-400">
                                        {data.aiAnalysis.monetization.map((m:string, idx:number)=><li key={idx}>• {m}</li>)}
                                    </ul>
                                </Card>
                            )}
                        </div>
                    </div>
                )}

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
