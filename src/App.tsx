import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Archive, Bell, Check, ChevronRight, CircleAlert, Database, Ellipsis, LayoutDashboard,
  List, MonitorSmartphone, Moon, PieChart, Plus, Sun, X, type LucideIcon,
} from 'lucide-react'
import {
  accountBalances, calendarDay, capitalize, dateLabel, latestFirst, monthly, summarize, type CategoryId, type Entry,
} from './ledger'
import { readLedger, storageMessage, watchEntries } from './storage'
import { Brand, Modal } from './components/ui'
import { Backups } from './components/Backups'
import { MonthControl } from './components/Calendar'
import { OpeningBalance } from './components/OpeningBalance'
import { Editor, type EditorDraft } from './components/Editor'
import { CategoryView, Dashboard, History } from './components/LedgerViews'
import { Reminders } from './components/Reminders'
import type { Reminder } from './reminders'

const pages = {
  resumen: { label: 'Resumen', icon: LayoutDashboard },
  movimientos: { label: 'Movimientos', icon: List },
  categorias: { label: 'Categorías', icon: PieChart },
}
type Page = keyof typeof pages
const pageIds = Object.keys(pages) as Page[]
function pageFromHash(): Page {
  const value = location.hash.slice(1)
  return Object.hasOwn(pages, value) ? value as Page : 'resumen'
}
type Theme = 'system' | 'light' | 'dark'
const themeOptions: { value: Theme, label: string, icon: LucideIcon }[] = [
  { value: 'system', label: 'Sistema', icon: MonitorSmartphone },
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
]
function savedTheme(): Theme {
  try {
    const theme = localStorage.getItem('mi-dinero:theme')
    if (theme === 'light' || theme === 'dark') return theme
  } catch { /* System appearance works without Web Storage. */ }
  return 'system'
}
function ThemeControl({ theme, onChange }: { theme: Theme, onChange: (theme: Theme) => void }) {
  return <div className="theme-control" role="group" aria-label="Apariencia">
    {themeOptions.map(({ value, label, icon: Icon }) => <button key={value} onClick={() => onChange(value)}
      title={label} aria-label={'Tema ' + label.toLowerCase()} aria-pressed={theme === value}>
      <Icon size={16} /><span>{label}</span></button>)}
  </div>
}

export default function App() {
  const today = calendarDay()
  const [page, setPage] = useState<Page>(pageFromHash)
  const [month, setMonth] = useState(today.slice(0, 7))
  const [allMonths, setAllMonths] = useState(false)
  const [category, setCategory] = useState<CategoryId | null>(null)
  const [theme, setTheme] = useState<Theme>(savedTheme)
  const [openingCents, setOpeningCents] = useState(0)
  const [editingOpening, setEditingOpening] = useState<number | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadError, setLoadError] = useState('')
  const [editor, setEditor] = useState<EditorDraft | null>(null)
  const [utility, setUtility] = useState<'more' | 'backup' | 'reminders' | null>(null)
  const [toast, setToast] = useState<{ label: string } | null>(null)
  const sequence = useRef(0)

  const reload = useCallback(async () => {
    const order = ++sequence.current
    try {
      const ledger = await readLedger()
      if (order === sequence.current) {
        setOpeningCents(ledger.openingCents)
        setEntries(latestFirst(ledger.entries))
        setReminders(ledger.reminders)
        setLoadState('ready')
      }
    } catch (err) {
      if (order === sequence.current) { setLoadState('error'); setLoadError(storageMessage(err)) }
    }
  }, [])
  useEffect(() => { void reload(); return watchEntries(reload) }, [reload])
  useEffect(() => {
    document.documentElement.toggleAttribute('data-app-ready', loadState !== 'loading')
  }, [loadState])
  useEffect(() => {
    const navigate = () => { setPage(pageFromHash()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', navigate)
    return () => window.removeEventListener('hashchange', navigate)
  }, [])
  useEffect(() => {
    document.title = pages[page].label + ' · Mi Dinero'
  }, [page])
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches)
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#111b1a' : '#f6f8f6')
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3600)
    return () => window.clearTimeout(timer)
  }, [toast])

  const monthEntries = useMemo(() => monthly(entries, month), [entries, month])
  const totals = useMemo(() => summarize(monthEntries), [monthEntries])
  const account = useMemo(() => accountBalances({ entries, openingCents }, month), [entries, openingCents, month])
  const wholeHistory = page === 'movimientos' && allMonths
  function notify(label: string) { setToast({ label }) }
  function changeTheme(next: Theme) {
    setTheme(next)
    try { localStorage.setItem('mi-dinero:theme', next) } catch { /* Keep the choice for this session. */ }
  }
  function goTo(next: Page) {
    if (page !== next) location.hash = next
    setPage(next)
    window.scrollTo(0, 0)
  }
  function showHistory(id?: CategoryId) {
    setCategory(id ?? null)
    setAllMonths(false)
    goTo('movimientos')
  }
  function add(id?: CategoryId) {
    const date = wholeHistory || month === today.slice(0, 7) ? today : month + '-01'
    setEditor({ date, category: id })
  }
  function edit(entry: Entry) { setEditor({ date: entry.date, original: entry }) }
  function saved(date: string | null, message: string) {
    if (date) setMonth(date.slice(0, 7))
    setEditor(null)
    void reload()
    notify(message)
  }
  const navLinks = (mobile: boolean) => pageIds.map(key => {
    const Icon = pages[key].icon
    return <a key={key} className="nav-item" href={'#' + key} aria-current={page === key ? 'page' : undefined}
      onClick={() => { setUtility(null); if (key === 'movimientos') setCategory(null) }}>
      <Icon size={mobile ? 21 : 19} strokeWidth={1.8} /><span>{pages[key].label}</span></a>
  })
  const themeControl = <ThemeControl theme={theme} onChange={changeTheme} />
  const addButton = (mobile: boolean) => <button className={'primary new-button ' + (mobile ? 'mobile-new' : 'desktop-new')}
    aria-label="Nuevo movimiento" onClick={() => add()} disabled={loadState !== 'ready'}><Plus size={19} /><span>{mobile ? 'Nuevo' : 'Nuevo movimiento'}</span></button>

  return <div className="app-shell" inert={loadState === 'loading'}>
    <a href="#main-content" className="skip-link" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus() }}>Saltar al contenido</a>
    <aside className="sidebar">
      <a href="#resumen" className="brand-link" aria-label="Mi Dinero, resumen"><Brand /></a>
      <nav className="side-navigation" aria-label="Navegación principal">{navLinks(false)}</nav>
      <div className="sidebar-bottom">
        <button className="nav-item backup-nav" disabled={loadState !== 'ready'} onClick={() => setUtility('reminders')}><Bell size={19} />Recordatorios</button>
        <button className="nav-item backup-nav" onClick={() => setUtility('backup')}><Archive size={19} />Copias de seguridad</button>
        <div className="side-settings"><span className="settings-label">Apariencia</span>{themeControl}</div>
        <div className="local-status"><span />Datos en este dispositivo</div>
      </div>
    </aside>
    <header className="mobile-top"><a href="#resumen" className="brand-link"><Brand /></a>{addButton(true)}</header>
    <main id="main-content" tabIndex={-1} className="main-content">
      <div className="main-inner">
        <header className="page-header">
          <div><h1>{pages[page].label}</h1><p>{capitalize(dateLabel(today, { weekday: 'long', day: 'numeric', month: 'long' }))}</p></div>
          <div className="header-actions"><MonthControl month={month} allMonths={wholeHistory} allowAll={page === 'movimientos'}
            onChange={(next, all = false) => { setMonth(next); setAllMonths(all) }} />{addButton(false)}</div>
        </header>
        {loadState === 'error'
          ? <div className="storage-error" role="alert"><CircleAlert size={23} /><p>{loadError}</p><button className="secondary" onClick={reload}>Reintentar</button></div>
          : loadState === 'ready' && <div key={page} className="page-content">
            {page === 'resumen' ? <Dashboard account={account} openingCents={openingCents} onOpening={() => setEditingOpening(openingCents)} entries={monthEntries} totals={totals} onAdd={add} onEdit={edit}
              onHistory={showHistory} onCategories={() => goTo('categorias')} />
            : page === 'movimientos' ? <History entries={wholeHistory ? entries : monthEntries} category={category} onClearCategory={() => setCategory(null)}
              onEdit={edit} onAdd={add} />
            : <CategoryView totals={totals} onHistory={showHistory} onAdd={add} />}
          </div>}
      </div>
    </main>
    <nav className="mobile-nav" aria-label="Navegación principal">{navLinks(true)}
      <button className="nav-item" onClick={() => setUtility('more')}><Ellipsis size={21} /><span>Más</span></button></nav>
    {editingOpening !== null && <OpeningBalance original={editingOpening} onClose={() => setEditingOpening(null)}
      onSaved={() => { setEditingOpening(null); void reload(); notify('Saldo inicial guardado') }} />}
    {editor && <Editor key={editor.original?.id ?? 'new'} draft={editor} onClose={() => setEditor(null)}
      onDuplicate={entry => setEditor({ date: calendarDay(), copy: entry })} onSaved={saved} />}
    {utility === 'more' && <Modal title="Más opciones" onClose={() => setUtility(null)}>
      <button className="more-backup more-reminders" disabled={loadState !== 'ready'} onClick={() => setUtility('reminders')}><Bell size={20} />Recordatorios<ChevronRight size={17} /></button>
      <button className="more-backup" onClick={() => setUtility('backup')}><Archive size={20} />Copias de seguridad<ChevronRight size={17} /></button>
      <details className="iphone-install"><summary>Instalar en la pantalla de inicio del iPhone</summary>
        <p>Abre Mi Dinero en Safari mediante HTTPS. Pulsa Compartir, elige Añadir a la pantalla de inicio y confirma con Añadir. Si aparece Abrir como app web, déjalo activado.</p>
      </details>
      <div className="more-theme"><h3>Apariencia</h3>{themeControl}</div>
      <p className="local-note"><Database size={17} />Tus datos se guardan en este dispositivo.</p>
    </Modal>}
    {utility === 'reminders' && <Reminders reminders={reminders} onClose={() => setUtility(null)} onChange={reload} />}
    {utility === 'backup' && <Backups ledger={loadState === 'ready' ? { entries, openingCents, reminders } : null} onClose={() => setUtility(null)}
      onRestored={() => { setUtility(null); void reload(); notify('Copia restaurada') }} />}
    {toast && <div className="toast" role="status"><Check size={17} />{toast.label}<button aria-label="Ocultar aviso" onClick={() => setToast(null)}><X size={14} /></button></div>}
  </div>
}
