import { CapricornDBCoreService, CapricornDBQueue, CapricornDocumentID, DatabaseError } from '@janwuesten/capricorndb-core'
import { DatabaseSync, SQLInputValue } from 'node:sqlite'
import { randomBytes } from 'node:crypto'
import { unlinkSync } from 'node:fs'
import { CapricornDBCreateOptions } from '..'

/**
 * CapricornDBService is a service class that implements the CapricornDBCoreService interface for the Node.js environment.
 * Do not use this class directly. Instead, use the createCapricornDB function to create an instance of CapricornDB with this service.
 */
export class CapricornDBService extends CapricornDBCoreService {
  private database: DatabaseSync
  private options: CapricornDBCreateOptions
  private queue: CapricornDBQueue = new CapricornDBQueue()

  constructor(database: DatabaseSync, options: CapricornDBCreateOptions) {
    super()
    this.options = options
    this.database = database
  }
  public async startTransaction(): Promise<void> {
    return this.queue.enqueue(() => {
      try {
        this.database.prepare('BEGIN TRANSACTION').run()
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : String(error))
      }
    })
  }
  public async commitTransaction(): Promise<void> {
    return this.queue.enqueue(() => {
      try {
        this.database.prepare('COMMIT').run()
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : String(error))
      }
    })
  }
  public async rollbackTransaction(): Promise<void> {
    return this.queue.enqueue(() => {
      try {
        this.database.prepare('ROLLBACK').run()
        /* eslint-disable no-empty */
      } catch {

      }
    })
  }
  public async listTables(): Promise<string[]> {
    return this.queue.enqueue(() => {
      try {
        const result = this.database.prepare('SELECT name FROM sqlite_master WHERE type=\'table\'').all()
        return result.map((row) => row.name?.toString() || '')
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : String(error))
      }
    })
  }
  public async execute(query: string, params: SQLInputValue[] = []): Promise<void> {
    return this.queue.enqueue(() => {
      try {
        this.database.prepare(query).run(...params)
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : String(error))
      }
    })
  }
  public async insert(query: string, params?: SQLInputValue[]): Promise<CapricornDocumentID> {
    return this.queue.enqueue(() => {
      try {
        const result = this.database.prepare(query).run(...(params || []))
        return result.lastInsertRowid.toString()
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : String(error))
      }
    })
  }
  public async delete(query: string, params?: SQLInputValue[]): Promise<void> {
    return this.queue.enqueue(() => {
      try {
        this.database.prepare(query).run(...(params || []))
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : String(error))
      }
    })
  }
  public async update(query: string, params?: SQLInputValue[]): Promise<void> {
    return this.queue.enqueue(() => {
      try {
        this.database.prepare(query).run(...(params || []))
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : String(error))
      }
    })
  }
  public async queryMultiple<T>(query: string, params?: SQLInputValue[]): Promise<T[]> {
    return this.queue.enqueue(() => {
      try {
        const result = this.database.prepare(query).all(...(params || []))
        return result as T[]
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : String(error))
      }
    })
  }
  public async querySingle<T>(query: string, params?: SQLInputValue[]): Promise<T | null> {
    return this.queue.enqueue(() => {
      try {
        const result = this.database.prepare(query).get(...(params || []))
        return (result as T) || null
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : String(error))
      }
    })
  }
  public async generateDocumentID(): Promise<CapricornDocumentID> {
    const ts = Math.floor(Date.now() / 1000).toString(16)
    const random = randomBytes(8).toString('hex')
    return ts + random
  }
  public async close(): Promise<void> {
    return this.queue.enqueue(async () => {
      try {
        this.database.close()
      } catch (error) {
        throw new DatabaseError('Failed to close the database connection.', error)
      }
    })
  }
  public async deleteDatabase(): Promise<void> {
    return this.queue.enqueue(async () => {
      try {
        const path = this.options.path
        unlinkSync(path)
      } catch (error) {
        throw new DatabaseError('Failed to delete the database file.', error)
      }
    })
  }
}