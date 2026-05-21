export type CapricornDBQueryOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'startsWith' | 'endsWith' | 'contains-case-sensitive' | 'startsWith-case-sensitive' | 'endsWith-case-sensitive' | 'exists' | 'not-exists'
interface CapricornDBQueryCondition {
  type: 'default' | 'and' | 'or'
}
interface CapricornDBQueryConditionDefault extends CapricornDBQueryCondition {
  type: 'default'
  field: string
  operator: CapricornDBQueryOperator
  value: unknown
}
interface CapricornDBQueryConditionLogical extends CapricornDBQueryCondition {
  type: 'and' | 'or'
  queries: CapricornDBQuery[]
}
export class CapricornDBQuery {
  private _conditions: CapricornDBQueryCondition[] = []

  and(...queries: CapricornDBQuery[]): CapricornDBQuery {
    this._conditions.push({ type: 'and', queries } as CapricornDBQueryConditionLogical)
    return this
  }

  or(...queries: CapricornDBQuery[]): CapricornDBQuery {
    this._conditions.push({ type: 'or', queries } as CapricornDBQueryConditionLogical)
    return this
  }

  where(field: string, operator: CapricornDBQueryOperator, value: unknown): CapricornDBQuery {
    this._conditions.push({ type: 'default', field, operator, value } as CapricornDBQueryConditionDefault)
    return this
  }

  public _getSQLAndParams(): { sql: string, params: unknown[] } {
    const sqlParts: string[] = []
    const params: unknown[] = []
    for (const condition of this._conditions) {
      switch (condition.type) {
        case 'and': {
          const _condition = condition as CapricornDBQueryConditionLogical
          const parts = _condition.queries.map((q) => q._getSQLAndParams())
          sqlParts.push(parts.map((p) => `(${p.sql})`).join(' AND '))
          params.push(...parts.flatMap((p) => p.params))
          break
        }
        case 'or': {
          const _condition = condition as CapricornDBQueryConditionLogical
          const parts = _condition.queries.map((q) => q._getSQLAndParams())
          sqlParts.push(parts.map((p) => `(${p.sql})`).join(' OR '))
          params.push(...parts.flatMap((p) => p.params))
          break
        }
        case 'default': {
          const _condition = condition as CapricornDBQueryConditionDefault
          const field = _condition.field == 'id' ? 'id' : `document->>'${_condition.field}'`
          switch (_condition.operator) {
            case 'eq':
              sqlParts.push(`${field} = ?`)
              params.push(_condition.value)
              break
            case 'ne':
              sqlParts.push(`${field} != ?`)
              params.push(_condition.value)
              break
            case 'gt':
              sqlParts.push(`${field} > ?`)
              params.push(_condition.value)
              break
            case 'gte':
              sqlParts.push(`${field} >= ?`)
              params.push(_condition.value)
              break
            case 'lt':
              sqlParts.push(`${field} < ?`)
              params.push(_condition.value)
              break
            case 'lte':
              sqlParts.push(`${field} <= ?`)
              params.push(_condition.value)
              break
            case 'in':
              sqlParts.push(`${field} IN (${(_condition.value as unknown[]).map(() => '?').join(',')})`)
              params.push(...(_condition.value as unknown[]))
              break
            case 'nin':
              sqlParts.push(`${field} NOT IN (${(_condition.value as unknown[]).map(() => '?').join(',')})`)
              params.push(...(_condition.value as unknown[]))
              break
            case 'contains':
              sqlParts.push(`${field} LIKE ?`)
              params.push(`%${_condition.value}%`)
              break
            case 'startsWith':
              sqlParts.push(`${field} LIKE ?`)
              params.push(`${_condition.value}%`)
              break
            case 'endsWith':
              sqlParts.push(`${field} LIKE ?`)
              params.push(`%${_condition.value}`)
              break
            case 'contains-case-sensitive':
              sqlParts.push(`${field} GLOB ?`)
              params.push(`*${_condition.value}*`)
              break
            case 'startsWith-case-sensitive':
              sqlParts.push(`${field} GLOB ?`)
              params.push(`${_condition.value}*`)
              break
            case 'endsWith-case-sensitive':
              sqlParts.push(`${field} GLOB ?`)
              params.push(`*${_condition.value}`)
              break
            case 'exists':
              sqlParts.push(`${field} IS NOT NULL`)
              params.push(_condition.field)
              break
            case 'not-exists':
              sqlParts.push(`${field} IS NULL`)
              params.push(_condition.field)
              break
          }
          break
        }
      }
    }
    return {
      sql: sqlParts.join(' AND '),
      params
    }
  }
}

export const capricornDBQuery = () => {
  return new CapricornDBQuery()
}
export const where = (field: string, operator: CapricornDBQueryOperator, value: unknown): CapricornDBQuery => {
  return new CapricornDBQuery().where(field, operator, value)
}
export const and = (...queries: CapricornDBQuery[]): CapricornDBQuery => {
  return new CapricornDBQuery().and(...queries)
}
export const or = (...queries: CapricornDBQuery[]): CapricornDBQuery => {
  return new CapricornDBQuery().or(...queries)
}