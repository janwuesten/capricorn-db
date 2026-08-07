import { CapricornDBQuery } from '@/classes/query'
import { CapricornDBSortDirection } from '@/types/sort'

export type CapricornDBQueryOperator =
  'eq' |
  'ne' |
  'gt' |
  'gte' |
  'lt' |
  'lte' |
  'in' |
  'nin' |
  'contains' |
  'starts-with' |
  'ends-with' |
  'contains-case-sensitive' |
  'starts-with-case-sensitive' |
  'ends-with-case-sensitive' |
  'exists' |
  'not-exists' |
  'array-contains' |
  'array-contains-any' |
  'array-not-contains' |
  'array-not-contains-any'
export interface CapricornDBQueryCondition {
  type: 'default' | 'and' | 'or' | 'order' | 'limit' | 'offset'
}
export interface CapricornDBQueryConditionDefault extends CapricornDBQueryCondition {
  type: 'default'
  field: string
  operator: CapricornDBQueryOperator
  value: unknown
}
export interface CapricornDBQueryConditionLogical extends CapricornDBQueryCondition {
  type: 'and' | 'or'
  queries: CapricornDBQuery[]
}
export interface CapricornDBQueryConditionOrder extends CapricornDBQueryCondition {
  type: 'order'
  field: string
  direction: CapricornDBSortDirection
}
export interface CapricornDBQueryConditionLimit extends CapricornDBQueryCondition {
  type: 'limit'
  limit: number
}
export interface CapricornDBQueryConditionOffset extends CapricornDBQueryCondition {
  type: 'offset'
  offset: number
}