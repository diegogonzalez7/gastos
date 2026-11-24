import { categories, MAX_CENTS, MAX_CONCEPT, type Entry } from './ledger'

export type Favorite = Pick<Entry, 'id' | 'category' | 'concept' | 'cents' | 'payment'>
export const favoritesKey = 'mi-dinero:favorites'

export const favoriteName = (favorite: Favorite) => favorite.concept || categories[favorite.category].name

export function readFavorites(): Favorite[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(favoritesKey) ?? '[]')
    return Array.isArray(data) ? data.filter((favorite): favorite is Favorite =>
      typeof favorite?.id === 'string' && typeof favorite.category === 'string' && Object.hasOwn(categories, favorite.category) &&
      typeof favorite.concept === 'string' && favorite.concept.length <= MAX_CONCEPT &&
      (favorite.payment === undefined || favorite.payment === 'cash' || favorite.payment === 'bank') &&
      Number.isSafeInteger(favorite.cents) && favorite.cents > 0 && favorite.cents <= MAX_CENTS) : []
  } catch { return [] }
}

export function saveFavorite(id: string, next: Favorite | null): Favorite[] {
  const favorites = readFavorites()
  const index = favorites.findIndex(favorite => favorite.id === id)
  if (next && index === -1) favorites.push(next)
  else if (index !== -1) favorites.splice(index, 1, ...(next ? [next] : []))
  localStorage.setItem(favoritesKey, JSON.stringify(favorites))
  return favorites
}
