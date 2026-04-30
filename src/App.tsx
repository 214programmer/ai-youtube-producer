import React, { useState } from 'react';
import { Loader2, Search, Youtube, Zap, AlertTriangle, Lightbulb, ExternalLink, HelpCircle, FileText, DollarSign, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function App() {
  const [channelUrl, setChannelUrl] = useState('');
  const [niche, setNiche] = useState('');
  const [customGeminiKey, setCustomGeminiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeepLoading, setIsDeepLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [deepData, setDeepData] = useState<any>(null);
  const [explanations, setExplanations] = useState<Record<string, {text: string, loading: boolean}>>({});

  const handleAnalyze = async () => {
    setIsLoading(true); setData(null); setDeepData(null); setExplanations({});
    try {
      const res = await fetch('/api/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'analyze', channelUrl, niche, customGeminiKey })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setData(result.data);
    } catch (e: any) { alert(e.message); } finally { setIsLoading(false); }
  };

  const handleExplain = async (text: string) => {
    if (explanations[text]) return;
    setExplanations(prev => ({...prev, [text]: {text: '', loading: true}}));
    try {
      const res = await fetch('/api/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'explain', text, customGeminiKey })
      });
      const result = await res.json();
      setExplanations(prev => ({...prev, [text]: {text: result.explanation, loading: false}}));
    } catch (e: any) { alert(e.message); }
  };

  const handleDeepReport = async () => {
    setIsDeepLoading(true);
    try {
      const res = await fetch('/api/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'detailed', channelTitle: data.channelData.title, niche, customGeminiKey })
      });
      const result = await res.json();
      setDeepData(result);
    } catch (e: any) { alert(e.message); } finally { setIsDeepLoading(false); }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-4 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-10">
        
        <header className="flex items-center space-x-3 border-b border-zinc-800 pb-8">
          <Youtube className="w-10 h-10 text-emerald-500" />
          <h1 className="text-3xl font-black italic tracking-tighter uppercase italic">AI PRODUCER <span className="text-emerald-500">MAX</span></h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          {/* Форма */}
          <div className="lg:col-span-1 space-y-4 bg-zinc-900 border border-zinc-800 p-6 rounded-[35px] h-fit">
            <input placeholder="Ссылка на канал" value={channelUrl} onChange={(e)=>setChannelUrl(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm outline-none" />
            <input placeholder="Ниша" value={niche} onChange={(e)=>setNiche(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm outline-none" />
            <input type="password" placeholder="Ключ Groq" value={customGeminiKey} onChange={(e)=>setCustomGeminiKey(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm outline-none" />
            <button onClick={handleAnalyze} disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-black font-black py-4 rounded-2xl">
              {isLoading ? <Loader2 className="animate-spin" /> : "НАЧАТЬ АУДИТ"}
            </button>
          </div>

          <div className="lg:col-span-3 space-y-10">
            {data && (
              <>
                {/* Статистика */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl text-center"><p className="text-2xl font-black text-emerald-400">{data.channelData.subscribers.toLocaleString()}</p><p className="text-[10px] text-zinc-500 uppercase">Подписчиков</p></div>
                  <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl text-center"><p className="text-2xl font-black text-emerald-400">{data.channelData.totalViews.toLocaleString()}</p><p className="text-[10px] text-zinc-500 uppercase">Просмотров</p></div>
                  <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl text-center"><p className="text-2xl font-black text-emerald-400">{data.outlierVideos.length}</p><p className="text-[10px] text-zinc-500 uppercase">Конкурентов</p></div>
                </div>

                {/* ГРАФИК */}
                <Card className="bg-zinc-900 border-zinc-800 p-8 rounded-[40px]">
                   <h4 className="text-xs font-bold text-zinc-500 uppercase mb-4 flex items-center"><BarChart3 className="w-4 h-4 mr-2"/> Динамика последних видео</h4>
                   <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data.userVideos}>
                        <CartesianGrid stroke="#27272a" vertical={false} />
                        <XAxis hide />
                        <YAxis stroke="#52525b" fontSize={10} axisLine={false} />
                        <Tooltip contentStyle={{backgroundColor:'#18181b', border:'none', borderRadius:'15px'}} />
                        <Line type="monotone" dataKey="views" stroke="#10b981" strokeWidth={5} dot={{r:6, fill:'#10b981'}} />
                      </LineChart>
                    </ResponsiveContainer>
                   </div>
                </Card>

                {/* РЕФЕРЕНСЫ (ССЫЛКИ) */}
                <div className="space-y-4">
                    <h3 className="text-xl font-black italic text-emerald-500 uppercase"><Zap className="mr-2 fill-yellow-500 inline"/> РЕФЕРЕНСЫ НИШИ</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {data.outlierVideos.map((v:any, i:number) => (
                            <a key={i} href={v.url} target="_blank" rel="noreferrer" className="group block bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden hover:border-emerald-500 transition-all">
                                <img src={v.thumbnail} className="aspect-video object-cover w-full group-hover:scale-105 transition-all" />
                                <div className="p-4"><p className="text-[10px] font-bold line-clamp-2">{v.title}</p></div>
                            </a>
                        ))}
                    </div>
                </div>

                {/* КНОПКА ПОДРОБНОГО ОТЧЕТА */}
                {!deepData && (
                    <button onClick={handleDeepReport} disabled={isDeepLoading} className="w-full bg-violet-600 hover:bg-violet-500 h-20 rounded-[30px] font-black italic uppercase">
                        {isDeepLoading ? <Loader2 className="animate-spin mr-3"/> : <FileText className="mr-3"/>} Глубокая стратегия (14 дней + Бизнес)
                    </button>
                )}

                {/* ОШИБКИ И СОВЕТЫ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h4 className="text-red-500 font-bold uppercase text-xs">Ошибки</h4>
                        {data.aiAnalysis.mistakes.map((m:string, i:number) => (
                            <div key={i} className="p-5 bg-[#18181b] border border-zinc-800 rounded-3xl space-y-3">
                                <p className="text-sm">“ {m} ”</p>
                                <button onClick={()=>handleExplain(m)} className="text-[10px] font-black text-red-500 uppercase">
                                    {explanations[m]?.loading ? "Генерирую..." : "Почему это важно?"}
                                </button>
                                {explanations[m]?.text && <div className="text-[12px] text-zinc-400 bg-black/40 p-4 rounded-2xl border border-red-500/10">{explanations[m].text}</div>}
                            </div>
                        ))}
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-emerald-500 font-bold uppercase text-xs">Советы</h4>
                        {data.aiAnalysis.tips.map((t:string, i:number) => (
                            <div key={i} className="p-5 bg-[#18181b] border border-zinc-800 rounded-3xl space-y-3">
                                <p className="text-sm">{t}</p>
                                <button onClick={()=>handleExplain(t)} className="text-[10px] font-black text-emerald-500 uppercase">
                                    {explanations[t]?.loading ? "Генерирую..." : "Как это сделать?"}
                                </button>
                                {explanations[t]?.text && <div className="text-[12px] text-zinc-400 bg-black/40 p-4 rounded-2xl border border-emerald-500/10">{explanations[t].text}</div>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* ГЛУБОКИЙ ОТЧЕТ */}
                {deepData && (
                    <div className="space-y-10 pt-10 border-t border-zinc-800 animate-in slide-in-from-bottom-10">
                        {/* План на 14 дней */}
                        <div className="space-y-4">
                            <h3 className="text-2xl font-black text-violet-400 uppercase italic">План на 14 дней</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {deepData.contentPlan.map((p:any, i:number) => (
                                    <div key={i} className="p-6 bg-zinc-900 border border-zinc-800 rounded-[30px] space-y-3">
                                        <span className="bg-violet-600 text-white px-3 py-1 rounded-full font-black text-[10px]">ДЕНЬ {p.day}</span>
                                        <p className="text-sm text-zinc-100 font-bold">{p.topic}</p>
                                        <button onClick={()=>handleExplain(p.topic)} className="text-[10px] font-black text-violet-400 uppercase">Подробный сценарий</button>
                                        {explanations[p.topic]?.text && <div className="text-[11px] text-zinc-400 italic">{explanations[p.topic].text}</div>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* SEO и Монетизация */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[40px] space-y-4">
                                <h4 className="text-emerald-500 font-black flex items-center uppercase text-xs"><DollarSign className="w-4 h-4 mr-2"/> Монетизация</h4>
                                {deepData.monetization.map((m:string, i:number) => <p key={i} className="text-sm text-zinc-400">• {m}</p>)}
                            </div>
                            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[40px] space-y-4">
                                <h4 className="text-blue-400 font-black flex items-center uppercase text-xs"><Zap className="w-4 h-4 mr-2"/> SEO Теги</h4>
                                <div className="flex flex-wrap gap-2">{deepData.seoPack.recommendedTags.map((tag:string, i:number)=><span key={i} className="bg-black border border-zinc-800 px-2 py-1 rounded text-[10px]">{tag}</span>)}</div>
                            </div>
                        </div>
                    </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
