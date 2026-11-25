import { categories, validFavorite, type Favorite } from './ledger'

export type { Favorite } from './ledger'
const favoritesKey = 'mi-dinero:favorites'

export const favoriteName = (favorite: Favorite) => favorite.concept || categories[favorite.category].name

export function readFavorites(): Favorite[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(favoritesKey) ?? '[]')
    return Array.isArray(data) ? data.filter(validFavorite) : []
  } catch { return [] }
}
