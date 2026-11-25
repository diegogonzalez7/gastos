import { Check } from 'lucide-react'
import { designs, type Design, type Theme } from '../appearance'
import { Modal } from './ui'

export function DesignPicker({ selected, originalTheme, onChange, onClose, onBack }: {
  selected: Design, originalTheme: Theme, onChange: (id: Design) => void, onClose: () => void, onBack: () => void,
}) {
  return <Modal title="Diseños de Mi Dinero" onClose={onClose} onBack={onBack} className="design-dialog">
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
