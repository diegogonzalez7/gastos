import { useId, useState } from 'react'
import {
  ArrowDownLeft, ArrowRight, ArrowUpRight, ChartPie, ChevronRight, ListFilter, Plus, Search, Wallet, X,
} from 'lucide-react'
import {
  capitalize, categories, categoryIds, dateLabel, money, searchText,
  type CategoryId, type Entry, type Kind, type Summary,
} from '../ledger'
import { CategoryBadge, EmptyState } from './ui'

export function EntryRow({ entry, onEdit, showDate = false }: { entry: Entry, onEdit: (entry: Entry) => void, showDate?: boolean }) {
  const incoming = entry.kind === 'income'
  const description = useId()
  return <button className="entry-row" onClick={() => onEdit(entry)} aria-label={'Editar ' + entry.concept}
    aria-describedby={description + '-category ' + description + '-amount'}>
    <CategoryBadge category={entry.category} />
    <span className="entry-info"><strong>{entry.concept}</strong><small id={description + '-category'}>
      {categories[entry.category].name}{showDate && ' · ' + dateLabel(entry.date, { day: 'numeric', month: 'short' })}
    </small></span>
    <span className={'entry-value' + (incoming ? ' positive' : '')} id={description + '-amount'}>{incoming ? '+' : '−'}{money(entry.cents)}</span>
    <ChevronRight className="entry-chevron" size={15} />
  </button>
}

export function Balance({ totals }: { totals: Summary }) {
  return <section className="balance-card" aria-label="Resumen financiero del mes">
    <div className="hero-pattern" aria-hidden="true" />
    <img className="hero-wallet" src={import.meta.env.BASE_URL + 'cartera.webp'} alt="" />
    <div className="balance-content">
      <div className="balance-label"><Wallet size={17} />Balance del mes</div>
      <div className={'balance-amount' + (Math.abs(totals.balance) >= 100_000_000 ? ' long-amount' : '')}>{money(totals.balance)}</div>
      <div className="balance-metrics">
        <div className="hero-metric"><span className="metric-icon income"><ArrowDownLeft size={19} /></span>
          <span><small>Ingresos</small><strong>{money(totals.income)}</strong></span></div>
        <div className="hero-metric"><span className="metric-icon expense"><ArrowUpRight size={19} /></span>
          <span><small>Gastos</small><strong>{money(totals.expense)}</strong></span></div>
      </div>
    </div>
  </section>
}

const shortcuts: CategoryId[] = ['food', 'transport', 'leisure', 'home', 'salary']
function Shortcuts({ onAdd }: { onAdd: (category?: CategoryId) => void }) {
  return <section className="quick-section" aria-labelledby="quick-title">
    <h2 id="quick-title">Registro rápido</h2>
    <div className="quick-list">{shortcuts.map(id => <button key={id} className="quick-button"
      aria-label={'Registrar en ' + categories[id].name} onClick={() => onAdd(id)}>
      <CategoryBadge category={id} /><span>{categories[id].name}</span><Plus size={15} aria-hidden="true" />
    </button>)}</div>
  </section>
}

const percent = (fraction: number) => fraction > 0 && fraction < 0.01
  ? '<1 %' : new Intl.NumberFormat('es-ES', { style: 'percent', maximumFractionDigits: 0 }).format(fraction)

function SpendingRing({ totals }: { totals: Summary }) {
  let start = 0
  const stops = totals.breakdown.map(({ category, share }) => {
    const from = start
    start += share * 100
    return categories[category].color + ' ' + from + '% ' + start + '%'
  })
  return <div className="ring" style={stops.length ? { background: 'conic-gradient(' + stops.join(', ') + ')' } : undefined}
    role="img" aria-label={'Gastos totales: ' + money(totals.expense)}>
    <div className="ring-center"><small>Total gastos</small><strong>{money(totals.expense)}</strong></div>
  </div>
}

interface DashboardProps {
  totals: Summary
  entries: Entry[]
  onAdd: (category?: CategoryId) => void
  onEdit: (entry: Entry) => void
  onHistory: (category?: CategoryId) => void
  onCategories: () => void
}

export function Dashboard({ totals, entries, onAdd, onEdit, onHistory, onCategories }: DashboardProps) {
  return <div className="view-stack">
    <Balance totals={totals} />
    <Shortcuts onAdd={onAdd} />
    <div className="overview-panels">
      <section className="panel recent-panel" aria-labelledby="recent-title">
        <div className="panel-heading"><h2 id="recent-title">Últimos movimientos</h2>
          <button className="text-button" onClick={() => onHistory()}>Ver todos <ArrowRight size={15} /></button></div>
        {entries.length ? <div className="entry-list">
          {entries.slice(0, 5).map(entry => <EntryRow key={entry.id} entry={entry} onEdit={onEdit} showDate />)}
        </div> : <EmptyState title="Aún no hay movimientos" description="Registra un ingreso o un gasto para empezar este mes."
          action={<button className="text-button" onClick={() => onAdd()}><Plus size={15} />Añadir movimiento</button>} />}
      </section>
      <section className="panel spending-panel" aria-labelledby="spending-title">
        <div className="panel-heading"><h2 id="spending-title">Gastos por categoría</h2>
          <button className="icon-button panel-arrow" aria-label="Ver todas las categorías" onClick={onCategories}><ArrowUpRight size={17} /></button></div>
        <div className={'ring-area' + (totals.expense ? ' has-data' : '')}>
          <SpendingRing totals={totals} />
          {totals.expense ? <div className="legend">
            {totals.breakdown.slice(0, 4).map(({ category, share }) => <button key={category} onClick={() => onHistory(category)}>
              <i style={{ backgroundColor: categories[category].color }} /><span>{categories[category].name}</span><b>{percent(share)}</b>
            </button>)}
            {totals.breakdown.length > 4 && <button className="text-button" onClick={onCategories}>Ver el desglose <ArrowRight size={13} /></button>}
          </div> : <p>Al registrar gastos, verás aquí su distribución.</p>}
        </div>
      </section>
    </div>
  </div>
}

export function History({ entries, category, onClearCategory, onEdit, onAdd }: {
  entries: Entry[], category: CategoryId | null, onClearCategory: () => void,
  onEdit: (entry: Entry) => void, onAdd: () => void,
}) {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<Kind | 'all'>('all')
  const keyword = searchText(query)
  const rows = entries.filter(entry => (kind === 'all' || entry.kind === kind) && (!category || entry.category === category) &&
    (!keyword || searchText(entry.concept + ' ' + categories[entry.category].name).includes(keyword)))
  const grouped = new Map<string, Entry[]>()
  for (const entry of rows) {
    const group = grouped.get(entry.date) ?? []
    group.push(entry)
    grouped.set(entry.date, group)
  }
  const filtered = Boolean(keyword || category || kind !== 'all')
  function reset() { setQuery(''); setKind('all'); onClearCategory() }
  return <section className="panel history-panel">
    <div className="history-tools">
      <label className="search-box"><Search size={18} /><input type="search" aria-label="Buscar movimientos"
        placeholder="Buscar por concepto o categoría" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <div className="filter-group" role="group" aria-label="Filtrar por tipo">
        {([['all', 'Todos'], ['expense', 'Gastos'], ['income', 'Ingresos']] as const).map(([value, label]) =>
          <button key={value} aria-pressed={kind === value} onClick={() => setKind(value)}>{label}</button>)}
      </div>
    </div>
    {category && <button className="filter-chip" aria-label={'Quitar filtro de ' + categories[category].name} onClick={onClearCategory}>
      <ListFilter size={14} />{categories[category].name}<X size={14} /></button>}
    {rows.length ? [...grouped].map(([day, group]) => <div className="date-group" key={day}>
      <h2>{capitalize(dateLabel(day, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</h2>
      {group.map(entry => <EntryRow key={entry.id} entry={entry} onEdit={onEdit} />)}
    </div>) : <EmptyState title={filtered ? 'Sin resultados' : 'Aún no hay movimientos'}
      description={filtered ? 'Prueba otro concepto, categoría o tipo de movimiento.' : 'Añade un movimiento o elige otro periodo.'}
      action={<button className="text-button" onClick={filtered ? reset : onAdd}>{filtered ? 'Quitar filtros' : 'Añadir movimiento'}<ArrowRight size={15} /></button>} />}
  </section>
}

export function CategoryView({ totals, onHistory, onAdd }: {
  totals: Summary, onHistory: (category: CategoryId) => void, onAdd: (category?: CategoryId) => void,
}) {
  const ranked = totals.breakdown
  return <div className="category-layout">
    <section className="panel category-overview">
      <div className="panel-heading"><h2>Distribución del mes</h2><ChartPie size={19} className="muted" /></div>
      <SpendingRing totals={totals} />
      {ranked.length ? <p><strong>{categories[ranked[0].category].name}</strong> representa el {percent(ranked[0].share)} de tus gastos.</p>
        : <p>La distribución aparecerá con tu primer gasto del mes.</p>}
    </section>
    <section className="panel category-ranking">
      <div className="panel-heading"><h2>{ranked.length ? 'De mayor a menor gasto' : 'Categorías de gasto'}</h2></div>
      {ranked.length ? ranked.map(({ category, cents, share }) => <button className="rank-row" key={category}
        aria-label={'Ver movimientos de ' + categories[category].name} onClick={() => onHistory(category)}>
        <CategoryBadge category={category} /><span className="rank-detail"><span><strong>{categories[category].name}</strong><b>{money(cents)}</b></span>
          <span className="bar-track"><i style={{ width: (share * 100) + '%', backgroundColor: categories[category].color }} /></span>
        </span><small>{percent(share)}</small><ChevronRight size={15} />
      </button>) : <div className="available-categories">
        {categoryIds.filter(id => categories[id].kind === 'expense').map(id => <button key={id} onClick={() => onAdd(id)}
          aria-label={'Registrar en ' + categories[id].name}><CategoryBadge category={id} /><span>{categories[id].name}</span><Plus size={15} /></button>)}
      </div>}
    </section>
  </div>
}
