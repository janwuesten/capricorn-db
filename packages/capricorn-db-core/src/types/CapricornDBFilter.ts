import { CapricornDBQuery } from '@/classes/CapricornDBQuery'
import { WithCapricornID } from './CapricornDocumentID'
import { CapricornDocument } from './CapricornDocument'

export type CapricornDocumentFilter<T extends CapricornDocument> = {
  [K in keyof T]?: T[K] extends string | number | boolean | null ? T[K] : never
}
export type CapricornDBFilter<T extends CapricornDocument> =  Partial<WithCapricornID<CapricornDocumentFilter<T>>> | CapricornDBQuery