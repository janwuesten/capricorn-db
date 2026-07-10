import { CapricornDBQuery } from '@/classes/CapricornDBQuery'

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
  type: 'default' | 'and' | 'or'
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