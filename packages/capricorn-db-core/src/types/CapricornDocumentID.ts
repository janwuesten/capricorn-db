export type CapricornDocumentID = string
export type WithCapricornID<T> = T & { id: CapricornDocumentID }
export const isValidCapricornDocumentID = (value: unknown): value is CapricornDocumentID => {
  if (typeof value !== 'string') {
    return false
  }
  return /^[a-f0-9]{24}$/.test(value)
}