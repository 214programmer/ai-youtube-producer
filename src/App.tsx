import React, { useState } from 'react';
import { Loader2, Search, Youtube, Zap, AlertTriangle, Lightbulb, ExternalLink, HelpCircle, FileText, DollarSign, TrendingUp, BarChart3, Users, ChevronRight } from 'lucide-react';
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
      const res = await fetch('/api/index', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task: 'analyze', channelUrl, niche, customGeminiKey }) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setData(result.data);
    } catch (e: any) { alert("Ошибка: " + e.message); } finally { setIsLoading(false); }
  };

  const handleExplain = async (text: string) => {
    if (explanations[text]) return;
    setExplanations(prev => ({...prev, [text]: {text: '', loading: true}}));
    try {
      const res = await fetch('/api/index', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task: 'explain', text, customGeminiKey }) });
      const result = await res.json();
      setExplanations(prev => ({...prev, [text]: {text: result.explanation, loading: false}}));
    } catch (e: any) { setExplanations(prev => ({...prev, [text]: {text: 'Ошибка загрузки', loading: false}})); }
  };

  const handleDeepReport = async () => {
    setIsDeepLoading(true);
    try {
      const res = await fetch('/api/index', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task: 'detailed', channelTitle: data?.channelData?.title, niche, customGeminiKey }) });
      const result = await res.json();
      setDeepData(result);
    } catch (e: any) { alert("Ошибка плана: " + e.message); } finally { setIsDeepLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 p-4 md:p-12 font-sans selection:bg-emerald-500/30">
      <div className="max-w-7xl mx-auto space-y-12">
        <header className="flex items-center space-x-6 border-b border-zinc-800/50 pb-10">
          <div className="bg-emerald-500 p-3 rounded-2xl text-black shadow-lg shadow-emerald-500/30"><Youtube size={36} /></div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">AI Producer <span className="text-emerald-500 font-mono">ULTRA</span></h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[#0f0f11] border border-zinc-800 p-8 rounded-[40px] space-y-6 shadow-2xl sticky top-12">
              <input placeholder="Ссылка или @ник" value={channelUrl} onChange={(e)=>setChannelUrl(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm outline-none focus:border-emerald-500 transition-all" />
              <input placeholder="Ниша" value={niche} onChange={(e)=>setNiche(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm outline-none focus:border-emerald-500 transition-all" />
              <input type="password" placeholder="Ключ Groq" value={customGeminiKey} onChange={(e)=>setCustomGeminiKey(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm outline-none focus:border-emerald-500 transition-all" />
              <button onClick={handleAnalyze} disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-black font-black py-5 rounded-2xl flex items-center justify-center transition-all shadow-xl uppercase tracking-widest text-xs">
                {isLoading ? <Loader2 className="animate-spin" /> : "ПОЛУЧИТЬ АНАЛИЗ"}
              </button>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-12">
            {data && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                  {[
                    {l: "Подписчики", v: data.channelData?.subscribers, i: <Users size={18}/>},
                    {l: "Вьюсы", v: data.channelData?.totalViews, i: <BarChart3 size={18}/>},
                    {l: "Ролики", v: data.channelData?.videoCount, i: <Youtube size={18}/>},
                    {l: "Топ ниши", v: (data.outlierVideos || []).length, i: <Zap size={18}/>}
                  ].map((s, i) => (
                    <div key={i} className="bg-[#0f0f11] border border-zinc-800 p-6 rounded-[32px] text-center shadow-lg group hover:border-emerald-500/40 transition-all">
                      <div className="flex justify-center text-emerald-500 mb-3">{s.i}</div>
                      <p className="text-2xl font-black text-white font-mono leading-none">{s.v?.toLocaleString() || 0}</p>
                      <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mt-2">{s.l}</p>
                    </div>
                  ))}
                </div>

                <div className="relative p-10 bg-emerald-500/[0.03] border border-emerald-500/20 rounded-[50px] shadow-2xl group overflow-hidden">
                    <Zap className="absolute -top-10 -right-10 w-48 h-48 text-emerald-500/[0.02] rotate-12 group-hover:scale-110 transition-transform duration-700" />
                    <h3 className="text-2xl font-black text-emerald-400 italic mb-6 uppercase flex items-center tracking-tighter"><Zap className="mr-3 fill-emerald-500 w-5 h-5"/> Секрет успеха</h3>
                    <p className="text-zinc-300 leading-relaxed text-lg italic border-l-4 border-emerald-500/30 pl-8">{data.aiAnalysis?.bestVideoAnalysis || "Анализ хита готовится..."}</p>
                </div>

                <div className="bg-[#0f0f11] border border-zinc-800 p-10 rounded-[60px] h-80 shadow-2xl relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.userVideos || []}>
                            <CartesianGrid stroke="#1a1a1c" vertical={false} />
                            <XAxis hide />
                            <YAxis stroke="#333" fontSize={10} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{backgroundColor:'#000', borderRadius:'20px', border:'1px solid #222'}} />
                            <Line type="monotone" dataKey="views" stroke="#10b981" strokeWidth={6} dot={{r:8, fill:'#10b981', strokeWidth:0}} activeDot={{r:10, fill:'#fff'}} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {!deepData && (
                    <button onClick={handleDeepReport} disabled={isDeepLoading} className="w-full bg-violet-600 hover:bg-violet-500 h-24 rounded-[50px] flex items-center justify-center font-black italic uppercase text-2xl shadow-xl shadow-violet-900/30 transition-all animate-pulse">
                        {isDeepLoading ? <Loader2 className="animate-spin mr-5 w-10 h-10"/> : <FileText className="mr-5 w-10 h-10"/>} СГЕНЕРИРОВАТЬ ПЛАН
                    </button>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h4 className="text-red-500 font-black uppercase text-xs tracking-[0.5em] ml-8 mb-4">Крит. Ошибки</h4>
                        {(data.aiAnalysis?.mistakes || []).map((m:string, i:number) => (
                            <div key={i} className="p-8 bg-zinc-900/30 border border-zinc-800 rounded-[50px] space-y-4 shadow-xl hover:border-red-500/30 transition-all">
                                <p className="text-sm text-zinc-300 font-bold italic">“ {m} ”</p>
                                <button onClick={()=>handleExplain(m)} className="flex items-center text-[9px] font-black text-red-500 uppercase hover:text-red-400 tracking-widest pl-1">
                                    <ChevronRight size={14} className="mr-1"/> {explanations[m]?.loading ? "Пишу..." : "Анализ проблемы"}
                                </button>
                                {explanations[m]?.text && <div className="mt-4 p-6 bg-black/60 rounded-[30px] border border-red-500/10 text-sm text-zinc-400 leading-relaxed animate-in zoom-in-95">{explanations[m].text}</div>}
                            </div>
                        ))}
                    </div>
                    <div className="space-y-6">
                        <h4 className="text-emerald-500 font-black uppercase text-xs tracking-[0.5em] ml-8 mb-4">Стратегия</h4>
                        {(data.aiAnalysis?.tips || []).map((t:string, i:number) => (
                            <div key={i} className="p-8 bg-zinc-900/30 border border-zinc-800 rounded-[50px] space-y-4 shadow-xl hover:border-emerald-500/30 transition-all">
                                <p className="text-sm text-zinc-300 font-bold">{t}</p>
                                <button onClick={()=>handleExplain(t)} className="flex items-center text-[9px] font-black text-emerald-500 uppercase hover:text-emerald-400 tracking-widest pl-1">
                                    <ChevronRight size={14} className="mr-1"/> {explanations[t]?.loading ? "Пишу..." : "Как внедрить?"}
                                </button>
                                {explanations[t]?.text && <div className="mt-4 p-6 bg-black/60 rounded-[30px] border border-emerald-500/10 text-sm text-zinc-400 leading-relaxed animate-in zoom-in-95">{explanations[t].text}</div>}
                            </div>
                        ))}
                    </div>
                </div>

                {deepData && (
                    <div className="space-y-16 pt-16 border-t border-zinc-800 animate-in slide-in-from-bottom-10 duration-1000">
                        <h3 className="text-4xl font-black text-violet-400 uppercase italic text-center tracking-tighter">План на 14 дней</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {(deepData.contentPlan || []).map((p:any, i:number) => (
                                <div key={i} className="p-10 bg-zinc-900 border border-zinc-800 rounded-[60px] space-y-5 shadow-2xl hover:border-violet-500/30 transition-all">
                                    <span className="bg-violet-600 text-white px-5 py-2 rounded-full font-black text-[9px] uppercase tracking-widest">ДЕНЬ {p.day}</span>
                                    <p className="text-xl text-zinc-100 font-black leading-tight italic">{p.topic}</p>
                                    <button onClick={()=>handleExplain(p.topic)} className="text-[10px] font-black text-violet-400 uppercase flex items-center hover:text-white transition-colors"><HelpCircle size={14} className="mr-2"/> Сценарий дня</button>
                                    {explanations[p.topic]?.text && <div className="mt-3 p-5 bg-black/40 rounded-3xl border border-zinc-800 text-[11px] text-zinc-400 italic leading-relaxed">{explanations[p.topic].text}</div>}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="bg-[#0f0f11] border border-zinc-800 p-12 rounded-[60px] shadow-2xl">
                                <h4 className="text-emerald-500 font-black uppercase text-[11px] tracking-widest flex items-center"><DollarSign size={20} className="mr-3"/> Монетизация</h4>
                                <div className="space-y-4">{(deepData.monetization || []).map((m:string, idx:number) => <div key={idx} className="p-4 bg-black/40 rounded-2xl border border-zinc-800/50"><p className="text-sm text-zinc-400 font-bold">{m}</p></div>)}</div>
                            </div>
                            <div className="bg-[#0f0f11] border border-zinc-800 p-12 rounded-[60px] shadow-2xl">
                                <h4 className="text-blue-400 font-black uppercase text-[11px] tracking-widest flex items-center"><Zap size={20} className="mr-3"/> SEO Теги</h4>
                                <div className="flex flex-wrap gap-2.5">{(deepData.seoPack?.recommendedTags || []).map((tag:string, idx:number)=><span key={idx} className="bg-zinc-950 border border-zinc-800 px-5 py-2.5 rounded-full text-[11px] text-zinc-400 font-mono hover:border-blue-500/40 transition-colors">{tag}</span>)}</div>
                            </div>
                        </div>
                    </div>
                )}
                
                <div className="space-y-8">
                    <h3 className="text-2xl font-black italic text-zinc-500 uppercase tracking-widest ml-10">Референсы ниши</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {(data.outlierVideos || []).map((v:any, i:number) => (
                            <a key={i} href={v.url} target="_blank" rel="noreferrer" className="group block bg-[#0f0f11] border border-zinc-800 rounded-[45px] overflow-hidden hover:border-emerald-500 transition-all duration-500 shadow-xl">
                                <img src={v.thumbnail} className="aspect-video object-cover w-full group-hover:scale-110 transition-transform duration-700" />
                                <div className="p-6 flex justify-between items-center"><p className="text-[11px] font-black line-clamp-2 text-zinc-200 leading-snug">{v.title}</p><ExternalLink size={12}/></div>
                            </a>
                        ))}
                    </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
