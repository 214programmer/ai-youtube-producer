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
    <div className="min-h-screen bg-[#09090b] text-zinc-100 p-4 md:p-10 font-sans selection:bg-emerald-500/30">
      <div className="max-w-6xl mx-auto space-y-10">
        
        <header className="flex items-center space-x-4 border-b border-zinc-800 pb-8">
          <div className="bg-emerald-500 p-2.5 rounded-2xl text-black shadow-lg shadow-emerald-500/20"><Youtube size={32} /></div>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase italic">AI PRODUCER <span className="text-emerald-500 font-mono text-sm">ULTRA</span></h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-1 space-y-4 bg-zinc-900 border border-zinc-800 p-6 rounded-[35px] h-fit shadow-2xl">
            <input placeholder="Ссылка или @ник" value={channelUrl} onChange={(e)=>setChannelUrl(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm outline-none focus:border-emerald-500 transition-all" />
            <input placeholder="Ниша" value={niche} onChange={(e)=>setNiche(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm outline-none focus:border-emerald-500 transition-all" />
            <input type="password" placeholder="Ключ Groq" value={customGeminiKey} onChange={(e)=>setCustomGeminiKey(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm outline-none focus:border-emerald-500 transition-all" />
            <button onClick={handleAnalyze} disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-black font-black py-4 rounded-2xl flex items-center justify-center transition-all shadow-xl shadow-emerald-500/10 uppercase tracking-widest text-xs">
              {isLoading ? <Loader2 className="animate-spin" /> : "Начать анализ"}
            </button>
          </div>

          <div className="lg:col-span-3 space-y-10">
            {data && (
              <div className="space-y-10 animate-in fade-in duration-700">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    {l: "Подписчики", v: data.channelData?.subscribers, i: <Users size={16}/>},
                    {l: "Вьюсы", v: data.channelData?.totalViews, i: <BarChart3 size={16}/>},
                    {l: "Конкуренты", v: (data.outlierVideos || []).length, i: <Zap size={16}/>}
                  ].map((s, i) => (
                    <div key={i} className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl text-center shadow-lg hover:border-emerald-500/40 transition-all">
                      <div className="flex justify-center text-emerald-500 mb-2">{s.i}</div>
                      <p className="text-xl font-black text-white font-mono">{s.v?.toLocaleString() || 0}</p>
                      <p className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest mt-1">{s.l}</p>
                    </div>
                  ))}
                </div>

                <div className="p-8 bg-emerald-500/5 border border-emerald-500/20 rounded-[40px] shadow-2xl relative group overflow-hidden">
                    <Zap className="absolute -top-6 -right-6 w-32 h-32 text-emerald-500/5 rotate-12" />
                    <h3 className="text-2xl font-black text-emerald-400 italic mb-4 uppercase flex items-center tracking-tighter"><Zap className="mr-3 fill-emerald-500 w-5 h-5"/> Секрет вашего хита</h3>
                    <p className="text-zinc-300 leading-relaxed text-lg italic whitespace-pre-line border-l-2 border-emerald-500/30 pl-6">{data.aiAnalysis?.bestVideoAnalysis}</p>
                </div>

                <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[40px] h-64 shadow-xl">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.userVideos || []}>
                            <CartesianGrid stroke="#27272a" vertical={false} />
                            <XAxis hide />
                            <YAxis stroke="#52525b" fontSize={10} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{backgroundColor:'#09090b', borderRadius:'15px', border:'none'}} />
                            <Line type="monotone" dataKey="views" stroke="#10b981" strokeWidth={5} dot={{r:6, fill:'#10b981'}} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {!deepData && (
                    <button onClick={handleDeepReport} disabled={isDeepLoading} className="w-full bg-violet-600 hover:bg-violet-500 h-20 rounded-[35px] flex items-center justify-center font-black italic uppercase text-lg shadow-2xl animate-pulse">
                        {isDeepLoading ? <Loader2 className="animate-spin mr-3"/> : <FileText className="mr-3"/>} Получить план на 14 дней
                    </button>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                        <h4 className="text-red-500 font-black uppercase text-[10px] tracking-widest flex items-center ml-4"><AlertTriangle className="mr-2 w-4 h-4"/> Ошибки</h4>
                        {(data.aiAnalysis?.mistakes || []).map((m:string, i:number) => (
                            <div key={i} className="p-8 bg-[#0f0f11] border border-zinc-800 rounded-[40px] space-y-4 shadow-xl group hover:border-red-500/30 transition-all">
                                <p className="text-sm text-zinc-300 leading-relaxed font-bold italic">“ {m} ”</p>
                                <button onClick={()=>handleExplain(m)} className="flex items-center text-[9px] font-black text-red-500 uppercase hover:text-red-400">
                                    <ChevronRight size={14} className="mr-1"/> {explanations[m]?.loading ? "Пишу..." : "Анализ проблемы"}
                                </button>
                                {explanations[m]?.text && (
                                    <div className="mt-4 p-6 bg-black/60 rounded-[28px] border border-red-500/10 text-[12px] text-zinc-400 leading-relaxed animate-in zoom-in-95">{explanations[m].text}</div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="space-y-6">
                        <h4 className="text-emerald-500 font-black uppercase text-[10px] tracking-widest flex items-center ml-4"><Lightbulb className="mr-2 w-4 h-4"/> Стратегия</h4>
                        {(data.aiAnalysis?.tips || []).map((t:string, i:number) => (
                            <div key={i} className="p-8 bg-[#0f0f11] border border-zinc-800 rounded-[40px] space-y-4 shadow-xl group hover:border-emerald-500/30 transition-all">
                                <p className="text-sm text-zinc-300 leading-relaxed font-bold">{t}</p>
                                <button onClick={()=>handleExplain(t)} className="flex items-center text-[9px] font-black text-emerald-500 uppercase hover:text-emerald-400">
                                    <ChevronRight size={14} className="mr-1"/> {explanations[t]?.loading ? "Пишу..." : "Как это сделать?"}
                                </button>
                                {explanations[t]?.text && (
                                    <div className="mt-4 p-6 bg-black/60 rounded-[28px] border border-emerald-500/10 text-[13px] text-zinc-400 leading-relaxed animate-in zoom-in-95">{explanations[t].text}</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {deepData && (
                    <div className="space-y-12 pt-12 border-t border-zinc-800 animate-in slide-in-from-bottom-10 duration-1000">
                        <h3 className="text-3xl font-black text-violet-400 uppercase italic text-center tracking-tighter">План на 14 дней</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {(deepData.contentPlan || []).map((p:any, i:number) => (
                                <div key={i} className="p-8 bg-[#0f0f11] border border-zinc-800 rounded-[45px] space-y-5 shadow-2xl hover:border-violet-500/30 transition-all">
                                    <span className="bg-violet-600 text-white px-5 py-2 rounded-full font-black text-[9px] uppercase tracking-widest">День {p.day}</span>
                                    <p className="text-lg text-zinc-100 font-black leading-tight italic">{p.topic}</p>
                                    <button onClick={()=>handleExplain(p.topic)} className="text-[9px] font-black text-violet-400 uppercase flex items-center"><HelpCircle size={14} className="mr-2"/> Сценарий</button>
                                    {explanations[p.topic]?.text && <div className="mt-3 p-5 bg-black/40 rounded-3xl border border-zinc-800 text-[11px] text-zinc-400 italic">{explanations[p.topic].text}</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="space-y-6">
                    <h3 className="text-xl font-black italic text-zinc-500 uppercase tracking-widest ml-4">Референсы ниши</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {(data.outlierVideos || []).map((v:any, i:number) => (
                            <a key={i} href={v.url} target="_blank" rel="noreferrer" className="group block bg-[#0f0f11] border border-zinc-800 rounded-[35px] overflow-hidden hover:border-emerald-500 transition-all duration-500 shadow-xl">
                                <img src={v.thumbnail} className="aspect-video object-cover w-full group-hover:scale-110 transition-transform duration-700" />
                                <div className="p-5"><p className="text-[11px] font-black line-clamp-2 text-zinc-200 leading-snug">{v.title}</p></div>
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
