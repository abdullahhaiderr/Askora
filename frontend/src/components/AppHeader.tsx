import { useState } from 'react';
import { ArrowUpRight, Menu, Moon, Sun, X } from 'lucide-react';
export type Page = 'home' | 'chat' | 'knowledge';
interface Props { page: Page; onNavigate: (page: Page) => void; dark: boolean; onToggle: () => void }
export function Brand({ compact = false }: { compact?: boolean }) {
  return <span className="inline-flex items-center gap-2.5 font-bold tracking-[-.05em] text-ink"><span className="brandmark" aria-hidden="true"><svg viewBox="0 0 36 36" fill="none"><path d="M9 11.5h18v12H17l-6 4v-4H9z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/><circle cx="14" cy="17.5" r="1.2" fill="currentColor"/><circle cx="18" cy="17.5" r="1.2" fill="currentColor"/><circle cx="22" cy="17.5" r="1.2" fill="currentColor"/></svg></span>{!compact && <span className="text-[23px]">askora<span className="text-teal-500">.</span></span>}</span>;
}
export default function AppHeader({ page, onNavigate, dark, onToggle }: Props) {
  const [menu, setMenu] = useState(false);
  const go = (target: Page) => { onNavigate(target); setMenu(false); };
  return <header className="sticky top-0 z-30 border-b border-line bg-base/95 backdrop-blur-xl">
    <div className="container-wrap flex h-[76px] items-center justify-between gap-6">
      <button aria-label="Go to home" onClick={() => go('home')}><Brand /></button>
      <nav className="hidden sm:flex items-center gap-1 rounded-full border border-line bg-surface p-1.5" aria-label="Main navigation">
        {(['home','chat','knowledge'] as const).map(value => <button key={value} onClick={() => go(value)} aria-current={page === value ? 'page' : undefined} className={`nav-pill ${page === value ? 'nav-active' : ''}`}>{value === 'knowledge' ? 'Knowledge base' : value === 'chat' ? 'Chat' : 'Home'}</button>)}
      </nav>
      <div className="flex items-center gap-2"><button onClick={onToggle} className="icon-button" aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} title={dark ? 'Light theme' : 'Dark theme'}>{dark ? <Sun size={18}/> : <Moon size={18}/>}</button><button onClick={() => go('chat')} className="hidden md:inline-flex btn-primary text-[13px]">Try Askora <ArrowUpRight size={15}/></button><button onClick={() => setMenu(!menu)} className="sm:hidden icon-button" aria-expanded={menu} aria-label="Toggle navigation">{menu ? <X size={19}/> : <Menu size={19}/>}</button></div>
    </div>
    {menu && <nav className="container-wrap sm:hidden pb-4 flex flex-col gap-1" aria-label="Mobile navigation">{(['home','chat','knowledge'] as const).map(p => <button key={p} onClick={() => go(p)} className={`px-4 py-3 text-left rounded-xl font-medium capitalize ${page === p ? 'bg-teal-50 text-teal-700 dark:bg-teal-950' : ''}`}>{p === 'knowledge' ? 'Knowledge base' : p}</button>)}</nav>}
  </header>;
}
