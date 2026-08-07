import { CapricornDBQuery } from '@/classes/query'
import { WithCapricornID } from './document'
import { CapricornDocument } from './document'

export type CapricornDocumentFilter<T extends CapricornDocument> = {
  [K in keyof T]?: T[K] extends string | number | boolean | null ? T[K] : never
}
export type CapricornDBFilter<T extends CapricornDocument> =  Partial<WithCapricornID<CapricornDocumentFilter<T>>> | CapricornDBQuery