import { CapricornDBCoreService, CapricornDBQueue, CapricornDocumentID } from '@janwuesten/capricorndb-core'
import type { NitroSQLiteConnection, SQLiteQueryParams } from 'react-native-nitro-sqlite'

/**
 * CapricornDBService is a service class that implements the CapricornDBCoreService interface for the Node.js environment.
 * Do not use this class directly. Instead, use the createCapricornDB function to create an instance of CapricornDB with this service.
 */
export class CapricornDBService extends CapricornDBCoreService {
  private database: NitroSQLiteConnection
  private queue: CapricornDBQueue = new CapricornDBQueue()

  constructor(database: NitroSQLiteConnection) {
    super()
    this.database = database
  }
  public async startTransaction(): Promise<void> {
    return this.queue.enqueue(async () => {
      try {
        await this.database.executeAsync('BEGIN TRANSACTION')
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : String(error))
      }
    })
  }
  public async commitTransaction(): Promise<void> {
    return this.queue.enqueue(async () => {
      try {
        await this.database.executeAsync('COMMIT')
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : String(error))
      }
    })
  }
  public async rollbackTransaction(): Promise<void> {
    return this.queue.enqueue(async () => {
      try {
        await this.database.executeAsync('ROLLBACK')
        /* eslint-disable no-empty */
      } catch {
      }
    })
  }
  public async listTables(): Promise<string[]> {
    return this.queue.enqueue(async () => {
      try {
        const { results } = await this.database.executeAsync('SELECT name FROM sqlite_master WHERE type=\'table\'')
        return results.map((row) => row.name?.toString() || '')
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : String(error))
      }
    })
  }
  public async execute(query: string, params: SQLiteQueryParams = []): Promise<void> {
    return this.queue.enqueue(async () => {
      try {
        await this.database.executeAsync(query, params)
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : String(error))
      }
    })
  }
  public async insert(query: string, params?: SQLiteQueryParams): Promise<CapricornDocumentID> {
    return this.queue.enqueue(async () => {
      try {
        const { insertId } = await this.database.executeAsync(query, params || [])
        return insertId?.toString() ?? ""
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : String(error))
      }
    })
  }
  public async delete(query: string, params?: SQLiteQueryParams): Promise<void> {
    return this.queue.enqueue(async () => {
      try {
        await this.database.executeAsync(query, params || [])
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : String(error))
      }
    })
  }
  public async update(query: string, params?: SQLiteQueryParams): Promise<void> {
    return this.queue.enqueue(async () => {
      try {
        await this.database.executeAsync(query, params || [])
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : String(error))
      }
    })
  }
  public async queryMultiple<T>(query: string, params?: SQLiteQueryParams): Promise<T[]> {
    return this.queue.enqueue(async () => {
      try {
        const { results } = await this.database.executeAsync(query, params || [])
        return results as T[]
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : String(error))
      }
    })
  }
  public async querySingle<T>(query: string, params?: SQLiteQueryParams): Promise<T | null> {
    return this.queue.enqueue(async () => {
      try {
        const { results } = await this.database.executeAsync(query, params || [])
        return (results[0] as T) || null
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : String(error))
      }
    })
  }
  public async generateDocumentID(): Promise<CapricornDocumentID> {
    const ts = Math.floor(Date.now() / 1000).toString(16)
    const random = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
    return ts + random
  }
  public async close(): Promise<void> {
    return this.queue.enqueue(async () => {
      try {
        this.database.close()
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : String(error))
      }
    })
  }
}