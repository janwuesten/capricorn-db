import { CapricornDBQueryCondition, CapricornDBQueryConditionDefault, CapricornDBQueryConditionLogical, CapricornDBQueryOperator } from '@/interfaces/CapricornDBQueryCondition'

export class CapricornDBQuery {
  private _conditions: CapricornDBQueryCondition[] = []

  public and(...queries: CapricornDBQuery[]): CapricornDBQuery {
    this._conditions.push({ type: 'and', queries } as CapricornDBQueryConditionLogical)
    return this
  }

  public or(...queries: CapricornDBQuery[]): CapricornDBQuery {
    this._conditions.push({ type: 'or', queries } as CapricornDBQueryConditionLogical)
    return this
  }

  public where(field: string, operator: CapricornDBQueryOperator, value: unknown): CapricornDBQuery {
    this._conditions.push({ type: 'default', field, operator, value } as CapricornDBQueryConditionDefault)
    return this
  }

  /* @internal */
  getSQLAndParams(first: boolean = false): ({ sql: string, params: unknown[] }) | null {
    const sqlParts: string[] = []
    const params: unknown[] = []
    for (const condition of this._conditions) {
      switch (condition.type) {
        case 'and': {
          const _condition = condition as CapricornDBQueryConditionLogical
          const parts = _condition.queries.map((q) => q.getSQLAndParams()).filter((p): p is { sql: string, params: unknown[] } => p !== null)
          sqlParts.push(parts.map((p) => `(${p.sql})`).join(' AND '))
          params.push(...parts.flatMap((p) => p.params))
          break
        }
        case 'or': {
          const _condition = condition as CapricornDBQueryConditionLogical
          const parts = _condition.queries.map((q) => q.getSQLAndParams()).filter((p): p is { sql: string, params: unknown[] } => p !== null)
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
            case 'starts-with':
              sqlParts.push(`${field} LIKE ?`)
              params.push(`${_condition.value}%`)
              break
            case 'ends-with':
              sqlParts.push(`${field} LIKE ?`)
              params.push(`%${_condition.value}`)
              break
            case 'contains-case-sensitive':
              sqlParts.push(`${field} GLOB ?`)
              params.push(`*${_condition.value}*`)
              break
            case 'starts-with-case-sensitive':
              sqlParts.push(`${field} GLOB ?`)
              params.push(`${_condition.value}*`)
              break
            case 'ends-with-case-sensitive':
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
            case 'array-contains':
              sqlParts.push(`EXISTS (SELECT 1 FROM json_each(${field}) WHERE value = ?)`)
              params.push(_condition.value)
              break
            case 'array-contains-any':
              sqlParts.push(`EXISTS (SELECT 1 FROM json_each(${field}) WHERE value IN (${(_condition.value as unknown[]).map(() => '?').join(',')}))`)
              params.push(...(_condition.value as unknown[]))
              break
            case 'array-not-contains':
              sqlParts.push(`NOT EXISTS (SELECT 1 FROM json_each(${field}) WHERE value = ?)`)
              params.push(_condition.value)
              break
            case 'array-not-contains-any':
              sqlParts.push(`NOT EXISTS (SELECT 1 FROM json_each(${field}) WHERE value IN (${(_condition.value as unknown[]).map(() => '?').join(',')}))`)
              params.push(...(_condition.value as unknown[]))
              break
          }
          break
        }
      }
    }
    if (sqlParts.length === 0) {
      return null
    }
    if (first) {
      return {
        sql: `WHERE ${sqlParts.join(' AND ')}`,
        params
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