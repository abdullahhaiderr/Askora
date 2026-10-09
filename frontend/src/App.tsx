import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, HeartHandshake, ShieldCheck } from 'lucide-react';
import AppHeader, { Brand, type Page } from './components/AppHeader';
import ChatWindow from './components/ChatWindow';
import FAQBrowser from './components/FAQBrowser';
import { IntroCards, WelcomeSection } from './components/WelcomeSection';

export default function App() {
 const [page,setPage] = useState<Page>('home');
 const [dark,setDark] = useState(()=>typeof window!=='undefined' && (localStorage.getItem('askora-theme') === 'dark' || (localStorage.getItem('askora-theme')===null && window.matchMedia('(prefers-color-scheme: dark)').matches)));
 const [forwarded,setForwarded]=useState<string|null>(null);
 useEffect(()=>{document.documentElement.classList.toggle('dark',dark);localStorage.setItem('askora-theme',dark?'dark':'light');},[dark]);
 const navigate=useCallback((target:Page)=>{setPage(target);window.scrollTo({top:0,behavior:'smooth'});},[]);
 const ask=(question:string)=>{setForwarded(question);navigate('chat');};
 return <div className="min-h-screen bg-base text-ink transition-colors duration-200">
  <AppHeader page={page} onNavigate={navigate} dark={dark} onToggle={()=>setDark(x=>!x)}/>
  <main className="container-wrap">
   {page==='knowledge'?<FAQBrowser onAsk={ask}/>:
    page==='home'?<><div className="pt-10 sm:pt-14 lg:pt-16 pb-8"><WelcomeSection onStart={()=>navigate('chat')}/></div><div className="grid lg:grid-cols-[1fr_1.52fr] gap-8 lg:gap-12 items-start pb-10"><div className="hidden lg:block pt-10"><div className="eyebrow">HOW ASKORA WORKS</div><h2 className="text-2xl sm:text-[28px] leading-tight tracking-[-.045em] font-semibold mt-4">A better way to find <span className="text-teal-600 dark:text-teal-400">what matters.</span></h2><p className="text-muted leading-7 text-[13px] mt-4">Powered by careful text processing and similarity matching. If a question isn't in our knowledge base, Askora will tell you rather than guess.</p><div className="h-px bg-line my-7"/><div className="flex gap-3 items-start"><span className="small-icon !h-10 !w-10"><ShieldCheck size={19}/></span><div><h3 className="text-[13px] text-ink font-semibold">Clarity over guesswork</h3><p className="text-muted text-[12px] leading-6 mt-1">Answers stay tied to curated FAQ entries.</p></div></div><button onClick={()=>navigate('knowledge')} className="mt-7 text-teal-600 dark:text-teal-400 text-[12px] font-semibold inline-flex items-center gap-2">Explore all answers <ArrowRight size={15}/></button></div><ChatWindow forwardedQuestion={forwarded} onConsumed={()=>setForwarded(null)}/></div><div className="pb-16 lg:hidden"><IntroCards onGo={navigate}/></div></>:
    <><div className="pt-10 sm:pt-14 pb-7"><div className="eyebrow">YOUR CONVERSATION SPACE</div><h1 className="section-title !mt-3">Ask away. <em>We've got you.</em></h1><p className="text-sm text-muted mt-3">Natural questions, clear responses from a curated knowledge base.</p></div><div className="max-w-[950px] mx-auto pb-16"><ChatWindow forwardedQuestion={forwarded} onConsumed={()=>setForwarded(null)}/></div></>}
  </main>
  <footer className="border-t border-line"><div className="container-wrap py-7 flex flex-col sm:flex-row justify-between gap-5 sm:items-center"><div className="flex items-center gap-3"><Brand compact/><div className="flex flex-col gap-0.5"><span className="text-[12px] font-semibold text-ink">Askora</span><span className="text-[11px] text-muted">Good questions deserve clear answers.</span></div></div><div className="text-[11px] text-muted flex flex-wrap items-center gap-4"><span className="flex gap-1.5 items-center"><HeartHandshake size={13}/> Built with care, not guesswork</span><button className="hover:text-teal-600" onClick={()=>navigate('knowledge')}>Knowledge base</button><span>© {new Date().getFullYear()} Askora</span></div></div></footer>
 </div>;
}
