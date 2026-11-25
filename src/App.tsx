import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Archive, Bell, CalendarClock, Check, ChevronRight, CircleAlert, Database, Ellipsis, LayoutDashboard,
  List, MonitorSmartphone, Moon, Palette, PieChart, Plus, Settings, SlidersHorizontal, Sun, X, type LucideIcon,
} from 'lucide-react'
import {
  accountBalances, calendarDay, capitalize, dateLabel, latestFirst, monthly, shiftMonth, summarize, type CategoryId, type Entry, type Refund,
} from './ledger'
import { readLedger, saveDesign, saveEntry, saveFavorite, saveTheme, storageMessage, watchEntries } from './storage'
import { Brand, Modal } from './components/ui'
import { Backups } from './components/Backups'
import { MonthControl } from './components/Calendar'
import { HistorySettings } from './components/HistorySettings'
import { OpeningBalance } from './components/OpeningBalance'
import { Refunds } from './components/Refunds'
import { Editor, type EditorDraft } from './components/Editor'
import { CategoryView, Dashboard, FavoriteManager, History } from './components/LedgerViews'
import { readFavorites, type Favorite } from './favorites'
import { Reminders } from './components/Reminders'
import { MonthlyAlert } from './components/MonthlyAlert'
import { MonthlyStory, MonthlyStoryLink } from './components/MonthlyStory'
import { monthlyReport } from './monthlyReport'
import type { Reminder } from './reminders'
import { DesignPicker } from './components/DesignPicker'
import { cacheAppearance, designLabel, savedDesign, savedTheme, type Design, type Theme } from './appearance'

const pages = {
  resumen: { label: 'Resumen', icon: LayoutDashboard },
  movimientos: { label: 'Movimientos', icon: List },
  categorias: { label: 'Categorías', icon: PieChart },
}
type Page = keyof typeof pages
const pageIds = Object.keys(pages) as Page[]
const seenReportKey = 'mi-dinero:seen-monthly-story'
const settingsSections = [
  { id: 'general', label: 'General', detail: 'Mes de inicio', icon: SlidersHorizontal },
  { id: 'appearance', label: 'Apariencia', detail: 'Tema y diseño', icon: Palette },
  { id: 'monthly-alert', label: 'Notificaciones', detail: 'Aviso del cierre mensual', icon: CalendarClock },
  { id: 'backup', label: 'Copias de seguridad', detail: 'Dropbox, exportar y restaurar', icon: Archive },
] as const

function savedSeenReport() {
  try { return localStorage.getItem(seenReportKey) } catch { return null }
}

function pageFromHash(): Page {
  const value = location.hash.slice(1)
  return Object.hasOwn(pages, value) ? value as Page : 'resumen'
}
const themeOptions: { value: Theme, label: string, icon: LucideIcon }[] = [
  { value: 'system', label: 'Sistema', icon: MonitorSmartphone },
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Oscuro', icon: Moon },
]
function ThemeControl({ theme, onChange }: { theme: Theme, onChange: (theme: Theme) => void }) {
  return <div className="theme-control" role="group" aria-label="Apariencia">
    {themeOptions.map(({ value, label, icon: Icon }) => <button key={value} onClick={() => onChange(value)}
      title={label} aria-label={'Tema ' + label.toLowerCase()} aria-pressed={theme === value}>
      <Icon size={16} /><span>{label}</span></button>)}
  </div>
}

export default function App() {
  const [today, setToday] = useState(calendarDay)
  const [page, setPage] = useState<Page>(pageFromHash)
  const [firstHistoryMonth, setFirstHistoryMonth] = useState(() => today.slice(0, 4) + '-01')
  const [month, setMonth] = useState(() => today.slice(0, 7))
  const [allMonths, setAllMonths] = useState(false)
  const [category, setCategory] = useState<CategoryId | null>(null)
  const [theme, setTheme] = useState<Theme>(savedTheme)
  const [design, setDesign] = useState<Design>(savedDesign)
  const [openingCents, setOpeningCents] = useState(0)
  const [editingOpening, setEditingOpening] = useState<number | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [loadError, setLoadError] = useState('')
  const [editor, setEditor] = useState<EditorDraft | null>(null)
  const [refundDialog, setRefundDialog] = useState<{ entry: Entry, selected?: Refund } | null>(null)
  const [favorites, setFavorites] = useState(readFavorites)
  const [utility, setUtility] = useState<(typeof settingsSections)[number]['id'] | 'more' | 'reminders' | 'designs' | 'favorites' | 'settings' | null>(null)
  const [storyMonth, setStoryMonth] = useState<string | null>(null)
  const [seenReport, setSeenReport] = useState(savedSeenReport)
  const [toast, setToast] = useState<{ label: string, undo?: () => Promise<void> } | null>(null)
  const undoInProgress = useRef(false)
  const sequence = useRef(0)

  const reload = useCallback(async () => {
    const order = ++sequence.current
    try {
      const ledger = await readLedger()
      if (order === sequence.current) {
        setOpeningCents(ledger.openingCents)
        setEntries(latestFirst(ledger.entries))
        setReminders(ledger.reminders)
        setFirstHistoryMonth(ledger.settings.historyStart)
        setMonth(selected => selected < ledger.settings.historyStart ? ledger.settings.historyStart : selected)
        setTheme(ledger.settings.theme)
        setDesign(ledger.settings.design)
        setFavorites(ledger.favorites)
        cacheAppearance(ledger.settings.theme, ledger.settings.design)
        setLoadState('ready')
      }
    } catch (err) {
      if (order === sequence.current) { setLoadState('error'); setLoadError(storageMessage(err)) }
    }
  }, [])
  useEffect(() => { void reload(); return watchEntries(reload) }, [reload])
  useEffect(() => {
    let timer: number
    let localMonth = calendarDay().slice(0, 7)
    function refreshDay() {
      const now = new Date()
      const day = calendarDay(now)
      const nextMonth = day.slice(0, 7)
      if (nextMonth !== localMonth) {
        const previous = localMonth
        localMonth = nextMonth
        setMonth(selected => selected === previous && nextMonth >= firstHistoryMonth ? nextMonth : selected)
      }
      setToday(day)
      const midnight = new Date(now)
      midnight.setHours(24, 0, 0, 0)
      window.clearTimeout(timer)
      timer = window.setTimeout(refreshDay, midnight.getTime() - now.getTime())
    }
    refreshDay()
    document.addEventListener('visibilitychange', refreshDay)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', refreshDay)
    }
  }, [firstHistoryMonth])
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
      const root = document.documentElement
      const dark = design === 'original' ? theme === 'dark' || (theme === 'system' && media.matches) : design !== 'sand'
      if (design === 'original') delete root.dataset.design
      else root.dataset.design = design
      root.dataset.theme = dark ? 'dark' : 'light'
      const canvas = getComputedStyle(root).getPropertyValue('--canvas').trim()
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', canvas)
    }
    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [design, theme])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), toast.undo ? 10_000 : 3600)
    return () => window.clearTimeout(timer)
  }, [toast])

  const monthEntries = useMemo(() => monthly(entries, month), [entries, month])
  const totals = useMemo(() => summarize(monthEntries), [monthEntries])
  const account = useMemo(() => accountBalances({ entries, openingCents }, month), [entries, openingCents, month])
  const currentMonth = today.slice(0, 7)
  const lastClosedMonth = shiftMonth(currentMonth, -1)
  const previousMonth = shiftMonth(month, -1)
  const reportLinkMonth = previousMonth >= firstHistoryMonth && previousMonth < currentMonth ? previousMonth : null
  const unreadReport = reportLinkMonth === lastClosedMonth && seenReport !== lastClosedMonth &&
    entries.some(entry => entry.date.startsWith(lastClosedMonth) || entry.refunds?.some(refund => refund.date.startsWith(lastClosedMonth)))
  const firstHistoryDay = firstHistoryMonth + '-01'
  const report = useMemo(() => storyMonth && storyMonth >= firstHistoryMonth
    ? monthlyReport(entries, openingCents, storyMonth, firstHistoryMonth) : null, [entries, openingCents, storyMonth, firstHistoryMonth])
  const wholeHistory = page === 'movimientos' && allMonths
  function notify(label: string, undo?: () => Promise<void>) { setToast({ label, undo }) }
  async function undoDeletion(action: () => Promise<void>) {
    if (undoInProgress.current) return
    undoInProgress.current = true
    notify('Recuperando…')
    try { await action(); await reload(); notify('Movimiento recuperado') }
    catch (error) { notify(error instanceof DOMException && error.name === 'ConstraintError' ? 'El movimiento ya existe.' : storageMessage(error)) }
    finally { undoInProgress.current = false }
  }
  async function changeTheme(next: Theme) {
    try { await saveTheme(next); await reload() }
    catch (error) { notify(storageMessage(error)) }
  }
  async function changeDesign(next: Design) {
    try { await saveDesign(next); await reload() }
    catch (error) { notify(storageMessage(error)) }
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
    const date = wholeHistory || month === currentMonth ? today : month + '-01'
    setEditor({ date, category: id })
  }
  function edit(entry: Entry) { setEditor({ date: entry.date, original: entry }) }
  function openRefunds(entry: Entry, selected?: Refund) {
    setEditor(null)
    setRefundDialog({ entry, selected })
  }
  function editFavorite(favorite?: Favorite) {
    setUtility(null)
    setEditor({ date: calendarDay(), favorite, mode: 'favorite' })
  }
  async function changeFavorite(id: string, favorite: Favorite | null) {
    setFavorites(await saveFavorite(id, favorite))
    setEditor(null)
    notify(favorite ? 'Favorito guardado' : 'Favorito eliminado')
  }
  function saved(date: string | null, message: string, undo?: () => Promise<void>) {
    if (date) setMonth(date.slice(0, 7))
    setEditor(null)
    void reload()
    notify(message, undo)
  }
  function openMonthlyStory() {
    if (!reportLinkMonth) return
    if (unreadReport) {
      setSeenReport(reportLinkMonth)
      try { localStorage.setItem(seenReportKey, reportLinkMonth) } catch { /* The story still opens. */ }
    }
    setStoryMonth(reportLinkMonth)
  }
  const navLinks = (mobile: boolean) => pageIds.map(key => {
    const Icon = pages[key].icon
    return <a key={key} className="nav-item" href={'#' + key} aria-current={page === key ? 'page' : undefined}
      onClick={() => { setUtility(null); if (key === 'movimientos') setCategory(null) }}>
      <Icon size={mobile ? 21 : 19} strokeWidth={1.8} /><span>{pages[key].label}</span></a>
  })
  const closeUtility = () => setUtility(null)
  const backToSettings = () => setUtility('settings')
  const addButton = (mobile: boolean) => <button className={'primary new-button ' + (mobile ? 'mobile-new' : 'desktop-new')}
    aria-label="Nuevo movimiento" onClick={() => add()} disabled={loadState !== 'ready'}>
    <Plus size={19} />{mobile ? <span>Nuevo</span> : <><span className="new-label-full">Nuevo movimiento</span><span className="new-label-compact">Nuevo</span></>}
  </button>

  return <div className="app-shell" inert={loadState === 'loading'}>
    <a href="#main-content" className="skip-link" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus() }}>Saltar al contenido</a>
    <aside className="sidebar">
      <a href="#resumen" className="brand-link" aria-label="Mi Dinero, resumen"><Brand /></a>
      <nav className="side-navigation" aria-label="Navegación principal">{navLinks(false)}</nav>
      <div className="sidebar-bottom">
        <button className="nav-item backup-nav" disabled={loadState !== 'ready'} onClick={() => setUtility('reminders')}><Bell size={19} />Recordatorios</button>
        <button className="nav-item backup-nav" onClick={backToSettings}><Settings size={19} />Ajustes</button>
        <div className="local-status"><span />Datos en este dispositivo</div>
      </div>
    </aside>
    <header className="mobile-top"><a href="#resumen" className="brand-link"><Brand /></a>{addButton(true)}</header>
    <main id="main-content" tabIndex={-1} className="main-content">
      <div className="main-inner">
        <header className="page-header">
          <div><h1>{pages[page].label}</h1><p>{capitalize(dateLabel(today, { weekday: 'long', day: 'numeric', month: 'long' }))}</p></div>
          <div className="header-actions"><MonthControl month={month} firstHistoryMonth={firstHistoryMonth} allMonths={wholeHistory} allowAll={page === 'movimientos'}
            onChange={(next, all = false) => { setMonth(next); setAllMonths(all) }} />{addButton(false)}</div>
        </header>
        {loadState === 'error'
          ? <div className="storage-error" role="alert"><CircleAlert size={23} /><p>{loadError}</p><button className="secondary" onClick={reload}>Reintentar</button></div>
          : loadState === 'ready' && <div key={page} className="page-content">
            {page === 'resumen' ? <>
              {reportLinkMonth && <div className="monthly-story-entry"><MonthlyStoryLink month={reportLinkMonth} unread={unreadReport} onClick={openMonthlyStory} /></div>}
              <Dashboard account={account} openingCents={openingCents} onOpening={() => setEditingOpening(openingCents)} entries={entries} month={month} firstHistoryDay={firstHistoryDay}
                totals={totals} onAdd={add} onEdit={edit} onEditRefund={openRefunds}
                favorites={favorites} onUseFavorite={favorite => setEditor({ date: calendarDay(), favorite })}
                onManageFavorites={() => favorites.length ? setUtility('favorites') : editFavorite()}
                onHistory={showHistory} onCategories={() => goTo('categorias')} />
            </>
            : page === 'movimientos' ? <History entries={entries} month={wholeHistory ? null : month} firstHistoryDay={firstHistoryDay} category={category} onClearCategory={() => setCategory(null)}
              onEdit={edit} onEditRefund={openRefunds} onAdd={add} />
            : <CategoryView totals={totals} onHistory={showHistory} onAdd={add} />}
          </div>}
      </div>
    </main>
    <nav className="mobile-nav" aria-label="Navegación principal">{navLinks(true)}
      <button className="nav-item" onClick={() => setUtility('more')}><Ellipsis size={21} /><span>Más</span></button></nav>
    {editingOpening !== null && <OpeningBalance original={editingOpening} onClose={() => setEditingOpening(null)}
      onSaved={() => { setEditingOpening(null); void reload(); notify('Saldo inicial guardado') }} />}
    {editor && <Editor key={editor.original?.id ?? 'new'} draft={editor} firstHistoryDay={firstHistoryDay} onClose={() => setEditor(null)}
      onDuplicate={entry => setEditor({ date: calendarDay(), copy: entry })} onSaved={saved} onFavorite={changeFavorite} onRefunds={openRefunds}
      onDeleted={entry => saved(null, 'Movimiento eliminado', () => saveEntry(entry))} />}
    {refundDialog && <Refunds entry={refundDialog.entry} selected={refundDialog.selected} firstHistoryDay={firstHistoryDay} onClose={() => {
      if (!refundDialog.selected) edit(refundDialog.entry)
      setRefundDialog(null)
    }} onSaved={(message, undo) => { setRefundDialog(null); void reload(); notify(message, undo) }} />}
    {utility === 'favorites' && <FavoriteManager favorites={favorites} onEdit={editFavorite} onClose={() => setUtility(null)} />}
    {report && <MonthlyStory key={report.month} report={report} onClose={() => setStoryMonth(null)}
      onHistory={() => { setStoryMonth(null); setMonth(report.month); showHistory() }}
      onHome={() => { setStoryMonth(null); setMonth(currentMonth); goTo('resumen') }} />}
    {utility === 'more' && <Modal title="Más opciones" onClose={closeUtility}>
      <button className="more-backup more-reminders" disabled={loadState !== 'ready'} onClick={() => setUtility('reminders')}><Bell size={20} />Recordatorios<ChevronRight size={17} /></button>
      <button className="more-backup" onClick={backToSettings}><Settings size={20} />Ajustes<ChevronRight size={17} /></button>
    </Modal>}
    {utility === 'reminders' && <Reminders reminders={reminders} onClose={() => setUtility(null)} onChange={reload} />}
    {utility === 'settings' && <Modal title="Ajustes" onClose={closeUtility}>
      <div className="settings-navigation">
        {settingsSections.map(({ id, label, detail, icon: Icon }) => <button key={id} type="button" aria-label={label}
          aria-describedby={`settings-${id}`} aria-haspopup="dialog" disabled={id === 'general' && loadState !== 'ready'}
          onClick={() => setUtility(id)}>
          <span className="utility-icon"><Icon size={19} /></span>
          <span><strong>{label}</strong><small id={`settings-${id}`}>{detail}</small></span>
          <ChevronRight size={16} />
        </button>)}
      </div>
      <p className="local-note settings-local-note"><Database size={17} />Tus datos se guardan en este dispositivo.</p>
    </Modal>}
    {utility === 'appearance' && <Modal title="Apariencia" onClose={closeUtility} onBack={backToSettings}>
      {design === 'original' && <ThemeControl theme={theme} onChange={changeTheme} />}
      <button className="design-launch" aria-label="Elegir diseño" aria-haspopup="dialog" onClick={() => setUtility('designs')}>
        <Palette size={16} /><span>Diseños</span><strong>{designLabel(design)}</strong>
      </button>
    </Modal>}
    {utility === 'monthly-alert' && <MonthlyAlert onClose={closeUtility} onBack={backToSettings} />}
    {utility === 'designs' && <DesignPicker selected={design} originalTheme={theme} onChange={changeDesign}
      onClose={closeUtility} onBack={() => setUtility('appearance')} />}
    {utility === 'general' && <HistorySettings start={firstHistoryMonth} onClose={closeUtility} onBack={backToSettings} onSaved={next => {
      setFirstHistoryMonth(next)
      setMonth(selected => selected < next ? next : selected)
      setUtility(null)
      void reload()
      notify('Mes de inicio guardado')
    }} />}
    {utility === 'backup' && <Backups ledger={loadState === 'ready' ? {
      entries, openingCents, reminders, favorites, settings: { historyStart: firstHistoryMonth, theme, design },
    } : null} onClose={closeUtility} onBack={backToSettings}
      onRestored={() => { setUtility(null); void reload(); notify('Copia restaurada') }} />}
    {toast && <div className="toast"><span className="toast-message" role="status"><Check size={17} />{toast.label}</span>
      {toast.undo && <button className="toast-undo" onClick={() => { if (toast.undo) void undoDeletion(toast.undo) }}>Deshacer</button>}
      <button aria-label="Ocultar aviso" onClick={() => setToast(null)}><X size={14} /></button>
    </div>}
  </div>
}
