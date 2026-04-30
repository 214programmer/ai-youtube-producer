import React, { useState } from 'react';
import { Loader2, Search, Youtube, Zap, AlertTriangle, Lightbulb, ExternalLink, HelpCircle, FileText, DollarSign, TrendingUp, BarChart3, Users, ChevronRight, CheckCircle2 } from 'lucide-react';
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
    } catch (e: any) { alert("Ошибка: " + e.message); } finally { setIsLoading(false); }
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
    } catch (e: any) { alert(e.message); setExplanations(prev => ({...prev, [text]: {text: '', loading: false}})); }
  };

  const handleDeepReport = async () => {
    setIsDeepLoading(true);
    try {
      const res = await fetch('/api/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'detailed', channelTitle: data?.channelData?.title, niche, customGeminiKey })
      });
      const result = await res.json();
      setDeepData(result);
    } catch (e: any) { alert(e.message); } finally { setIsDeepLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#070708] text-zinc-100 p-4 md:p-10 font-sans selection:bg-emerald-500 selection:text-black">
      <div className="max-w-6xl mx-auto space-y-10">
        
        <header className="flex items-center justify-between border-b border-zinc-800/50 pb-8">
          <div className="flex items-center space-x-4">
            <div className="bg-emerald-500 p-2.5 rounded-2xl text-black shadow-lg shadow-emerald-500/20"><Youtube size={32} /></div>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase">AI Producer <span className="text-emerald-500">Pro</span></h1>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          {/* Sidebar Form */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 p-6 rounded-[35px] space-y-5 shadow-2xl sticky top-10">
              <div className="space-y-4">
                <input placeholder="Ссылка на канал" value={channelUrl} onChange={(e)=>setChannelUrl(e.target.value)} className="w-full bg-black/50 border border-zinc-800 rounded-2xl p-4 text-sm outline-none focus:border-emerald-500 transition-all placeholder:text-zinc-600" />
                <input placeholder="Ниша" value={niche} onChange={(e)=>setNiche(e.target.value)} className="w-full bg-black/50 border border-zinc-800 rounded-2xl p-4 text-sm outline-none focus:border-emerald-500 transition-all placeholder:text-zinc-600" />
                <input type="password" placeholder="Ключ Groq" value={customGeminiKey} onChange={(e)=>setCustomGeminiKey(e.target.value)} className="w-full bg-black/50 border border-zinc-800 rounded-2xl p-4 text-sm outline-none focus:border-emerald-500 transition-all placeholder:text-zinc-600" />
              </div>
              <button onClick={handleAnalyze} disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-black font-black py-4 rounded-2xl flex items-center justify-center transition-all shadow-xl shadow-emerald-500/10 uppercase tracking-widest text-xs">
                {isLoading ? <Loader2 className="animate-spin" /> : <Search size={18} className="mr-2" />} Запустить ИИ
              </button>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-12">
            {data && (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    {l: "Подписчики", v: data.channelData?.subscribers, i: <Users size={16}/>},
                    {l: "Просмотры", v: data.channelData?.totalViews, i: <BarChart3 size={16}/>},
                    {l: "Роликов", v: data.channelData?.videoCount, i: <Youtube size={16}/>},
                    {l: "Конкуренты", v: data.outlierVideos?.length, i: <Zap size={16}/>}
                  ].map((s, i) => (
                    <div key={i} className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-[28px] text-center backdrop-blur-sm group hover:border-emerald-500/50 transition-all duration-500">
                      <div className="flex justify-center text-emerald-500 mb-2 group-hover:scale-110 transition-transform">{s.i}</div>
                      <p className="text-2xl font-black text-white">{s.v?.toLocaleString()}</p>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mt-1">{s.l}</p>
                    </div>
                  ))}
                </div>

                {/* HIT ANALYSIS SECTION */}
                <div className="relative p-10 bg-gradient-to-br from-emerald-500/10 via-black to-zinc-900 border border-emerald-500/20 rounded-[45px] shadow-2xl overflow-hidden group">
                    <Zap className="absolute -top-6 -right-6 w-32 h-32 text-emerald-500/5 rotate-12 group-hover:text-emerald-500/10 transition-all duration-700" />
                    <h3 className="text-2xl font-black text-emerald-400 italic mb-6 uppercase flex items-center tracking-tighter"><Zap className="mr-3 fill-emerald-500 w-5 h-5"/> Секрет вашего успеха</h3>
                    <p className="text-zinc-300 leading-relaxed text-lg whitespace-pre-line border-l-2 border-emerald-500/30 pl-6 py-2">{data.aiAnalysis?.bestVideoAnalysis}</p>
                </div>

                {/* CHART */}
                <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[45px] h-72 shadow-xl backdrop-blur-sm relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.userVideos || []}>
                            <CartesianGrid stroke="#18181b" vertical={false} />
                            <XAxis hide />
                            <YAxis stroke="#3f3f46" fontSize={10} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{backgroundColor:'#09090b', borderRadius:'18px', border:'1px solid #27272a', padding:'12px'}} />
                            <Line type="monotone" dataKey="views" stroke="#10b981" strokeWidth={6} dot={{r:7, fill:'#10b981', strokeWidth:0}} activeDot={{r:9, fill:'#fff'}} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* DETAILED BUTTON */}
                {!deepData && (
                    <button onClick={handleDeepReport} disabled={isDeepLoading} className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:scale-[1.01] active:scale-[0.99] h-24 rounded-[35px] flex items-center justify-center font-black italic uppercase text-xl shadow-2xl shadow-violet-900/20 transition-all border-t border-violet-400/30">
                        {isDeepLoading ? <Loader2 className="animate-spin mr-4 w-8 h-8"/> : <FileText className="mr-4 w-8 h-8"/>} Создать глубокую стратегию
                    </button>
                )}

                {/* MISTAKES & TIPS - REDESIGNED */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <h4 className="text-red-500 font-black uppercase text-[11px] tracking-[0.3em] flex items-center ml-4"><AlertTriangle className="mr-2 w-4 h-4"/> Крит. Ошибки</h4>
                        {(data.aiAnalysis?.mistakes || []).map((m:string, i:number) => (
                            <div key={i} className="p-7 bg-zinc-900/30 border border-zinc-800 rounded-[35px] space-y-4 hover:border-red-500/20 transition-all group shadow-lg">
                                <div className="flex items-start">
                                    <span className="text-red-500 font-serif text-3xl mr-4 opacity-50 mt-1">“</span>
                                    <p className="text-sm text-zinc-300 leading-relaxed font-medium">{m}</p>
                                </div>
                                <button onClick={()=>handleExplain(m)} className="flex items-center text-[10px] font-black text-red-500/80 uppercase hover:text-red-400 pl-8 transition-colors group-hover:translate-x-1 duration-300">
                                    <HelpCircle size={14} className="mr-1.5"/> {explanations[m]?.loading ? "Пишу ответ..." : "Почему это происходит?"}
                                </button>
                                {explanations[m]?.text && (
                                    <div className="mt-4 p-6 bg-black/60 rounded-3xl border border-red-500/10 text-[13px] text-zinc-400 leading-relaxed whitespace-pre-line animate-in slide-in-from-top-4 duration-500">
                                        <div className="flex items-center text-red-400 mb-3 uppercase text-[10px] font-bold"><BarChart3 size={12} className="mr-2"/> Аналитика ИИ:</div>
                                        {explanations[m].text}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="space-y-6">
                        <h4 className="text-emerald-500 font-black uppercase text-[11px] tracking-[0.3em] flex items-center ml-4"><Lightbulb className="mr-2 w-4 h-4"/> План Роста</h4>
                        {(data.aiAnalysis?.tips || []).map((t:string, i:number) => (
                            <div key={i} className="p-7 bg-zinc-900/30 border border-zinc-800 rounded-[35px] space-y-4 hover:border-emerald-500/20 transition-all group shadow-lg">
                                <p className="text-sm text-zinc-300 leading-relaxed font-medium">{t}</p>
                                <button onClick={()=>handleExplain(t)} className="flex items-center text-[10px] font-black text-emerald-500/80 uppercase hover:text-emerald-400 transition-colors group-hover:translate-x-1 duration-300">
                                    <ChevronRight size={14} className="mr-1.5"/> {explanations[t]?.loading ? "Готовлю гайд..." : "Как это реализовать?"}
                                </button>
                                {explanations[t]?.text && (
                                    <div className="mt-4 p-6 bg-black/60 rounded-3xl border border-emerald-500/10 text-[13px] text-zinc-400 leading-relaxed whitespace-pre-line animate-in slide-in-from-top-4 duration-500">
                                        <div className="flex items-center text-emerald-400 mb-3 uppercase text-[10px] font-bold"><CheckCircle2 size={12} className="mr-2"/> Пошаговая инструкция:</div>
                                        {explanations[t].text}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* DEEP REPORT DATA */}
                {deepData && (
                    <div className="space-y-12 pt-12 border-t border-zinc-800 animate-in slide-in-from-bottom-10 duration-1000">
                        <div className="text-center space-y-2">
                           <h3 className="text-4xl font-black text-violet-400 uppercase italic tracking-tighter">Стратегия 2025</h3>
                           <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-[0.5em]">Ultimate Content Protocol</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {(deepData?.contentPlan || []).map((p:any, i:number) => (
                                <div key={i} className="relative p-8 bg-zinc-900 border border-zinc-800 rounded-[40px] shadow-2xl hover:border-violet-500/30 transition-all group overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/5 blur-[50px] group-hover:bg-violet-600/10 transition-all"></div>
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center space-x-3">
                                            <span className="bg-violet-600 text-white px-4 py-1.5 rounded-full font-black text-[10px] uppercase tracking-tighter shadow-lg shadow-violet-900/50">ДЕНЬ {p.day}</span>
                                        </div>
                                    </div>
                                    <p className="text-lg text-zinc-100 font-black leading-tight group-hover:text-violet-400 transition-colors">{p.topic.split('|')[0]}</p>
                                    <p className="text-[13px] text-zinc-400 mt-4 leading-relaxed line-clamp-4 italic">{p.topic.split('|')[1] || p.topic}</p>
                                    <button onClick={()=>handleExplain(p.topic)} className="mt-6 flex items-center text-[9px] font-black text-violet-400 uppercase tracking-widest"><HelpCircle size={12} className="mr-2"/> Подробный сценарий</button>
                                </div>
                            ))}
                        </div>

                        {/* BUSINESS BLOCKS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-zinc-900/50 border border-zinc-800 p-10 rounded-[50px] space-y-6 shadow-2xl">
                                <h4 className="text-emerald-500 font-black uppercase text-[11px] tracking-widest flex items-center"><DollarSign className="mr-2 w-5 h-5"/> Масштабирование доходов</h4>
                                <div className="space-y-4">
                                    {(deepData?.monetization || []).map((m:string, idx:number) => (
                                        <div key={idx} className="flex items-start p-4 bg-black/40 rounded-2xl border border-zinc-800/50"><div className="text-emerald-500 mr-4 font-mono">0{idx+1}</div><p className="text-[13px] text-zinc-400">{m}</p></div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-zinc-900/50 border border-zinc-800 p-10 rounded-[50px] space-y-6 shadow-2xl">
                                <h4 className="text-blue-400 font-black uppercase text-[11px] tracking-widest flex items-center"><Zap className="mr-2 w-5 h-5"/> SEO & Позиционирование</h4>
                                <div className="flex flex-wrap gap-2.5">
                                    {(deepData?.seoPack?.recommendedTags || []).map((tag:string, idx:number)=>(
                                        <span key={idx} className="bg-zinc-950 border border-zinc-800 px-4 py-2 rounded-2xl text-[11px] text-zinc-400 font-mono hover:border-blue-500/50 transition-colors">{tag}</span>
                                    ))}
                                </div>
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
