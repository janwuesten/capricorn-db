import { CollectionName } from '@/types/CollectionName'
import { CapricornDB } from './CapricornDB'
import { CapricornDocument } from '@/types/CapricornDocument'
import { CapricornDocumentID, isValidCapricornDocumentID, WithCapricornID } from '@/types/CapricornDocumentID'
import { CapricornDBQuery } from './CapricornDBQuery'
import { CapricornDBFilter } from '@/types/CapricornDBFilter'

export class CapricornDBCollection<T extends CapricornDocument> {
  private _capricorn: CapricornDB
  private _collectionName: CollectionName
  private get _databaseTableName() {
    return `c.${this._collectionName}`
  }

  constructor(options: { collectionName: CollectionName, capricorn: CapricornDB }) {
    if (!CapricornDBCollection.isValidName(options.collectionName)) {
      throw new Error(`Invalid collection name: ${options.collectionName}. Collection names can only contain letters, numbers, dots, underscores and hyphens.`)
    }
    this._capricorn = options.capricorn
    this._collectionName = options.collectionName
  }

  static isValidName(name: string): boolean {
    return /^[a-zA-Z0-9._-]+$/.test(name)
  }

  async insertOne(document: T): Promise<WithCapricornID<T>> {
    await this._createCollection()
    try {
      let id = await this._capricorn._service.generateDocumentID()
      if ((document as WithCapricornID<T>).id) {
        if (typeof (document as WithCapricornID<T>).id !== 'string') {
          throw new Error('Document id must be a string.')
        }
        if (!isValidCapricornDocumentID((document as WithCapricornID<T>).id)) {
          throw new Error('Document id must be a valid CapricornDocumentID.')
        }
        id = (document as WithCapricornID<T>).id
      }
      const documentWithID = { ...document, id } as WithCapricornID<T>
      await this._capricorn._service.insertDocument(`
        INSERT INTO "${this._databaseTableName}" (id, document) VALUES (?, jsonb(?))
      `, [id, JSON.stringify(document)])
      return documentWithID
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('UNIQUE constraint failed')) {
          throw new Error('Document with the same id already exists.')
        }
      }
      throw new Error('Failed to insert document.')
    }
  }

  async insertMany(documents: T[]): Promise<WithCapricornID<T>[]> {
    const isInsideeTransaction = !!this._capricorn._currentTransaction
    try {
      if (!isInsideeTransaction) {
        await this._capricorn._service.startTransaction()
      }
      const addedDocuments: WithCapricornID<T>[] = []
      for (const document of documents) {
        const addedDocument = await this.insertOne(document)
        addedDocuments.push(addedDocument)
      }
      if (!isInsideeTransaction) {
        await this._capricorn._service.commitTransaction()
      }
      return addedDocuments
    } catch (error) {
      if (!isInsideeTransaction) {
        await this._capricorn._service.rollbackTransaction()
      }
      throw error instanceof Error ? error : new Error(String(error))
    }
  }

  async findByID(id: CapricornDocumentID): Promise<WithCapricornID<T> | null> {
    if (!isValidCapricornDocumentID(id)) {
      throw new Error('Invalid document id.')
    }
    const result = await this._capricorn._service.querySingleDocument<{ document: string }>(`
      SELECT json(document) as document FROM "${this._databaseTableName}" WHERE id = ?
    `, [id])
    if (!result) {
      return null
    }
    return {
      ...JSON.parse(result.document),
      id: id
    } as WithCapricornID<T>
  }

  async findOne(filter: CapricornDBFilter<T>): Promise<WithCapricornID<T> | null> {
    if (filter instanceof CapricornDBQuery) {
      const query = filter._getSQLAndParams(true)
      const result = await this._capricorn._service.querySingleDocument<{ id: string, document: string }>(`
        SELECT id, json(document) as document FROM "${this._databaseTableName}" ${query?.sql ?? ''} LIMIT 1
      `, query?.params ?? [])
      if (!result) {
        return null
      }
      const document = JSON.parse(result.document) as T
      return {
        ...document,
        id: result.id
      } as WithCapricornID<T>
    } else {
      if (filter.id) {
        return this.findByID(filter.id)
      }
      const query = new CapricornDBQuery()
      for (const key in filter) {
        const value = filter[key as keyof typeof filter]
        if (value !== undefined) {
          query.where(key, 'eq', value)
        }
      }
      return this.findOne(query)
    }
  }

  async find(filter: CapricornDBFilter<T>): Promise<WithCapricornID<T>[]> {
    if (filter instanceof CapricornDBQuery) {
      const query = filter._getSQLAndParams(true)
      const results = await this._capricorn._service.queryMultipleDocuments<{ id: string, document: string }>(`
        SELECT id, json(document) as document FROM "${this._databaseTableName}" ${query?.sql ?? ''}
      `, query?.params ?? [])
      return results.map((result) => {
        const document = JSON.parse(result.document) as T
        return {
          ...document,
          id: result.id
        } as WithCapricornID<T>
      })
    } else {
      if (Object.keys(filter).length === 0) {
        const results = await this._capricorn._service.queryMultipleDocuments<{ id: string, document: string }>(`
          SELECT id, json(document) as document FROM "${this._databaseTableName}"
        `)
        return results.map((result) => {
          const document = JSON.parse(result.document) as T
          return {
            ...document,
            id: result.id
          } as WithCapricornID<T>
        })
      }
      const query = new CapricornDBQuery()
      for (const key in filter) {
        const value = filter[key as keyof typeof filter]
        if (value !== undefined) {
          query.where(key, 'eq', value)
        }
      }
      return this.find(query)
    }
  }

  async updateOne(filter: CapricornDBFilter<T>, update: Partial<T>): Promise<void> {
    const document = await this.findOne(filter)
    if (!document) {
      throw new Error('Document not found for updateOne operation.')
    }
    if ((update as WithCapricornID<T>).id && (update as WithCapricornID<T>).id !== document.id) {
      throw new Error('Cannot update document id.')
    }
    const updatedDocument = { ...document, ...update }
    await this._capricorn._service.updateDocument(`
      UPDATE "${this._databaseTableName}" SET document = jsonb(?) WHERE id = ?
    `, [JSON.stringify(updatedDocument), document.id])
  }

  async updateMany(filter: CapricornDBFilter<T>, update: Partial<T>): Promise<void> {
    const documents = await this.find(filter)
    for (const document of documents) {
      const updatedDocument = { ...document, ...update }
      if ((update as WithCapricornID<T>).id && (update as WithCapricornID<T>).id !== document.id) {
        throw new Error('Cannot update document id.')
      }
      await this._capricorn._service.updateDocument(`
        UPDATE "${this._databaseTableName}" SET document = jsonb(?) WHERE id = ?
      `, [JSON.stringify(updatedDocument), document.id])
    }
  }

  async deleteOne(filter: CapricornDBFilter<T>): Promise<void> {
    if (filter instanceof CapricornDBQuery) {
      const query = filter._getSQLAndParams(true)
      await this._capricorn._service.deleteDocument(`
        DELETE FROM "${this._databaseTableName}" ${query?.sql ?? ''} LIMIT 1
      `, query?.params ?? [])
    } else {
      if (filter.id) {
        await this._capricorn._service.deleteDocument(`
          DELETE FROM "${this._databaseTableName}" WHERE id = ? LIMIT 1
        `, [filter.id])
      } else {
        if (Object.keys(filter).length === 0) {
          throw new Error('Filter cannot be empty for deleteOne operation.')
        }
        const query = new CapricornDBQuery()
        for (const key in filter) {
          const value = filter[key as keyof typeof filter]
          if (value !== undefined) {
            query.where(key, 'eq', value)
          }
        }
        return this.deleteOne(query)
      }
    }
  }

  async deleteMany(filter: CapricornDBFilter<T>): Promise<void> {
    if (filter instanceof CapricornDBQuery) {
      const query = filter._getSQLAndParams(true)
      await this._capricorn._service.deleteDocument(`
        DELETE FROM "${this._databaseTableName}" ${query?.sql ?? ''}
      `, query?.params ?? [])
    } else {
      if (filter.id) {
        await this._capricorn._service.deleteDocument(`
          DELETE FROM "${this._databaseTableName}" WHERE id = ?
        `, [filter.id])
      } else {
        if (Object.keys(filter).length === 0) {
          await this._capricorn._service.deleteDocument(`DELETE FROM "${this._databaseTableName}"`)
          return
        }
        const query = new CapricornDBQuery()
        for (const key in filter) {
          const value = filter[key as keyof typeof filter]
          if (value !== undefined) {
            query.where(key, 'eq', value)
          }
        }
        return this.deleteMany(query)
      }
    }
  }

  private _collectionExists(): boolean {
    const collectionNames = this._capricorn.getCollectionNames()
    return collectionNames.includes(this._collectionName)
  }
  
  private async _createCollection(): Promise<void> {
    if (this._collectionExists()) {
      return
    }
    await this._capricorn._service.performQuery(`CREATE TABLE IF NOT EXISTS "${this._databaseTableName}" (id TEXT PRIMARY KEY, document BLOB)`)
    this._capricorn._collections.push(this._collectionName)
  }
}