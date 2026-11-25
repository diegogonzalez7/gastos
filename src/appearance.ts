export const standardDesigns = [
  { id: 'original', label: 'Original', description: 'La apariencia de siempre' },
  { id: 'midnight', label: 'Medianoche', description: 'Azul tinta y líneas técnicas' },
  { id: 'graphite', label: 'Grafito', description: 'Carbón y acentos ámbar' },
  { id: 'plum', label: 'Ciruela', description: 'Violeta oscuro y formas suaves' },
  { id: 'sand', label: 'Arena', description: 'Crema cálida y terracota' },
] as const

export const onePieceDesigns = [
  { id: 'one-piece-elbaph', label: 'Raíces de Elbaph', description: 'Hojas doradas bajo el árbol de los gigantes' },
  { id: 'one-piece-luna', label: 'Luna libre', description: 'Gear 5 bajo una luna de plata' },
  { id: 'one-piece-alba', label: 'Rumbo al alba', description: 'El Thousand Sunny navega al atardecer' },
  { id: 'one-piece-wano', label: 'Faroles de Wano', description: 'Cerezos y faroles en la Capital de las Flores' },
] as const

const designs = [...standardDesigns, ...onePieceDesigns]

export type Design = typeof designs[number]['id']
export type Theme = 'system' | 'light' | 'dark'
const designKey = 'mi-dinero:design'
const themeKey = 'mi-dinero:theme'

export const designLabel = (id: Design) => designs.find(design => design.id === id)!.label
export const validDesign = (value: unknown): value is Design => designs.some(design => design.id === value)
export const hasLandscape = (id: Design) => onePieceDesigns.some(design => design.id === id)
export const validTheme = (value: unknown): value is Theme => value === 'system' || value === 'light' || value === 'dark'

export function savedDesign(): Design {
  try {
    const design = localStorage.getItem(designKey)
    if (validDesign(design)) return design
  } catch { /* Default appearance works without Web Storage. */ }
  return 'original'
}

export function savedTheme(): Theme {
  try {
    const theme = localStorage.getItem(themeKey)
    if (validTheme(theme)) return theme
  } catch { /* System appearance works without Web Storage. */ }
  return 'system'
}

export function cacheAppearance(theme: Theme, design: Design) {
  try {
    localStorage.setItem(themeKey, theme)
    localStorage.setItem(designKey, design)
  } catch { /* IndexedDB holds the saved settings. */ }
}
