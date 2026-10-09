import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Check, CheckCheck, ChevronRight, CircleHelp, Clipboard, LoaderCircle, MessageSquare, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api, type ChatResponse } from '../lib/api';

type Message = { id: number; role: 'user'|'assistant'; body: string; time: Date; response?: ChatResponse; error?: boolean };
const activeSuggestions = ['How can I reset my password?', 'What are your working hours?', 'How can I track my order?', 'How can I contact support?'];
const initial: Message = { id: 0, role:'assistant', body: "Hello there! I'm Askora, your guide to Northstar Supply's store policies, orders, payments, and account questions. I match what you ask against our verified FAQ collection. What can I help you with?", time: new Date() };
const formatTime = (date: Date) => date.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
function BotAvatar() { return <div className="w-9 h-9 rounded-[13px] bg-teal-600 text-white flex items-center justify-center shrink-0"><MessageSquare size={17}/></div> }
function ChatMessage({ message, onSuggestion }: {message: Message; onSuggestion: (q: string)=>void }) {
  const [copied,setCopied] = useState(false);
  async function copy() { try { await navigator.clipboard.writeText(message.body); setCopied(true); window.setTimeout(()=>setCopied(false),1800); } catch { /* clipboard may be blocked */ } }
  return <div className={`flex gap-3 animate-message ${message.role === 'user' ? 'justify-end' : ''}`}>
    {message.role==='assistant' && <BotAvatar/>}
    <div className={`max-w-[min(100%,620px)] min-w-0 ${message.role === 'user' ? 'ml-8' : 'mr-0'}`}>
      {message.role==='assistant' && <div className="text-[12px] font-semibold text-ink mb-1.5">Askora <span className="text-muted ml-2 font-normal">{formatTime(message.time)}</span></div>}
      <div className={`${message.role === 'user' ? 'bg-teal-600 text-white rounded-[18px] rounded-tr-[5px] px-[18px] py-3.5' : `border border-line bg-surface rounded-[18px] rounded-tl-[5px] px-[18px] py-4 ${message.error ? 'border-rose-300' : ''}`} break-words text-[13px] sm:text-[14px] leading-[1.8]`}>
        <div className="prose-chat"><ReactMarkdown components={{a:({ href,children })=><a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2">{children}</a>}}>{message.body}</ReactMarkdown></div>
        {message.response && !message.response.fallback && <div className="mt-3 pt-3 border-t border-line text-[11px] text-muted flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1 text-teal-600 dark:text-teal-400 font-semibold"><CheckCheck size={13}/> Matched FAQ</span><span>·</span><span>{message.response.category}</span><span>·</span><span className="capitalize">{message.response.relevance && message.response.relevance >= .75 ? 'Strong match' : 'Relevant result'}</span></div>}
        {message.response?.fallback && <div className="mt-3 flex flex-wrap gap-2">{message.response.suggestions.slice(0,3).map(q=><button key={q} onClick={()=>onSuggestion(q)} className="chip">{q}<ChevronRight size={12}/></button>)}</div>}
      </div>
      {message.role === 'assistant' ? <button className="inline-flex items-center gap-1.5 text-[11px] text-muted hover:text-teal-600 mt-2 ml-1" onClick={copy} aria-label="Copy answer">{copied ? <Check size={12}/> : <Clipboard size={12}/>} {copied ? 'Copied' : 'Copy answer'}</button> : <div className="mt-1.5 text-right text-[11px] text-muted">{formatTime(message.time)}</div>}
    </div>
  </div>;
}
export default function ChatWindow({ forwardedQuestion, onConsumed }: { forwardedQuestion?: string|null; onConsumed?: ()=>void }) {
  const [messages, setMessages] = useState<Message[]>([initial]);
  const [draft,setDraft] = useState('');
  const [pending,setPending] = useState(false);
  const scrollArea = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const busy = useRef(false);
  const counter = useRef(0);
  const sendRef = useRef<(q: string)=>void>(()=>{});
  const send = async (raw: string) => {
    const value = raw.trim();
    if (!value || busy.current || value.length > 500) return;
    busy.current = true; setPending(true); setDraft('');
    setMessages(prev => [...prev, { id: ++counter.current, role:'user', body:value, time:new Date() }]);
    try {
      const response = await api.chat(value);
      setMessages(prev=>[...prev,{id:++counter.current,role:'assistant',body:response.answer,time:new Date(),response}]);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'An unexpected error occurred.';
      
      setMessages(prev=>[...prev,{id:++counter.current,role:'assistant',body:`I couldn't complete that request. ${message} Please try again.`, time:new Date(),error:true}]);
    } finally { busy.current=false;setPending(false);textarea.current?.focus(); }
  };
  sendRef.current = send;
  useEffect(()=>{const element=scrollArea.current;if(element)element.scrollTo({top:element.scrollHeight,behavior:messages.length > 2?'smooth':'instant'});},[messages,pending]);
  useEffect(()=>{if(forwardedQuestion){sendRef.current(forwardedQuestion);onConsumed?.();}},[forwardedQuestion,onConsumed]);
  const reset = ()=> { if (pending) return; setMessages([{...initial,time:new Date()}]);setDraft('');};
  return <section className="chat-shell" aria-label="Askora chatbot" id="chat-panel">
    <div className="flex flex-wrap justify-between gap-3 items-center px-5 sm:px-7 py-4 border-b border-line bg-surface"><div className="flex items-center gap-3"><BotAvatar/><div><div className="text-[13px] font-semibold text-ink">Askora assistant</div><div className="inline-flex items-center gap-1.5 mt-0.5 text-[11px] text-muted"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500"/>Ready to help · FAQ powered</div></div></div><button disabled={pending} className="text-muted hover:text-ink disabled:opacity-40 text-[11px] font-medium inline-flex items-center gap-2 border border-line rounded-full px-3 py-2" onClick={reset}><RotateCcw size={12}/> Clear conversation</button></div>
    <div ref={scrollArea} className="relative h-[435px] sm:h-[465px] overflow-y-auto px-4 sm:px-7 py-6 flex flex-col gap-6 scroll-smooth bg-panel" role="log" aria-live="polite" aria-relevant="additions text">
      <div className="flex justify-center"><span className="border border-line rounded-full px-3 py-1 text-[10px] text-muted bg-surface">Today · Conversation stays in this session</span></div>
      {messages.map(m=><ChatMessage key={m.id} message={m} onSuggestion={send}/>)}
      {messages.length===1 && <div className="ml-11 max-w-[540px]"><div className="text-muted uppercase tracking-[.11em] text-[10px] font-semibold mb-3">You can start with</div><div className="flex flex-wrap gap-2">{activeSuggestions.map(q=><button key={q} className="chip" disabled={pending} onClick={()=>send(q)}>{q}<ChevronRight size={13}/></button>)}</div></div>}
      {pending && <div className="flex items-center gap-3"><BotAvatar/><div className="bg-surface border border-line rounded-2xl px-4 py-3 flex items-center gap-1.5" aria-label="Askora is typing"><span className="dot"/><span className="dot"/><span className="dot"/></div></div>}

    </div>
    <div className="px-4 sm:px-6 pt-4 pb-4 border-t border-line bg-surface">
      <div className="flex items-end gap-2 rounded-2xl border border-line bg-base px-4 py-2.5 focus-within:border-teal-400 transition-colors"><textarea ref={textarea} value={draft} onChange={e=>setDraft(e.target.value.slice(0,500))} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void send(draft);}}} rows={2} className="w-full min-w-0 resize-none bg-transparent outline-none text-ink text-[13px] leading-6 py-1.5 max-h-28 placeholder:text-muted" placeholder="Ask me anything about orders, returns, payments..." aria-label="Your question" disabled={pending}/><button onClick={()=>void send(draft)} disabled={pending||!draft.trim()} className="rounded-xl bg-teal-600 text-white h-10 w-10 inline-flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-teal-700 transition-colors" aria-label="Send message">{pending?<LoaderCircle size={18} className="animate-spin"/>:<ArrowUp size={18}/>}</button></div>
      <div className="mt-2.5 flex items-center justify-between gap-3 text-muted text-[10px] leading-4"><span className="inline-flex items-center gap-1.5"><CircleHelp size={12}/> Based on our knowledge base, not live human support.</span><span className="whitespace-nowrap">{draft.length}/500</span></div>
    </div>
  </section>;
}
