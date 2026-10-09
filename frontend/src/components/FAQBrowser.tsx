import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { AlertCircle, ArrowRight, BookOpen, ChevronDown, CirclePlus, FileQuestion, KeyRound, LoaderCircle, Pencil, Search, Shield, Trash2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { api, type FAQ } from '../lib/api';
const empty: FAQ = { id:'', question:'', answer:'', alternatives:[], category:'Support' };
type EditorMode = 'create'|'edit';
function FAQEditor({ mode, faq, keyValue, onDone, onCancel }: { mode:EditorMode; faq:FAQ; keyValue:string; onDone:()=>void; onCancel:()=>void }) {
 const [form,setForm] = useState<FAQ>(faq);
 const [alternatives, setAlternatives] = useState(faq.alternatives.join('\n'));
 const [saving,setSaving] = useState(false);
 const [error,setError] = useState('');
 const set = (field: keyof FAQ, value: string) => setForm(f=>({...f,[field]:value}));
 async function submit(e: FormEvent<HTMLFormElement>) {
  e.preventDefault(); setSaving(true);setError('');
  try {
   const updated = {...form, id:form.id.trim().toLowerCase(), alternatives:alternatives.split('\n').map(x=>x.trim()).filter(Boolean)};
   if(mode==='create') await api.add(updated,keyValue); else await api.edit(updated,keyValue);
   onDone();
  } catch(ex) { setError(ex instanceof Error ? ex.message : 'Unable to save FAQ'); }
  finally { setSaving(false); }
 }
 return <form onSubmit={submit} className="border border-teal-400/50 rounded-2xl bg-surface p-5 md:p-6 space-y-4" aria-label={mode==='create'?'Create FAQ':'Edit FAQ'}>
   <div className="flex justify-between items-center"><h3 className="font-semibold text-ink">{mode==='create'?'Add a new FAQ':'Edit FAQ'}</h3><button type="button" onClick={onCancel} className="icon-button" aria-label="Close editor"><X size={17}/></button></div>
   <div className="grid sm:grid-cols-2 gap-3"><label className="input-label">FAQ ID<input required pattern="[a-z0-9][a-z0-9-]{1,39}" disabled={mode==='edit'} value={form.id} onChange={e=>set('id',e.target.value)} placeholder="shipping-09" className="field"/></label><label className="input-label">Category<input required value={form.category} maxLength={70} onChange={e=>set('category',e.target.value)} className="field"/></label></div>
   <label className="input-label">Question<input required minLength={5} maxLength={240} value={form.question} onChange={e=>set('question',e.target.value)} className="field" placeholder="How can I ...?"/></label>
   <label className="input-label">Answer <span className="font-normal text-muted">(Markdown supported)</span><textarea required minLength={5} maxLength={3000} rows={4} value={form.answer} onChange={e=>set('answer',e.target.value)} className="field resize-y" placeholder="The verified answer ..."/></label>
   <label className="input-label">Alternative phrasings <span className="font-normal text-muted">(one per line, maximum 8)</span><textarea rows={3} value={alternatives} onChange={e=>setAlternatives(e.target.value)} className="field resize-y" placeholder="Can I ...?"/></label>
   {error && <p role="alert" className="text-rose-600 text-xs">{error}</p>}
   <div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button><button disabled={saving} className="btn-primary" type="submit">{saving&&<LoaderCircle size={15} className="animate-spin"/>}{mode==='create'?'Add FAQ':'Save changes'}</button></div>
 </form>;
}
export default function FAQBrowser({ onAsk }: {onAsk:(question:string)=>void}) {
 const [faqs,setFaqs] = useState<FAQ[]>([]);
 const [query,setQuery] = useState('');
 const [filter,setFilter] = useState('All topics');
 const [expanded,setExpanded] = useState<string|null>(null);
 const [loading,setLoading] = useState(true);
 const [error,setError] = useState('');
 const [admin,setAdmin] = useState(false);
 const [key,setKey] = useState('');
 const [editor,setEditor] = useState<{mode:EditorMode;faq:FAQ}|null>(null);
 const [busy,setBusy] = useState<string|null>(null);
 const refresh = useCallback(async()=>{setLoading(true);setError('');try{const data=await api.faqs();setFaqs(data.faqs);}catch(ex){setError(ex instanceof Error?ex.message:'Could not fetch FAQs');}finally{setLoading(false);}},[]);
 useEffect(()=>{void refresh();},[refresh]);
 const categories = useMemo(()=>['All topics',...new Set(faqs.map(f=>f.category))],[faqs]);
 const filtered = useMemo(()=>faqs.filter(f=>{const matchesTopic=filter==='All topics'||f.category===filter; const term=query.trim().toLocaleLowerCase();return matchesTopic&&(!term||[f.question,f.answer,f.category,...f.alternatives].join(' ').toLocaleLowerCase().includes(term));}),[faqs,filter,query]);
 async function remove(faq: FAQ) {if(!window.confirm(`Delete “${faq.question}”? This cannot be undone.`))return;setBusy(faq.id);setError('');try{await api.remove(faq.id,key);if(expanded===faq.id)setExpanded(null);await refresh();}catch(ex){setError(ex instanceof Error?ex.message:'Delete failed');}finally{setBusy(null);}}
 return <section className="pb-20" id="knowledge-base">
   <div className="max-w-[650px] pt-9 sm:pt-12"><div className="eyebrow"><BookOpen size={15}/> THE KNOWLEDGE BASE</div><h1 className="section-title">Answers, all in <em>one place.</em></h1><p className="mt-4 text-muted text-sm leading-7">Explore the questions Askora knows how to answer. Every response in chat is drawn from this collection.</p></div>
   <div className="mt-10 border border-line rounded-[22px] bg-surface overflow-hidden"><div className="px-5 sm:px-7 py-6 flex flex-wrap gap-4 items-center justify-between border-b border-line"><div><div className="text-[15px] font-semibold text-ink">Browse frequently asked questions</div><div className="mt-1 text-[12px] text-muted">{faqs.length} curated questions across {Math.max(0,categories.length-1)} categories</div></div><button onClick={()=>setAdmin(!admin)} className="btn-secondary text-xs"><KeyRound size={14}/>{admin?'Close admin tools':'Manage FAQs'}</button></div>
   {admin && <div className="border-b border-line p-5 sm:p-6 bg-panel"><div className="flex flex-col sm:flex-row sm:items-end gap-3"><label className="input-label flex-1">Administrator access key<input className="field" autoComplete="off" type="password" value={key} onChange={e=>setKey(e.target.value)} placeholder="Enter the server admin key"/></label><button className="btn-primary" disabled={!key} onClick={()=>setEditor({mode:'create',faq:empty})}><CirclePlus size={15}/> Create FAQ</button></div><p className="text-[11px] text-muted mt-2 leading-5"><Shield size={12} className="inline mr-1"/>Your key remains in this page's memory and is not saved in browser storage. Server-side authorization is required for changes.</p>{editor&&<div className="mt-5"><FAQEditor key={editor.mode+editor.faq.id} mode={editor.mode} faq={editor.faq} keyValue={key} onCancel={()=>setEditor(null)} onDone={()=>{setEditor(null);void refresh();}}/></div>}</div>}
   <div className="p-5 sm:p-6 border-b border-line flex flex-col sm:flex-row gap-3"><div className="relative flex-1"><Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted"/><input value={query} onChange={e=>setQuery(e.target.value)} className="field pl-11" placeholder="Search topics, questions or answers..." aria-label="Search FAQs"/></div><select className="field sm:w-[195px]" value={filter} onChange={e=>setFilter(e.target.value)} aria-label="Filter FAQ category">{categories.map(x=><option key={x}>{x}</option>)}</select></div>
   {error&&<div className="m-5 rounded-xl border border-rose-300 p-4 flex flex-wrap justify-between gap-3 text-sm text-rose-600" role="alert"><span className="flex gap-2 items-center"><AlertCircle size={16}/>{error}</span><button onClick={()=>void refresh()} className="underline">Retry</button></div>}
   {loading?<div className="p-20 text-center text-muted"><LoaderCircle className="animate-spin mx-auto"/><p className="text-xs mt-4">Loading knowledge base...</p></div>:
    filtered.length===0?<div className="py-20 px-4 text-center"><FileQuestion size={32} className="mx-auto text-teal-500"/><h3 className="font-semibold text-ink mt-4">No matching questions</h3><p className="text-muted text-sm mt-2">Try another phrase or clear the filter.</p><button onClick={()=>{setQuery('');setFilter('All topics');}} className="btn-secondary mt-5">Clear filters</button></div>:
    <div className="divide-y divide-line">{filtered.map((faq,index)=><div key={faq.id} className="group"><button className="w-full text-left px-5 sm:px-7 py-5 flex items-center gap-4 hover:bg-panel transition-colors" onClick={()=>setExpanded(expanded===faq.id?null:faq.id)} aria-expanded={expanded===faq.id}><span className="text-[11px] text-muted font-mono shrink-0 w-7">{String(index+1).padStart(2,'0')}</span><div className="flex-1 min-w-0"><div className="text-[13px] font-semibold text-ink leading-6">{faq.question}</div><div className="mt-1.5 text-[11px] text-teal-600 dark:text-teal-400">{faq.category}</div></div><ChevronDown size={17} className={`text-muted shrink-0 transition-transform ${expanded===faq.id?'rotate-180':''}`}/></button>
      {expanded===faq.id&&<div className="pb-5 px-5 sm:px-7 pl-[68px] sm:pl-[80px]"><div className="prose-chat text-muted leading-7 text-[13px]"><ReactMarkdown>{faq.answer}</ReactMarkdown></div>{faq.alternatives.length>0&&<p className="mt-3 text-[11px] text-muted">Also understood: {faq.alternatives.slice(0,3).join(' · ')}</p>}<div className="mt-5 flex flex-wrap gap-2"><button className="text-[12px] font-semibold text-teal-600 dark:text-teal-400 inline-flex items-center gap-2" onClick={()=>onAsk(faq.question)}>Ask in chat <ArrowRight size={14}/></button>{admin&&key&&<><button onClick={()=>{setEditor({mode:'edit',faq});window.scrollTo({top:150,behavior:'smooth'});}} className="small-action"><Pencil size={13}/> Edit</button><button disabled={busy===faq.id} onClick={()=>void remove(faq)} className="small-action text-rose-600"><Trash2 size={13}/> Delete</button></>}</div></div>}
    </div>)}</div>}
   </div>
   <p className="mt-5 text-[11px] text-muted">Demo knowledge base · Northstar Supply is a fictional store. Policies and contact details are examples, not promises from a real business.</p>
 </section>;
}
