import React, { useState } from 'react';
import { Loader2, Search, Youtube, Zap, AlertTriangle, Lightbulb, HelpCircle, FileText } from 'lucide-react';

export default function App() {
  const [channelUrl, setChannelUrl] = useState('');
  const [niche, setNiche] = useState('');
  const [customGeminiKey, setCustomGeminiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeepLoading, setIsDeepLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [explanations, setExplanations] = useState<Record<string, {text: string, loading: boolean}>>({});

  const handleAnalyze = async () => {
    setIsLoading(true); setData(null); setExplanations({});
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
      setData({ ...data, aiAnalysis: { ...data.aiAnalysis, contentPlan: result.contentPlan } });
    } catch (e: any) { alert(e.message); } finally { setIsDeepLoading(false); }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 p-4 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-10">
        <header className="flex items-center space-x-3 border-b border-zinc-800 pb-8">
          <Youtube className="w-10 h-10 text-emerald-500" />
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">AI PRODUCER <span className="text-emerald-500">FINAL</span></h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1 space-y-4 bg-zinc-900 border border-zinc-800 p-6 rounded-[35px] h-fit shadow-2xl">
            <input placeholder="Ссылка на канал" value={channelUrl} onChange={(e)=>setChannelUrl(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm outline-none" />
            <input placeholder="Ниша" value={niche} onChange={(e)=>setNiche(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm outline-none" />
            <input type="password" placeholder="Ключ Groq" value={customGeminiKey} onChange={(e)=>setCustomGeminiKey(e.target.value)} className="w-full bg-black border border-zinc-800 rounded-2xl p-4 text-sm outline-none" />
            <button onClick={handleAnalyze} disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-black font-black py-4 rounded-2xl flex items-center justify-center">
              {isLoading ? <Loader2 className="animate-spin" /> : "Запустить анализ"}
            </button>
          </div>

          <div className="lg:col-span-3 space-y-10">
            {data && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                  <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl text-center"><p className="text-2xl font-black text-emerald-400">{data.channelData.subscribers.toLocaleString()}</p><p className="text-[10px] text-zinc-500 uppercase">Подписчиков</p></div>
                  <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl text-center"><p className="text-2xl font-black text-emerald-400">{data.channelData.totalViews.toLocaleString()}</p><p className="text-[10px] text-zinc-500 uppercase">Просмотров</p></div>
                </div>

                <div className="p-8 bg-emerald-500/5 border border-emerald-500/20 rounded-[40px]">
                    <h3 className="text-2xl font-black text-emerald-400 italic mb-4 flex items-center"><Zap className="mr-3 fill-emerald-500"/> РАЗБОР ХИТА</h3>
                    <p className="text-zinc-300 italic">{data.aiAnalysis.bestVideoAnalysis}</p>
                </div>

                {!data.aiAnalysis.contentPlan && (
                    <button onClick={handleDeepReport} disabled={isDeepLoading} className="w-full bg-violet-600 hover:bg-violet-500 h-16 rounded-[30px] flex items-center justify-center font-black italic uppercase">
                        {isDeepLoading ? <Loader2 className="animate-spin mr-3"/> : <FileText className="mr-3"/>} Получить план на 14 дней
                    </button>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h4 className="text-red-500 font-black uppercase text-xs">Ошибки</h4>
                        {data.aiAnalysis.mistakes.map((m:string, i:number) => (
                            <div key={i} className="p-5 bg-[#18181b] border border-zinc-800 rounded-3xl space-y-3">
                                <p className="text-sm text-zinc-300">“ {m} ”</p>
                                <button onClick={()=>handleExplain(m)} className="text-[10px] font-black text-red-500 uppercase">
                                    {explanations[m]?.loading ? "Генерирую..." : "Подробнее"}
                                </button>
                                {explanations[m]?.text && <div className="text-[12px] text-zinc-400 bg-black/40 p-4 rounded-2xl border border-red-500/10">{explanations[m].text}</div>}
                            </div>
                        ))}
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-emerald-500 font-black uppercase text-xs">Советы</h4>
                        {data.aiAnalysis.tips.map((t:string, i:number) => (
                            <div key={i} className="p-5 bg-[#18181b] border border-zinc-800 rounded-3xl space-y-3">
                                <p className="text-sm text-zinc-300">{t}</p>
                                <button onClick={()=>handleExplain(t)} className="text-[10px] font-black text-emerald-500 uppercase">
                                    {explanations[t]?.loading ? "Генерирую..." : "Как это внедрить?"}
                                </button>
                                {explanations[t]?.text && <div className="text-[12px] text-zinc-400 bg-black/40 p-4 rounded-2xl border border-emerald-500/10">{explanations[t].text}</div>}
                            </div>
                        ))}
                    </div>
                </div>

                {data.aiAnalysis.contentPlan && (
                    <div className="space-y-6 pt-10 border-t border-zinc-800">
                        <h3 className="text-2xl font-black text-violet-400 italic text-center uppercase">План на 14 дней</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {data.aiAnalysis.contentPlan.map((p:any, i:number) => (
                                <div key={i} className="p-6 bg-zinc-900 border border-zinc-800 rounded-[30px]">
                                    <span className="bg-violet-600 text-white px-3 py-1 rounded-full font-black text-[10px]">ДЕНЬ {p.day}</span>
                                    <p className="text-sm mt-4 text-zinc-200">{p.topic}</p>
                                </div>
                            ))}
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
