import { CapricornDocument } from './document'

export type FindOptions<T extends CapricornDocument> = {
  limit?: number
  offset?: number
  sort?: {
    [P in keyof T]?: 'asc' | 'desc'
  }
}