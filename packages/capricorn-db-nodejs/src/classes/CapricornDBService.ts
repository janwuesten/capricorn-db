import { CapricornDBCoreService, CapricornDocumentID } from '@janwuesten/capricorn-db-core'
import { DatabaseSync, SQLInputValue } from 'node:sqlite'
import { randomBytes } from 'node:crypto'

export class CapricornDBService extends CapricornDBCoreService {
  private database: DatabaseSync

  constructor(database: DatabaseSync) {
    super()
    this.database = database
  }
  async startTransaction(): Promise<void> {
    try {
      this.database.prepare('BEGIN TRANSACTION').run()
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error))
    }
  }
  async commitTransaction(): Promise<void> {
    try {
      this.database.prepare('COMMIT').run()
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error))
    }
  }
  async rollbackTransaction(): Promise<void> {
    try {
      this.database.prepare('ROLLBACK').run()
      /* eslint-disable no-empty */
    } catch {

    }
  }
  async listTables(): Promise<string[]> {
    try {
      const result = this.database.prepare('SELECT name FROM sqlite_master WHERE type=\'table\'').all()
      return result.map((row) => row.name?.toString() || '')
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error))
    }
  }
  async performQuery(query: string, params: SQLInputValue[] = []): Promise<void> {
    try {
      this.database.prepare(query).run(...params)
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error))
    }
  }
  async insertDocument(query: string, params?: SQLInputValue[]): Promise<CapricornDocumentID> {
    try {
      const result = this.database.prepare(query).run(...(params || []))
      return result.lastInsertRowid.toString()
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error))
    }
  }
  async deleteDocument(query: string, params?: SQLInputValue[]): Promise<void> {
    try {
      this.database.prepare(query).run(...(params || []))
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error))
    }
  }
  async updateDocument(query: string, params?: SQLInputValue[]): Promise<void> {
    try {
      this.database.prepare(query).run(...(params || []))
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error))
    }
  }
  async queryMultipleDocuments<T>(query: string, params?: SQLInputValue[]): Promise<T[]> {
    try {
      const result = this.database.prepare(query).all(...(params || []))
      return result as T[]
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error))
    }
  }
  async querySingleDocument<T>(query: string, params?: SQLInputValue[]): Promise<T | null> {
    try {
      const result = this.database.prepare(query).get(...(params || []))
      return (result as T) || null
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : String(error))
    }
  }
  async generateDocumentID(): Promise<CapricornDocumentID> {
    const ts = Math.floor(Date.now() / 1000).toString(16)
    const random = randomBytes(8).toString('hex')
    return ts + random
  }
}