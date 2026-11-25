import { useId, useState } from 'react'
import {
  ArrowDownLeft, ArrowRight, ArrowUpRight, ChartPie, ChevronRight, ListFilter, Plus, Search, Star, Wallet, X,
} from 'lucide-react'
import {
  capitalize, categories, categoryIds, dateLabel, displayCategory, money, paymentSource, percent, searchText,
  type CategoryId, type Entry, type Kind, type PaymentSource, type Refund, type Summary,
} from '../ledger'
import { favoriteName, type Favorite } from '../favorites'
import { CategoryBadge, EmptyState, FittedAmount, Modal } from './ui'

export function EntryRow({ entry, onEdit, showDate = false }: { entry: Entry, onEdit: (entry: Entry) => void, showDate?: boolean }) {
  const incoming = entry.kind === 'income'
  const category = displayCategory(entry.category)
  const categoryName = categories[category].name
  const categoryFirst = entry.kind === 'expense' && (entry.fromFavorite || category === 'machine')
  const title = !categoryFirst && entry.concept ? entry.concept : categoryName
  const accessibleTitle = categoryFirst && entry.concept && entry.concept !== title ? `${title} · ${entry.concept}` : title
  const description = useId()
  const paymentLabel = paymentSource(entry) === 'cash' ? 'Efectivo' : 'Cuenta bancaria'
  const categoryDetail = !categoryFirst && entry.concept ? categoryName : incoming ? 'Ingreso' : 'Gasto'
  const detail = entry.kind === 'withdrawal' ? 'Cuenta bancaria → Efectivo' : `${categoryDetail} · ${paymentLabel}`
  return <button className="entry-row" onClick={() => onEdit(entry)} aria-label={'Editar ' + accessibleTitle}
    aria-describedby={description + '-category ' + description + '-amount'}>
    <CategoryBadge category={category} />
    <span className="entry-info"><strong>{title}</strong><small id={description + '-category'}>
      {detail}{showDate && ' · ' + dateLabel(entry.date, { day: 'numeric', month: 'short' })}
    </small></span>
    <span className={'entry-value money' + (incoming ? ' positive' : '')} id={description + '-amount'}>{incoming ? '+' : '−'}{money(entry.cents)}</span>
    <ChevronRight className="entry-chevron" size={15} />
  </button>
}

type Movement = { entry: Entry, date: string, refund?: Refund }

function movementRows(entries: Entry[], month: string | null, firstHistoryDay: string) {
  const rows: Movement[] = []
  for (const entry of entries) {
    if (entry.date >= firstHistoryDay && (month === null || entry.date.startsWith(month))) rows.push({ entry, date: entry.date })
    for (const refund of entry.refunds ?? []) {
      if (refund.date >= firstHistoryDay && (month === null || refund.date.startsWith(month))) rows.push({ entry, date: refund.date, refund })
    }
  }
  return rows.sort((a, b) => b.date.localeCompare(a.date) || b.entry.createdAt - a.entry.createdAt)
}

function MovementRow({ movement: { entry, refund }, onEdit, onEditRefund, showDate }: {
  movement: Movement, onEdit: (entry: Entry) => void, onEditRefund: (entry: Entry, refund: Refund) => void, showDate?: boolean,
}) {
  if (!refund) return <EntryRow entry={entry} onEdit={onEdit} showDate={showDate} />
  const category = displayCategory(entry.category)
  const title = 'Reembolso · ' + (entry.concept || categories[category].name)
  return <button className="entry-row" onClick={() => onEditRefund(entry, refund)} aria-label={'Editar ' + title}>
    <CategoryBadge category={category} />
    <span className="entry-info"><strong>{title}</strong><small>{refund.payment === 'cash' ? 'Efectivo' : 'Cuenta bancaria'}
      {showDate && ' · ' + dateLabel(refund.date, { day: 'numeric', month: 'short' })}</small></span>
    <span className="entry-value money positive">+{money(refund.cents)}</span><ChevronRight className="entry-chevron" size={15} />
  </button>
}

function Balance({ totals }: { totals: Summary }) {
  return <section className="balance-card" aria-label="Resumen financiero del mes">
    <div className="hero-pattern" aria-hidden="true" />
    <img className="hero-wallet" src={import.meta.env.BASE_URL + 'cartera.webp'} alt="" />
    <div className="balance-content">
      <div className="balance-label"><Wallet size={17} />Balance del mes</div>
      <FittedAmount cents={totals.balance} className="balance-amount" />
      <div className="balance-metrics">
        <div className="hero-metric"><span className="metric-icon income"><ArrowDownLeft size={19} /></span>
          <span><small>Ingresos</small><strong className="money">{money(totals.income)}</strong></span></div>
        <div className="hero-metric"><span className="metric-icon expense"><ArrowUpRight size={19} /></span>
          <span><small>Gastos</small><strong className="money">{money(totals.expense)}</strong></span></div>
      </div>
    </div>
  </section>
}

function QuickFavorites({ favorites, onUseFavorite, onManageFavorites }: Pick<DashboardProps, 'favorites' | 'onUseFavorite' | 'onManageFavorites'>) {
  return <section className="quick-section" aria-labelledby="quick-title">
    <div className="quick-heading">
      <h2 id="quick-title">Registro rápido</h2>
      <button className="text-button" onClick={onManageFavorites}><Star size={16} />{favorites.length ? 'Gestionar favoritos' : 'Añadir favorito'}</button>
    </div>
    {!!favorites.length && <div className="quick-list" role="group" aria-label="Movimientos favoritos">
      {favorites.map(favorite => <button key={favorite.id} className="quick-button favorite-button"
        aria-label={'Registrar ' + favoriteName(favorite) + ' · ' + money(favorite.cents)} onClick={() => onUseFavorite(favorite)}>
        <CategoryBadge category={favorite.category} /><span className="favorite-info">
          <strong>{favoriteName(favorite)}</strong><small className="money">{money(favorite.cents)}</small>
        </span><Plus size={15} aria-hidden="true" />
      </button>)}
    </div>}
  </section>
}

export function FavoriteManager({ favorites, onEdit, onClose }: {
  favorites: Favorite[], onEdit: (favorite?: Favorite) => void, onClose: () => void,
}) {
  return <Modal title="Tus favoritos" onClose={onClose}>
    <ul className="favorite-manager">
      {favorites.map(favorite => <li key={favorite.id}><button className="secondary" onClick={() => onEdit(favorite)}
        aria-label={'Editar favorito ' + favoriteName(favorite) + ' · ' + money(favorite.cents)}>
        <CategoryBadge category={favorite.category} /><span className="favorite-info">
          <strong>{favoriteName(favorite)}</strong><small>{categories[favorite.category].name} · <span className="money">{money(favorite.cents)}</span></small>
        </span><ChevronRight size={16} />
      </button></li>)}
    </ul>
    <button className="primary wide" onClick={() => onEdit()}><Plus size={16} />Añadir favorito</button>
  </Modal>
}

function SpendingRing({ totals }: { totals: Summary }) {
  let start = 0
  const stops = totals.breakdown.map(({ category, share }) => {
    const from = start
    start += share * 100
    return categories[category].color + ' ' + from + '% ' + start + '%'
  })
  return <div className="ring" style={stops.length ? { background: 'conic-gradient(' + stops.join(', ') + ')' } : undefined}
    role="img" aria-label={'Gastos totales: ' + money(totals.expense)}>
    <div className="ring-center"><small>Total gastos</small><strong className="money">{money(totals.expense)}</strong></div>
  </div>
}

interface DashboardProps {
  account: { closing: number, total: number }
  openingCents: number
  onOpening: () => void
  totals: Summary
  entries: Entry[]
  month: string
  firstHistoryDay: string
  onAdd: (category?: CategoryId) => void
  onEdit: (entry: Entry) => void
  onEditRefund: (entry: Entry, refund: Refund) => void
  onHistory: (category?: CategoryId) => void
  onCategories: () => void
  favorites: Favorite[]
  onUseFavorite: (favorite: Favorite) => void
  onManageFavorites: () => void
}

export function Dashboard({ account, openingCents, onOpening, totals, entries, month, firstHistoryDay, onAdd, onEdit, onEditRefund, onHistory, onCategories, favorites, onUseFavorite, onManageFavorites }: DashboardProps) {
  const recent = movementRows(entries, month, firstHistoryDay).slice(0, 5)
  return <div className="view-stack">
    <Balance totals={totals} />
    <section className="panel account-strip" aria-label="Saldos de la cuenta">
      <button onClick={onOpening} aria-label="Editar saldo inicial"><small>Saldo inicial del banco</small><strong className="money">{money(openingCents)} <ChevronRight size={14} /></strong></button>
      <div><small>Saldo bancario al cierre</small><strong className="money">{money(account.closing)}</strong></div>
      <div><small>Saldo bancario total</small><strong className="money">{money(account.total)}</strong></div>
    </section>
    <QuickFavorites favorites={favorites} onUseFavorite={onUseFavorite} onManageFavorites={onManageFavorites} />
    <div className="overview-panels">
      <section className="panel recent-panel" aria-labelledby="recent-title">
        <div className="panel-heading"><h2 id="recent-title">Últimos movimientos</h2>
          <button className="text-button" onClick={() => onHistory()}>Ver todos <ArrowRight size={15} /></button></div>
        {recent.length ? <div className="entry-list">
          {recent.map(row => <MovementRow key={row.entry.id + (row.refund?.id ?? '')} movement={row} onEdit={onEdit} onEditRefund={onEditRefund} showDate />)}
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

export function History({ entries, month, firstHistoryDay, category, onClearCategory, onEdit, onEditRefund, onAdd }: {
  entries: Entry[], month: string | null, firstHistoryDay: string, category: CategoryId | null, onClearCategory: () => void,
  onEdit: (entry: Entry) => void, onEditRefund: (entry: Entry, refund: Refund) => void, onAdd: () => void,
}) {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<Kind | 'all'>('all')
  const [payment, setPayment] = useState<PaymentSource | 'all'>('all')
  const keyword = searchText(query)
  const rows = movementRows(entries, month, firstHistoryDay).filter(({ entry, refund }) => {
    const displayed = displayCategory(entry.category)
    return (kind === 'all' || (!refund && entry.kind === kind)) && (!category || displayed === category) &&
      (payment === 'all' || (refund?.payment ?? paymentSource(entry)) === payment) &&
      (!keyword || searchText([entry.concept, categories[displayed].name, refund ? 'Reembolso' : ''].join(' ')).includes(keyword))
  })
  const grouped = new Map<string, Movement[]>()
  const totals = { income: 0, expense: 0, refund: 0, withdrawal: 0 }
  for (const row of rows) {
    const group = grouped.get(row.date) ?? []
    group.push(row)
    grouped.set(row.date, group)
    if (row.refund) totals.refund += row.refund.cents
    else totals[row.entry.kind] += row.entry.cents
  }
  const totalRows = [
    ['Ingresos', totals.income], ['Gastos', totals.expense], ['Reembolsos', totals.refund], ['Retiradas', totals.withdrawal],
  ] as const
  const net = totals.income + totals.refund - totals.expense - totals.withdrawal
  const filtered = Boolean(keyword || category || kind !== 'all' || payment !== 'all')
  function reset() { setQuery(''); setKind('all'); setPayment('all'); onClearCategory() }
  return <section className="panel history-panel">
    <div className="history-tools">
      <label className="search-box"><Search size={18} /><input type="search" aria-label="Buscar movimientos"
        placeholder="Buscar por concepto o categoría" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <div className="filter-group" role="group" aria-label="Filtrar por tipo">
        {([['all', 'Todos'], ['expense', 'Gastos'], ['income', 'Ingresos'], ['withdrawal', 'Retiradas']] as const).map(([value, label]) =>
          <button key={value} aria-pressed={kind === value} onClick={() => setKind(value)}>{label}</button>)}
      </div>
      <div className="history-payment">
        <span>Forma de pago</span>
        <div className="filter-group" role="group" aria-label="Filtrar por forma de pago">
          {([['all', 'Todas'], ['cash', 'Efectivo'], ['bank', 'Cuenta bancaria']] as const).map(([value, label]) =>
            <button key={value} aria-pressed={payment === value} onClick={() => setPayment(value)}>{label}</button>)}
        </div>
      </div>
    </div>
    {category && <button className="filter-chip" aria-label={'Quitar filtro de ' + categories[category].name} onClick={onClearCategory}>
      <ListFilter size={14} />{categories[category].name}<X size={14} /></button>}
    {rows.length > 0 && <dl className="history-totals" aria-label="Totales de movimientos visibles" aria-live="polite">
      {totalRows.filter(([, cents]) => cents > 0).map(([label, cents]) => <div key={label}>
        <dt>{label}</dt><dd className="money">{money(cents)}</dd>
      </div>)}
      <div className="history-net"><dt>Neto visible</dt><dd className="money">{money(net)}</dd></div>
    </dl>}
    {rows.length ? [...grouped].map(([day, group]) => <div className="date-group" key={day}>
      <h2>{capitalize(dateLabel(day, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</h2>
      {group.map(row => <MovementRow key={row.entry.id + (row.refund?.id ?? '')} movement={row} onEdit={onEdit} onEditRefund={onEditRefund} />)}
    </div>) : <EmptyState title={filtered ? 'Sin resultados' : 'Aún no hay movimientos'}
      description={filtered ? 'Cambia la búsqueda o los filtros.' : 'Añade un movimiento o elige otro periodo.'}
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
        <CategoryBadge category={category} /><span className="rank-detail"><span><strong>{categories[category].name}</strong><b className="money">{money(cents)}</b></span>
          <span className="bar-track"><i style={{ width: (share * 100) + '%', backgroundColor: categories[category].color }} /></span>
        </span><small>{percent(share)}</small><ChevronRight size={15} />
      </button>) : <div className="available-categories">
        {categoryIds.filter(id => categories[id].kind === 'expense').map(id => <button key={id} onClick={() => onAdd(id)}
          aria-label={'Registrar en ' + categories[id].name}><CategoryBadge category={id} /><span>{categories[id].name}</span><Plus size={15} /></button>)}
      </div>}
    </section>
  </div>
}
