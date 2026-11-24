import { Check } from 'lucide-react'
import { Modal } from './ui'

const designs = [
  { id: 'original', label: 'Original', description: 'La apariencia de siempre' },
  { id: 'midnight', label: 'Medianoche', description: 'Azul tinta y líneas técnicas' },
  { id: 'graphite', label: 'Grafito', description: 'Carbón y acentos ámbar' },
  { id: 'plum', label: 'Ciruela', description: 'Violeta oscuro y formas suaves' },
  { id: 'sand', label: 'Arena', description: 'Crema cálida y terracota' },
] as const

export type Design = typeof designs[number]['id']
export type Theme = 'system' | 'light' | 'dark'
export const designKey = 'mi-dinero:design'

export function designLabel(id: Design) {
  return designs.find(design => design.id === id)!.label
}

export function savedDesign(): Design {
  const id = document.documentElement.dataset.design
  return designs.find(design => design.id === id)?.id ?? 'original'
}

export function DesignPicker({ selected, originalTheme, onChange, onClose }: {
  selected: Design, originalTheme: Theme, onChange: (id: Design) => void, onClose: () => void,
}) {
  return <Modal title="Diseños de Mi Dinero" onClose={onClose} className="design-dialog">
    <div className="design-grid" role="group" aria-label="Diseños">
      {designs.map(({ id, label, description }) => <button key={id} className="design-option" aria-label={label}
        aria-pressed={selected === id} onClick={() => onChange(id)}>
        <span className="design-preview" data-preview={id} data-mode={id === 'original' ? originalTheme : undefined} aria-hidden="true">
          <i className="design-preview-rail" />
          <span className="design-preview-content">
            <i className="design-preview-balance" />
            <span className="design-preview-cards"><i /><i /></span>
          </span>
        </span>
        <span className="design-option-label">
          <strong>{label}</strong>
          <small>{description}</small>
        </span>
        {selected === id && <Check className="design-option-check" size={16} aria-hidden="true" />}
      </button>)}
    </div>
  </Modal>
}
