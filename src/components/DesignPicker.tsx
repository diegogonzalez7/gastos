import { Check } from 'lucide-react'
import { onePieceDesigns, standardDesigns, type Design, type Theme } from '../appearance'
import { Modal } from './ui'

export function DesignPicker({ selected, originalTheme, onChange, onClose, onBack }: {
  selected: Design, originalTheme: Theme, onChange: (id: Design) => void, onClose: () => void, onBack: () => void,
}) {
  function option({ id, label, description }: { id: Design, label: string, description: string }, landscape = false) {
    return <button key={id} className="design-option" aria-label={label}
        aria-pressed={selected === id} onClick={() => onChange(id)}>
        {landscape ? <span className="design-landscape-preview" data-preview={id} aria-hidden="true" /> :
        <span className="design-preview" data-preview={id} data-mode={id === 'original' ? originalTheme : undefined} aria-hidden="true">
          <i className="design-preview-rail" />
          <span className="design-preview-content">
            <i className="design-preview-balance" />
            <span className="design-preview-cards"><i /><i /></span>
          </span>
        </span>}
        <span className="design-option-label">
          <strong>{label}</strong>
          <small>{description}</small>
        </span>
        {selected === id && <Check className="design-option-check" size={16} aria-hidden="true" />}
      </button>
  }

  return <Modal title="Diseños de Mi Dinero" onClose={onClose} onBack={onBack} className="design-dialog">
    <div className="design-grid design-grid-standard" role="group" aria-label="Diseños">
      {standardDesigns.map(design => option(design))}
    </div>
    <section className="design-collection" aria-labelledby="one-piece-title">
      <h3 id="one-piece-title">One Piece</h3>
      <p>Cuatro paisajes animados inspirados en la aventura de los Sombrero de Paja, entre islas, mares y cielos de la historia.</p>
      <div className="design-grid">{onePieceDesigns.map(design => option(design, true))}</div>
    </section>
  </Modal>
}
