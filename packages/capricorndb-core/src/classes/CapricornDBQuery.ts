import { CapricornDBQueryCondition, CapricornDBQueryConditionDefault, CapricornDBQueryConditionLimit, CapricornDBQueryConditionLogical, CapricornDBQueryConditionOffset, CapricornDBQueryConditionOrder, CapricornDBQueryOperator } from '@/interfaces/CapricornDBQueryCondition'
import { CapricornDocument } from '@/types/CapricornDocument'
import { FlatKey } from '@/types/FlatKey'
import { CapricornDBSortDirection } from '@/types/sort'

export class CapricornDBQuery<T extends CapricornDocument = CapricornDocument> {
  private _conditions: CapricornDBQueryCondition[] = []

  /* @internal */
  and(...queries: CapricornDBQuery<T>[]): CapricornDBQuery<T> {
    this._conditions.push({ type: 'and', queries } as CapricornDBQueryConditionLogical)
    return this
  }

  /* @internal */
  or(...queries: CapricornDBQuery<T>[]): CapricornDBQuery<T> {
    this._conditions.push({ type: 'or', queries } as CapricornDBQueryConditionLogical)
    return this
  }

  /* @internal */
  where(field: FlatKey<T> | '_id', operator: CapricornDBQueryOperator, value: unknown): CapricornDBQuery<T> {
    this._conditions.push({ type: 'default', field: field as string, operator, value } as CapricornDBQueryConditionDefault)
    return this
  }

  /* @internal */
  order(field: FlatKey<T> | '_id', direction: CapricornDBSortDirection): CapricornDBQuery<T> {
    this._conditions.push({ type: 'order', field: field as string, direction } as CapricornDBQueryConditionOrder)
    return this
  }

  /* @internal */
  limit(limit: number): CapricornDBQuery<T> {
    this._conditions.push({ type: 'limit', limit } as CapricornDBQueryConditionLimit)
    return this
  }

  /* @internal */
  offset(offset: number): CapricornDBQuery<T> {
    this._conditions.push({ type: 'offset', offset } as CapricornDBQueryConditionOffset)
    return this
  }

  /* @internal */
  private _build(): { where: string | null, params: unknown[], order: string[], limit: number | null, offset: number | null } {
    const sqlParts: string[] = []
    const orderParts: string[] = []
    let limitClause: number | null = null
    let offsetClause: number | null = null
    const params: unknown[] = []
    for (const condition of this._conditions) {
      switch (condition.type) {
        case 'and':
        case 'or': {
          const _condition = condition as CapricornDBQueryConditionLogical
          const joiner = condition.type === 'and' ? ' AND ' : ' OR '
          const built = _condition.queries.map((q) => q._build())
          const subWheres = built.filter((b) => b.where !== null).map((b) => `(${b.where})`)
          if (subWheres.length > 0) {
            sqlParts.push(subWheres.join(joiner))
          }
          // ORDER BY / LIMIT / OFFSET are query-level clauses, so lift them out of the boolean group.
          for (const b of built) {
            params.push(...b.params)
            orderParts.push(...b.order)
            if (b.limit !== null) {
              limitClause = b.limit
            }
            if (b.offset !== null) {
              offsetClause = b.offset
            }
          }
          break
        }
        case 'default': {
          const _condition = condition as CapricornDBQueryConditionDefault
          const field = _condition.field == '_id' ? 'id' : `document->>'${_condition.field}'`
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
        case 'order': {
          const _condition = condition as CapricornDBQueryConditionOrder
          const field = _condition.field == '_id' ? 'id' : `document->>'${_condition.field}'`
          orderParts.push(`${field} ${_condition.direction.toUpperCase()}`)
          break
        }
        case 'limit': {
          const _condition = condition as CapricornDBQueryConditionLimit
          if (typeof _condition.limit !== 'number' || _condition.limit < 0) {
            throw new Error(`Invalid limit value: ${_condition.limit}. Limit must be a non-negative number.`)
          }
          limitClause = _condition.limit
          break
        }
        case 'offset': {
          const _condition = condition as CapricornDBQueryConditionOffset
          if (typeof _condition.offset !== 'number' || _condition.offset < 0) {
            throw new Error(`Invalid offset value: ${_condition.offset}. Offset must be a non-negative number.`)
          }
          offsetClause = _condition.offset
          break
        }
      }
    }
    return {
      where: sqlParts.length > 0 ? sqlParts.join(' AND ') : null,
      params,
      order: orderParts,
      limit: limitClause,
      offset: offsetClause
    }
  }

  /* @internal */
  getSQLAndParams(first: boolean = false): ({ sql: string, params: unknown[] }) | null {
    const built = this._build()
    if (built.where === null && built.order.length === 0 && built.limit === null && built.offset === null) {
      return null
    }
    const clauses: string[] = []
    if (built.where !== null) {
      clauses.push(`${first ? 'WHERE ' : ''}${built.where}`)
    }
    if (built.order.length > 0) {
      clauses.push(`ORDER BY ${built.order.join(', ')}`)
    }
    if (built.limit !== null) {
      clauses.push(`LIMIT ${built.limit}`)
    }
    if (built.offset !== null) {
      clauses.push(`OFFSET ${built.offset}`)
    }
    return {
      sql: clauses.join(' '),
      params: built.params
    }
  }
}

/**
 * Helper function to create a query from multiple conditions. This is just a shorthand for calling `and` on the collection.
 * @param queries The query conditions to combine with a logical AND.
 * @returns A new instance of CapricornDBQuery with the combined conditions.
 * @notice Use `collection.createQuery` instead of this function to ensure proper typing without needing to specify the generic type parameter.
 * @example
 * const query = createQuery<YourDocumentType>(
 *   where('age', 'gte', 30),
 *   or(
 *     where('flags', 'array-contains', 'active'),
 *     where('address.city', 'eq', 'Sometown'),
 *     where('name', 'eq', 'Bob')
 *   )
 * )
 */
export const createQuery = <T extends CapricornDocument>(...queries: CapricornDBQuery<T>[]) => {
  return and<T>(...queries)
}

/**
 * Queries documents where a specific field matches a condition.
 * @param field The field to apply the condition on.
 * @param operator The operator to use for the condition.
 * @param value The value to compare the field against.
 * @returns A new instance of CapricornDBQuery with the specified condition.
 * @example
 * const query = collection.createQuery(
 *   where('age', 'gte', 30)
 * )
 * @example
 * const query = collection.createQuery(
 *   where('flags', 'array-contains', 'active')
 * )
 * @example
 * const query = collection.createQuery(
 *   where('address.city', 'eq', 'Sometown')
 * )
 */
export const where = <T extends CapricornDocument>(field: FlatKey<T> | '_id', operator: CapricornDBQueryOperator, value: unknown): CapricornDBQuery<T> => {
  return new CapricornDBQuery<T>().where(field, operator, value)
}

/**
 * Combines multiple queries with a logical AND. All conditions must be met for a document to match.
 * @param queries The queries to combine with a logical AND.
 * @returns A new instance of CapricornDBQuery with the combined conditions.
 * @example
 * const query = collection.createQuery(
 *   and(
 *     where('age', 'gte', 30),
 *     where('flags', 'array-contains', 'active')
 *   )
 * )
 */
export const and = <T extends CapricornDocument>(...queries: CapricornDBQuery<T>[]): CapricornDBQuery<T> => {
  return new CapricornDBQuery<T>().and(...queries)
}

/**
 * Combines multiple queries with a logical OR. At least one of the conditions must be met for a document to match.
 * @param queries The queries to combine with a logical OR.
 * @returns A new instance of CapricornDBQuery with the combined conditions.
 * @example
 * const query = collection.createQuery(
 *   or(
 *     where('flags', 'array-contains', 'active'),
 *     where('address.city', 'eq', 'Sometown'),
 *     where('name', 'eq', 'Bob')
 *   )
 * )
 */
export const or = <T extends CapricornDocument>(...queries: CapricornDBQuery<T>[]): CapricornDBQuery<T> => {
  return new CapricornDBQuery<T>().or(...queries)
}