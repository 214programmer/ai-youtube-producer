import React, { useState } from 'react';
import { Loader2, Search, Youtube, Zap, AlertTriangle, Lightbulb, ExternalLink, HelpCircle, FileText, DollarSign, TrendingUp } from 'lucide-react';
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
    <div className="min-h-screen bg-[#09090b] text-zinc-100 p-4 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-10">
        
        <header className="flex items-center space-x-3 border-b border-zinc-800 pb-8 animate-in fade-in duration-500">
          <Youtube className="w-10 h-10 text-emerald-500" />
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">AI PRODUCER <span className="text-emerald-500 font-mono text-sm">FINAL V3</span></h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          {/* ФОРМА */}
          <div className="lg:col-span-1 space-y-4 bg-zinc-900 border border-zinc-800 p-6 rounded-[35px] h-fit shadow-2xl">
            <input placeholder="Ссылка на канал" value={channelUrl} onChange={(e)=>setChannelUrl(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm outline-none focus:border-emerald-500 transition-all" />
            <input placeholder="Ниша" value={niche} onChange={(e)=>setNiche(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm outline-none focus:border-emerald-500 transition-all" />
            <input type="password" placeholder="Ключ Groq" value={customGeminiKey} onChange={(e)=>setCustomGeminiKey(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm outline-none focus:border-emerald-500 transition-all" />
            <button onClick={handleAnalyze} disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-black font-black py-4 rounded-2xl flex items-center justify-center transition-all shadow-xl shadow-emerald-500/10 uppercase tracking-tighter text-sm">
              {isLoading ? <Loader2 className="animate-spin" /> : "Запустить аудит"}
            </button>
          </div>

          <div className="lg:col-span-3 space-y-10">
            {!data && !isLoading && <div className="h-64 border-2 border-dashed border-zinc-800 rounded-[40px] flex items-center justify-center text-zinc-700 font-black text-xl italic uppercase tracking-widest">Awaiting Input...</div>}
            
            {isLoading && <div className="h-64 flex flex-col items-center justify-center space-y-4"><Loader2 className="w-12 h-12 animate-spin text-emerald-500"/><p className="text-zinc-500 animate-pulse font-bold uppercase text-xs tracking-widest">Scanning algorithms...</p></div>}

            {data && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    {l: "Подписчики", v: data.channelData.subscribers},
                    {l: "Просмотры", v: data.channelData.totalViews},
                    {l: "Конкуренты", v: data.outlierVideos.length}
                  ].map((s, i) => (
                    <div key={i} className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl text-center shadow-xl">
                      <p className="text-2xl font-black text-emerald-400 font-mono">{s.v.toLocaleString()}</p>
                      <p className="text-[9px] text-zinc-500 font-bold uppercase mt-1 tracking-widest">{s.l}</p>
                    </div>
                  ))}
                </div>

                {/* РАЗБОР ХИТА */}
                <div className="p-8 bg-emerald-500/5 border border-emerald-500/20 rounded-[40px] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><Zap className="w-20 h-20 fill-emerald-500"/></div>
                    <h3 className="text-2xl font-black text-emerald-400 italic mb-4 uppercase flex items-center tracking-tighter"><Zap className="mr-3 fill-emerald-500 w-5 h-5"/> РАЗБОР ВАШЕГО ХИТА</h3>
                    <p className="text-zinc-300 leading-relaxed text-lg italic relative z-10">{data.aiAnalysis.bestVideoAnalysis}</p>
                </div>

                {/* ГРАФИК */}
                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[40px] h-64 shadow-xl">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.userVideos}>
                            <CartesianGrid stroke="#27272a" vertical={false} />
                            <XAxis hide />
                            <YAxis stroke="#52525b" fontSize={10} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{backgroundColor:'#09090b', borderRadius:'15px', border:'none', fontSize:'12px'}} />
                            <Line type="monotone" dataKey="views" stroke="#10b981" strokeWidth={5} dot={{r:6, fill:'#10b981'}} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* РЕФЕРЕНСЫ */}
                <div className="space-y-4">
                    <h3 className="text-xl font-black italic text-emerald-500 uppercase tracking-tighter flex items-center"><TrendingUp className="mr-2 w-5 h-5"/> Видео конкурентов</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {data.outlierVideos.map((v:any, i:number) => (
                            <a key={i} href={v.url} target="_blank" rel="noreferrer" className="group block bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden hover:border-emerald-500 transition-all shadow-xl">
                                <div className="relative">
                                  <img src={v.thumbnail} className="aspect-video object-cover w-full group-hover:scale-105 transition-all duration-500" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><ExternalLink className="w-5 h-5"/></div>
                                </div>
                                <div className="p-4"><p className="text-[10px] font-bold line-clamp-2 text-zinc-200 leading-snug">{v.title}</p></div>
                            </a>
                        ))}
                    </div>
                </div>

                {/* КНОПКА ПОДРОБНОГО ОТЧЕТА */}
                {!deepData && (
                    <button onClick={handleDeepReport} disabled={isDeepLoading} className="w-full bg-violet-600 hover:bg-violet-500 h-20 rounded-[35px] flex items-center justify-center font-black italic uppercase text-lg shadow-2xl shadow-violet-900/20 border-t border-violet-400/20 animate-pulse">
                        {isDeepLoading ? <Loader2 className="animate-spin mr-3"/> : <FileText className="mr-3"/>} Получить план на 14 дней + Бизнес
                    </button>
                )}

                {/* ОШИБКИ И СОВЕТЫ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h4 className="text-red-500 font-black uppercase text-[10px] tracking-[0.2em] flex items-center"><AlertTriangle className="mr-2 w-4 h-4"/> Ошибки</h4>
                        {data.aiAnalysis.mistakes.map((m:string, i:number) => (
                            <div key={i} className="p-5 bg-[#18181b] border border-zinc-800 rounded-3xl space-y-3 shadow-lg">
                                <p className="text-sm text-zinc-300 leading-relaxed italic">“ {m} ”</p>
                                <button onClick={()=>handleExplain(m)} className="text-[9px] font-black text-red-500 uppercase hover:text-red-400 tracking-tighter">
                                    {explanations[m]?.loading ? "Генерирую..." : "Почему это важно?"}
                                </button>
                                {explanations[m]?.text && <div className="text-[12px] text-zinc-400 bg-black/40 p-4 rounded-2xl border border-red-500/10 animate-in zoom-in-95">{explanations[m].text}</div>}
                            </div>
                        ))}
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-emerald-500 font-black uppercase text-[10px] tracking-[0.2em] flex items-center"><Lightbulb className="mr-2 w-4 h-4"/> Стратегия</h4>
                        {data.aiAnalysis.tips.map((t:string, i:number) => (
                            <div key={i} className="p-5 bg-[#18181b] border border-zinc-800 rounded-3xl space-y-3 shadow-lg">
                                <p className="text-sm text-zinc-300 leading-relaxed">{t}</p>
                                <button onClick={()=>handleExplain(t)} className="text-[9px] font-black text-emerald-500 uppercase hover:text-emerald-400 tracking-tighter">
                                    {explanations[t]?.loading ? "Генерирую..." : "Как это сделать?"}
                                </button>
                                {explanations[t]?.text && <div className="text-[12px] text-zinc-400 bg-black/40 p-4 rounded-2xl border border-emerald-500/10 animate-in zoom-in-95">{explanations[t].text}</div>}
                            </div>
                        ))}
                    </div>
                </div>

                {/* ГЛУБОКИЙ ОТЧЕТ */}
                {deepData && (
                    <div className="space-y-10 pt-10 border-t border-zinc-800 animate-in slide-in-from-bottom-10 duration-1000">
                        <div className="space-y-4">
                            <h3 className="text-3xl font-black text-violet-400 uppercase italic text-center tracking-tighter">План развития</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {deepData.contentPlan.map((p:any, i:number) => (
                                    <div key={i} className="p-6 bg-zinc-900 border border-zinc-800 rounded-[35px] space-y-4 shadow-xl hover:border-violet-500/30 transition-all">
                                        <span className="bg-violet-600 text-white px-4 py-1 rounded-full font-black text-[9px] uppercase tracking-widest">ДЕНЬ {p.day}</span>
                                        <p className="text-base text-zinc-100 font-bold leading-tight">{p.topic}</p>
                                        <button onClick={()=>handleExplain(p.topic)} className="text-[9px] font-black text-violet-400 uppercase flex items-center"><HelpCircle className="w-3 h-3 mr-1"/> Подробный сценарий</button>
                                        {explanations[p.topic]?.text && <div className="text-[11px] text-zinc-400 italic bg-black/40 p-3 rounded-xl border border-zinc-800">{explanations[p.topic].text}</div>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[40px] space-y-4 shadow-2xl">
                                <h4 className="text-emerald-500 font-black flex items-center uppercase text-[10px] tracking-widest"><DollarSign className="mr-2 w-4 h-4"/> Монетизация</h4>
                                {deepData.monetization.map((m:string, i:number) => <p key={i} className="text-sm text-zinc-400 border-b border-zinc-800/50 pb-3 leading-relaxed">• {m}</p>)}
                            </div>
                            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[40px] space-y-4 shadow-2xl">
                                <h4 className="text-blue-400 font-black flex items-center uppercase text-[10px] tracking-widest"><Zap className="w-4 h-4 mr-2"/> SEO Теги</h4>
                                <div className="flex flex-wrap gap-2">{deepData.seoPack.recommendedTags.map((tag:string, i:number)=><span key={i} className="bg-black border border-zinc-800 px-3 py-1.5 rounded-xl text-[10px] text-zinc-400 font-mono">{tag}</span>)}</div>
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
