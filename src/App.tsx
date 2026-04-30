import React, { useState } from 'react';
import { Loader2, Search, Youtube, Zap, AlertTriangle, Lightbulb, ExternalLink, HelpCircle, FileText, DollarSign, TrendingUp, BarChart3, Users } from 'lucide-react';
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
    } catch (e: any) { alert("Ошибка анализа: " + e.message); } finally { setIsLoading(false); }
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
    } catch (e: any) { alert("Ошибка ИИ: " + e.message); setExplanations(prev => ({...prev, [text]: {text: '', loading: false}})); }
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
    } catch (e: any) { alert("Ошибка плана: " + e.message); } finally { setIsDeepLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 p-4 md:p-10 font-sans leading-relaxed">
      <div className="max-w-6xl mx-auto space-y-10">
        
        <header className="flex items-center space-x-4 border-b border-zinc-800 pb-8">
          <div className="bg-emerald-500 p-2 rounded-xl text-black shadow-lg shadow-emerald-500/20"><Youtube size={32} /></div>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">AI PRODUCER <span className="text-emerald-500">ULTRA</span></h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-1 space-y-4 bg-zinc-900 border border-zinc-800 p-6 rounded-[35px] h-fit shadow-2xl">
            <input placeholder="Ссылка на канал" value={channelUrl} onChange={(e)=>setChannelUrl(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm outline-none focus:border-emerald-500 transition-all" />
            <input placeholder="Ниша" value={niche} onChange={(e)=>setNiche(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm outline-none focus:border-emerald-500 transition-all" />
            <input type="password" placeholder="Ключ Groq (gsk_...)" value={customGeminiKey} onChange={(e)=>setCustomGeminiKey(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm outline-none focus:border-emerald-500 transition-all" />
            <button onClick={handleAnalyze} disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-black font-black py-4 rounded-2xl flex items-center justify-center transition-all shadow-xl shadow-emerald-500/10 uppercase">
              {isLoading ? <Loader2 className="animate-spin" /> : "Запустить аудит"}
            </button>
          </div>

          <div className="lg:col-span-3 space-y-10">
            {data && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    {l: "Подписчики", v: data.channelData?.subscribers, i: <Users size={16}/>},
                    {l: "Просмотры", v: data.channelData?.totalViews, i: <BarChart3 size={16}/>},
                    {l: "Конкуренты", v: data.outlierVideos?.length, i: <Zap size={16}/>}
                  ].map((s, i) => (
                    <div key={i} className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl text-center shadow-lg">
                      <div className="flex justify-center text-emerald-500 mb-2">{s.i}</div>
                      <p className="text-xl font-black text-white">{s.v?.toLocaleString() || 0}</p>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">{s.l}</p>
                    </div>
                  ))}
                </div>

                <div className="p-8 bg-emerald-500/5 border border-emerald-500/20 rounded-[40px] shadow-2xl relative">
                    <h3 className="text-2xl font-black text-emerald-400 italic mb-4 uppercase flex items-center tracking-tighter"><Zap className="mr-3 fill-emerald-500 w-5 h-5"/> РАЗБОР ВАШЕГО ХИТА</h3>
                    <p className="text-zinc-300 italic whitespace-pre-line">{data.aiAnalysis?.bestVideoAnalysis || "Анализ недоступен"}</p>
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
                    <button onClick={handleDeepReport} disabled={isDeepLoading} className="w-full bg-violet-600 hover:bg-violet-500 h-20 rounded-[35px] flex items-center justify-center font-black italic uppercase text-lg animate-pulse shadow-2xl shadow-violet-900/20 border-t border-violet-400/20">
                        {isDeepLoading ? <Loader2 className="animate-spin mr-3"/> : <FileText className="mr-3"/>} Получить план на 14 дней
                    </button>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h4 className="text-red-500 font-black uppercase text-[10px] tracking-widest flex items-center"><AlertTriangle className="mr-2 w-4 h-4"/> Ошибки</h4>
                        {(data.aiAnalysis?.mistakes || []).map((m:string, i:number) => (
                            <div key={i} className="p-5 bg-[#18181b] border border-zinc-800 rounded-3xl space-y-3 shadow-lg">
                                <p className="text-sm text-zinc-300">“ {m} ”</p>
                                <button onClick={()=>handleExplain(m)} className="text-[9px] font-black text-red-500 uppercase">
                                    {explanations[m]?.loading ? "Генерирую..." : "Подробнее"}
                                </button>
                                {explanations[m]?.text && <div className="text-[12px] text-zinc-400 bg-black/40 p-4 rounded-2xl border border-red-500/10 animate-in fade-in">{explanations[m].text}</div>}
                            </div>
                        ))}
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-emerald-500 font-black uppercase text-[10px] tracking-widest flex items-center"><Lightbulb className="mr-2 w-4 h-4"/> Стратегия</h4>
                        {(data.aiAnalysis?.tips || []).map((t:string, i:number) => (
                            <div key={i} className="p-5 bg-[#18181b] border border-zinc-800 rounded-3xl space-y-3 shadow-lg">
                                <p className="text-sm text-zinc-300">{t}</p>
                                <button onClick={()=>handleExplain(t)} className="text-[9px] font-black text-emerald-500 uppercase">
                                    {explanations[t]?.loading ? "Генерирую..." : "Как внедрить?"}
                                </button>
                                {explanations[t]?.text && <div className="text-[12px] text-zinc-400 bg-black/40 p-4 rounded-2xl border border-emerald-500/10 animate-in fade-in">{explanations[t].text}</div>}
                            </div>
                        ))}
                    </div>
                </div>

                {deepData && (
                    <div className="space-y-10 pt-10 border-t border-zinc-800 animate-in slide-in-from-bottom-10">
                        <div className="space-y-4">
                            <h3 className="text-3xl font-black text-violet-400 uppercase italic text-center tracking-tighter">План развития</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {(deepData?.contentPlan || []).map((p:any, i:number) => (
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
                                <h4 className="text-emerald-500 font-black uppercase text-[10px] tracking-widest flex items-center font-mono">Монетизация</h4>
                                {(deepData?.monetization || []).map((m:string, idx:number) => <p key={idx} className="text-sm text-zinc-400 border-b border-zinc-800/50 pb-3 leading-relaxed">• {m}</p>)}
                            </div>
                            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[40px] space-y-4 shadow-2xl">
                                <h4 className="text-blue-400 font-black uppercase text-[10px] tracking-widest flex items-center font-mono">SEO Теги</h4>
                                <div className="flex flex-wrap gap-2">{(deepData?.seoPack?.recommendedTags || []).map((tag:string, idx:number)=><span key={idx} className="bg-black border border-zinc-800 px-3 py-1.5 rounded-xl text-[10px] text-zinc-400 font-mono">{tag}</span>)}</div>
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
