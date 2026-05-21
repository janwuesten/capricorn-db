import { CollectionName } from '@/types/CollectionName'
import { CapricornDBCoreService } from './CapricornDBCoreService'
import { CapricornDBCollection } from './CapricornDBCollection'
import { CapricornDocument } from '@/types/CapricornDocument'
import { CapricornDocumentID } from '@/types/CapricornDocumentID'
import { CapricornDBTransaction, CapricornDBTransactionCallback } from './CapricornDBTransaction'
import { DatabaseError } from '@/errors/database'

interface CapricornDBCreateOptions {
  service: CapricornDBCoreService
}
export class CapricornDB<Service extends CapricornDBCoreService = CapricornDBCoreService> {
  /** @internal */
  _service: Service

  /** @internal */
  _collections: string[] = []

  private constructor(service: Service) {
    this._service = service
  }

  static async _create(options: CapricornDBCreateOptions): Promise<CapricornDB> {
    try {
      const capricorn = new CapricornDB(options.service)
      const tables = await capricorn._service.listTables()
      if (!tables.includes('capricorn')) {
        await capricorn._service.performQuery(`
          CREATE TABLE "capricorn" (
            key TEXT,
            value BLOB,
            PRIMARY KEY (key)
          )
        `)
        await capricorn.setCapricornValue('installation', {
          version: '0.0.1',
          createdAt: new Date().getTime()
        })
      }
      const collectionTables = tables.filter((table) => table.startsWith('c.'))
      capricorn._collections = collectionTables.map((table) => table.replace('c.', ''))
      return capricorn
    } catch (err) {
      throw new DatabaseError('Failed to initialize CapricornDB: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  getCollectionNames(): string[] {
    return this._collections
  }

  async setCapricornValue(key: string, value: Record<string, unknown>): Promise<void> {
    try {
      await this._service.performQuery(`
        INSERT INTO "capricorn" (key, value) VALUES (?, jsonb(?))
        ON CONFLICT(key) DO UPDATE SET value=excluded.value
      `, [key, JSON.stringify(value)])
    } catch (err) {
      throw new DatabaseError('Failed to set Capricorn value: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  async getCapricornValue<T extends Record<string, unknown>>(key: string): Promise<T | null> {
    try {
      const result = await this._service.querySingleDocument<{ value: string }>(`
        SELECT json(value) FROM "capricorn" WHERE key = ?
      `, [key])
      if (!result) {
        return null
      }
      return JSON.parse(result.value) as T
    } catch (err) {
      throw new DatabaseError('Failed to get Capricorn value: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  /** @internal */
  _currentTransaction: CapricornDBTransaction | null = null
  async withTransaction(callback: CapricornDBTransactionCallback): Promise<CapricornDBTransaction> {
    const transaction = new CapricornDBTransaction({
      capricorn: this,
      callback
    })
    await transaction.execute()
    return transaction
  }

  async newDocumentID(): Promise<CapricornDocumentID> {
    return await this._service.generateDocumentID()
  }
  collection<T extends CapricornDocument>(collectionName: CollectionName) {
    return new CapricornDBCollection<T>({
      collectionName,
      capricorn: this
    })
  }
}