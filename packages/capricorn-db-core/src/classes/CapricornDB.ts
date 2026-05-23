import { CollectionName } from '@/types/CollectionName'
import { CapricornDBCoreService } from './CapricornDBCoreService'
import { CapricornDBCollection } from './CapricornDBCollection'
import { CapricornDocument } from '@/types/CapricornDocument'
import { CapricornDocumentID } from '@/types/CapricornDocumentID'
import { CapricornDBTransaction, CapricornDBTransactionCallback } from './CapricornDBTransaction'
import { DatabaseError } from '@/errors/database'
import { CapricornDBEventHandler } from './CapricornDBEventHandler'

interface CapricornDBCreateOptions {
  service: CapricornDBCoreService
}
export class CapricornDB<Service extends CapricornDBCoreService = CapricornDBCoreService> {
  /** @internal */
  service: Service

  /** @internal */
  collections: string[] = []

  /** @internal */
  eventHandler: CapricornDBEventHandler = new CapricornDBEventHandler()

  public get event() {
    return this.eventHandler
  }

  private constructor(service: Service) {
    this.service = service
  }

  /**
   * Factory method to create an instance of CapricornDB. This method initializes the database, creates necessary tables, and loads existing collections.
   * Should only be called by the getCapricornDB method by the environment adapter.
   * @param options The options for creating the CapricornDB instance.
   * @returns A promise that resolves to the created CapricornDB instance.
   */
  public static async create(options: CapricornDBCreateOptions): Promise<CapricornDB> {
    try {
      const capricorn = new CapricornDB(options.service)
      const tables = await capricorn.service.listTables()
      if (!tables.includes('capricorn')) {
        await capricorn.service.execute(`
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
      capricorn.collections = collectionTables.map((table) => table.replace('c.', ''))
      return capricorn
    } catch (err) {
      throw new DatabaseError('Failed to initialize CapricornDB: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  /**
   * Retrieves the names of all collections in the database.
   * @returns An array of collection names.
   */
  public getCollectionNames(): string[] {
    return this.collections
  }
  
  /**
   * Sets a key-value pair. The value is stored as a JSON string.
   * @param key The key to set the value for.
   * @param value The value to set, which will be stored as a JSON string.
   * @throws DatabaseError if there is an error setting the value.
   * @internal
   */
  public async setCapricornValue(key: string, value: Record<string, unknown>): Promise<void> {
    try {
      await this.service.execute(`
        INSERT INTO "capricorn" (key, value) VALUES (?, jsonb(?))
        ON CONFLICT(key) DO UPDATE SET value=excluded.value
      `, [key, JSON.stringify(value)])
    } catch (err) {
      throw new DatabaseError('Failed to set Capricorn value: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  /**
   * Retrieves the value associated with the given key. The value is parsed from a JSON string.
   * @param key The key to retrieve the value for.
   * @returns The value associated with the key, or null if the key does not exist.
   * @throws DatabaseError if there is an error retrieving the value.
   * @internal
   */
  public async getCapricornValue<T extends Record<string, unknown>>(key: string): Promise<T | null> {
    try {
      const result = await this.service.querySingle<{ value: string }>(`
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

  private _currentTransaction: CapricornDBTransaction | null = null
  
  /* @internal */
  set currentTransaction(transaction: CapricornDBTransaction | null) {
    this._currentTransaction = transaction
  }

  /**
   * Indicates whether there is an active transaction in progress.
   * @returns true if there is an active transaction, false otherwise.
   */
  public get hasActiveTransaction(): boolean {
    return this._currentTransaction !== null
  }

  /**
   * Executes a series of database operations within a transaction. If any operation fails, the transaction will be rolled back to maintain data integrity.
   * @param callback The callback function that contains the database operations to be executed within the transaction.
   * @throws DatabaseError if there is an error executing the transaction.
   * @example
   * await capricorn.withTransaction(async () => {
   *   const usersCollection = capricorn.collection<UserDocument>('users')
   *   await usersCollection.insertOne({ name: 'Bob', age: 25 })
   *   await usersCollection.updateOne({ name: 'Alice' }, { age: 31 })
   * })
   */
  public async withTransaction(callback: CapricornDBTransactionCallback): Promise<void> {
    const transaction = new CapricornDBTransaction({
      capricorn: this,
      callback
    })
    await transaction.execute()
  }

  /**
   * Generates a new unique document ID. This method can be used when inserting documents with a predefined ID.
   * @returns A promise that resolves to a new unique document ID.
   */
  public async newDocumentID(): Promise<CapricornDocumentID> {
    return await this.service.generateDocumentID()
  }

  /**
   * Retrieves a collection instance for the specified collection name. If the collection does not exist, it will be created automatically.
   * @param collectionName The name of the collection to retrieve.
   * @returns An instance of CapricornDBCollection for the specified collection name.
   * @throws DatabaseError if there is an error retrieving or creating the collection.
   * @example
   * const usersCollection = capricorn.collection<UserDocument>('users')
   * await usersCollection.insertOne({ name: 'Alice', age: 30 })
   *
   */
  public collection<T extends CapricornDocument>(collectionName: CollectionName) {
    return new CapricornDBCollection<T>({
      collectionName,
      capricorn: this
    })
  }
}