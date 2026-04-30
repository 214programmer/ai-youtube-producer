import React, { useState } from 'react';
import { Loader2, Search, Youtube, Zap, AlertTriangle, Lightbulb, ExternalLink, HelpCircle, FileText, DollarSign, TrendingUp, BarChart3, Users, ChevronRight, LayoutGrid } from 'lucide-react';
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
      const res = await fetch('/api/index', { method: 'POST', headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch('/api/index', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'explain', text, customGeminiKey })
      });
      const result = await res.json();
      setExplanations(prev => ({...prev, [text]: {text: result.explanation, loading: false}}));
    } catch (e: any) { setExplanations(prev => ({...prev, [text]: {text: '', loading: false}})); }
  };

  const handleDeepReport = async () => {
    setIsDeepLoading(true);
    try {
      const res = await fetch('/api/index', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'detailed', channelTitle: data?.channelData?.title, niche, customGeminiKey })
      });
      const result = await res.json();
      setDeepData(result);
    } catch (e: any) { alert(e.message); } finally { setIsDeepLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#020203] text-zinc-100 p-4 md:p-12 font-sans selection:bg-emerald-500/20">
      <div className="max-w-7xl mx-auto space-y-12">
        
        <header className="flex items-center justify-between border-b border-zinc-800/40 pb-12">
          <div className="flex items-center space-x-6">
            <div className="bg-emerald-500 p-4 rounded-3xl text-black shadow-[0_0_50px_-10px_rgba(16,185,129,0.5)]"><Youtube size={40} strokeWidth={2.5}/></div>
            <div>
              <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none">AI PRODUCER</h1>
              <p className="text-zinc-500 font-bold text-xs tracking-[0.5em] mt-2">NEXT GEN ANALYTICS</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          {/* Form */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-zinc-900/40 border border-zinc-800 p-10 rounded-[50px] space-y-8 shadow-2xl backdrop-blur-md sticky top-12">
              <div className="space-y-5">
                <input placeholder="Ссылка или @ник" value={channelUrl} onChange={(e)=>setChannelUrl(e.target.value)} className="w-full bg-black/60 border border-zinc-800 rounded-3xl p-5 text-sm outline-none focus:border-emerald-500 transition-all" />
                <input placeholder="Ниша" value={niche} onChange={(e)=>setNiche(e.target.value)} className="w-full bg-black/60 border border-zinc-800 rounded-3xl p-5 text-sm outline-none focus:border-emerald-500 transition-all" />
                <input type="password" placeholder="Ключ Groq" value={customGeminiKey} onChange={(e)=>setCustomGeminiKey(e.target.value)} className="w-full bg-black/60 border border-zinc-800 rounded-3xl p-5 text-sm outline-none focus:border-emerald-500 transition-all" />
              </div>
              <button onClick={handleAnalyze} disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-black font-black py-5 rounded-3xl transition-all shadow-xl shadow-emerald-500/20 uppercase tracking-widest text-[11px]">
                {isLoading ? <Loader2 className="animate-spin" /> : "Запустить сканирование"}
              </button>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-16">
            {data && (
              <>
                {/* Statistics Bento */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {[
                    {l: "ПОДПИСЧИКИ", v: data.channelData?.subscribers, i: <Users/>, c: "text-emerald-400"},
                    {l: "ПРОСМОТРЫ", v: data.channelData?.totalViews, i: <BarChart3/>, c: "text-blue-400"},
                    {l: "КОНКУРЕНТЫ", v: data.outlierVideos?.length, i: <Zap/>, c: "text-yellow-400"}
                  ].map((s, i) => (
                    <div key={i} className="bg-zinc-900/30 border border-zinc-800 p-8 rounded-[45px] relative overflow-hidden group">
                      <div className={`mb-4 ${s.c} opacity-50 group-hover:opacity-100 transition-opacity`}>{s.i}</div>
                      <p className="text-4xl font-black text-white font-mono">{s.v?.toLocaleString()}</p>
                      <p className="text-[10px] text-zinc-500 font-black tracking-widest mt-2 uppercase">{s.l}</p>
                    </div>
                  ))}
                </div>

                {/* HIT ANALYSIS */}
                <div className="bg-gradient-to-br from-emerald-500/10 to-zinc-900 border border-emerald-500/20 p-12 rounded-[60px] shadow-2xl space-y-8">
                    <h3 className="text-3xl font-black text-emerald-400 italic uppercase flex items-center tracking-tighter"><Zap className="mr-4 fill-emerald-500"/> РАЗБОР ВАШЕГО ХИТА</h3>
                    <p className="text-zinc-300 text-xl leading-relaxed italic whitespace-pre-line border-l-4 border-emerald-500/30 pl-10 font-medium">
                        {data.aiAnalysis?.bestVideoAnalysis}
                    </p>
                </div>

                {/* GRAPH */}
                <div className="bg-zinc-900/40 border border-zinc-800 p-12 rounded-[60px] h-[400px] shadow-2xl">
                    <h4 className="text-[11px] font-black text-zinc-500 tracking-[0.4em] mb-10 uppercase">Динамика последних видео</h4>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.userVideos || []}>
                            <CartesianGrid stroke="#18181b" vertical={false} />
                            <XAxis hide />
                            <YAxis stroke="#333" fontSize={10} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{backgroundColor:'#000', borderRadius:'25px', border:'none', padding:'20px'}} />
                            <Line type="monotone" dataKey="views" stroke="#10b981" strokeWidth={8} dot={{r:10, fill:'#10b981', strokeWidth:0}} activeDot={{r:12, fill:'#fff'}} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* DEEP ACTION */}
                {!deepData && (
                    <button onClick={handleDeepReport} disabled={isDeepLoading} className="w-full bg-violet-600 hover:bg-violet-500 h-28 rounded-[50px] flex items-center justify-center font-black italic uppercase text-2xl shadow-2xl animate-pulse transition-all active:scale-95">
                        {isDeepLoading ? <Loader2 className="animate-spin mr-5 w-10 h-10"/> : <LayoutGrid className="mr-5 w-10 h-10"/>} СГЕНЕРИРОВАТЬ СТРАТЕГИЮ
                    </button>
                )}

                {/* MISTAKES & TIPS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div className="space-y-8">
                        <h4 className="text-red-500 font-black uppercase text-[12px] tracking-[0.5em] ml-8">Крит. Ошибки</h4>
                        {data.aiAnalysis.mistakes.map((m:string, i:number) => (
                            <div key={i} className="p-10 bg-zinc-900/30 border border-zinc-800 rounded-[50px] space-y-6 shadow-xl hover:border-red-500/30 transition-all">
                                <p className="text-lg text-zinc-100 font-bold leading-tight">“ {m} ”</p>
                                <button onClick={()=>handleExplain(m)} className="flex items-center text-[10px] font-black text-red-500 uppercase tracking-widest bg-red-500/10 px-6 py-3 rounded-full hover:bg-red-500/20">
                                    Почему это важно?
                                </button>
                                {explanations[m]?.text && (
                                    <div className="p-8 bg-black/60 rounded-[40px] border border-red-500/10 text-sm text-zinc-400 leading-relaxed animate-in zoom-in-95">{explanations[m].text}</div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="space-y-8">
                        <h4 className="text-emerald-500 font-black uppercase text-[12px] tracking-[0.5em] ml-8">Стратегия Роста</h4>
                        {data.aiAnalysis.tips.map((t:string, i:number) => (
                            <div key={i} className="p-10 bg-zinc-900/30 border border-zinc-800 rounded-[50px] space-y-6 shadow-xl hover:border-emerald-500/30 transition-all">
                                <p className="text-lg text-zinc-100 font-bold leading-tight">{t}</p>
                                <button onClick={()=>handleExplain(t)} className="flex items-center text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-6 py-3 rounded-full hover:bg-emerald-500/20">
                                    Как внедрить?
                                </button>
                                {explanations[t]?.text && (
                                    <div className="p-8 bg-black/60 rounded-[40px] border border-emerald-500/10 text-sm text-zinc-400 leading-relaxed animate-in zoom-in-95">{explanations[t].text}</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* DEEP RESULTS */}
                {deepData && (
                    <div className="space-y-16 pt-16 border-t border-zinc-800 animate-in slide-in-from-bottom-10 duration-1000">
                        <h3 className="text-5xl font-black text-violet-400 uppercase italic text-center tracking-tighter">План на 14 дней</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {deepData.contentPlan.map((p:any, i:number) => (
                                <div key={i} className="p-10 bg-zinc-900 border border-zinc-800 rounded-[55px] space-y-6 shadow-2xl hover:border-violet-500/40 transition-all group">
                                    <span className="bg-violet-600 text-white px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-tighter">ДЕНЬ {p.day}</span>
                                    <p className="text-2xl text-zinc-100 font-black leading-none italic group-hover:text-violet-400 transition-colors">{p.topic}</p>
                                    <button onClick={()=>handleExplain(p.topic)} className="text-[10px] font-black text-violet-400 uppercase flex items-center hover:text-white"><HelpCircle size={16} className="mr-2"/> Сценарий дня</button>
                                    {explanations[p.topic]?.text && <div className="p-6 bg-black/40 rounded-[35px] border border-zinc-800 text-[13px] text-zinc-400 italic">{explanations[p.topic].text}</div>}
                                </div>
                            ))}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="bg-zinc-900/50 border border-zinc-800 p-12 rounded-[60px] space-y-8 shadow-2xl">
                                <h4 className="text-emerald-500 font-black uppercase text-[12px] tracking-widest flex items-center"><DollarSign className="mr-3 w-6 h-6"/> Масштабирование доходов</h4>
                                <div className="space-y-5">
                                    {deepData.monetization.map((m:string, idx:number) => (
                                        <div key={idx} className="p-5 bg-black/40 rounded-3xl border border-zinc-800/50 flex items-center"><div className="w-2 h-2 bg-emerald-500 rounded-full mr-5 shadow-[0_0_10px_#10b981]"></div><p className="text-sm text-zinc-400 font-bold">{m}</p></div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-zinc-900/50 border border-zinc-800 p-12 rounded-[60px] space-y-8 shadow-2xl">
                                <h4 className="text-blue-400 font-black uppercase text-[12px] tracking-widest flex items-center"><Search className="mr-3 w-6 h-6"/> SEO Протокол</h4>
                                <div className="flex flex-wrap gap-3">
                                    {deepData.seoPack.recommendedTags.map((tag:string, idx:number)=>(
                                        <span key={idx} className="bg-zinc-950 border border-zinc-800 px-6 py-3 rounded-full text-[12px] text-zinc-400 font-mono hover:border-blue-500/40 transition-colors uppercase font-bold tracking-tighter cursor-default">{tag}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* REFERENCES */}
                <div className="space-y-8">
                    <h3 className="text-2xl font-black italic text-zinc-500 uppercase tracking-[0.3em] ml-10">Референсы ниши</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        {data.outlierVideos.map((v:any, i:number) => (
                            <a key={i} href={v.url} target="_blank" rel="noreferrer" className="group block bg-zinc-900 border border-zinc-800 rounded-[45px] overflow-hidden hover:border-emerald-500 transition-all duration-500 shadow-2xl">
                                <div className="relative overflow-hidden">
                                  <img src={v.thumbnail} className="aspect-video object-cover w-full group-hover:scale-110 transition-transform duration-700" />
                                  <div className="absolute inset-0 bg-emerald-500/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><ExternalLink size={40} className="text-white drop-shadow-2xl" /></div>
                                </div>
                                <div className="p-8"><p className="text-sm font-black line-clamp-2 text-zinc-100 leading-snug">{v.title}</p></div>
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
