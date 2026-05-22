import { CollectionName } from '@/types/CollectionName'
import { CapricornDB } from './CapricornDB'
import { CapricornDocument } from '@/types/CapricornDocument'
import { CapricornDocumentID, isValidCapricornDocumentID, WithCapricornID } from '@/types/CapricornDocumentID'
import { CapricornDBQuery } from './CapricornDBQuery'
import { CapricornDBFilter } from '@/types/CapricornDBFilter'
import { DocumentExistsError, DocumentNotFoundError, ImmutableIDUpdateError, InvalidDocumentIDError } from '@/errors/document'
import { DatabaseError } from '@/errors/database'
import { InvalidCollectionNameError } from '@/errors/collection'
import { CapricornDBError } from '@/errors/error'
import { InvalidQueryError } from '@/errors/query'

export class CapricornDBCollection<T extends CapricornDocument> {
  private _capricorn: CapricornDB
  private _collectionName: CollectionName
  private get _databaseTableName() {
    return `c.${this._collectionName}`
  }

  /* @internal */
  constructor(options: { collectionName: CollectionName, capricorn: CapricornDB }) {
    if (!CapricornDBCollection.isValidName(options.collectionName)) {
      throw new InvalidCollectionNameError(`Invalid collection name: ${options.collectionName}. Collection names can only contain letters, numbers, dots, underscores and hyphens.`)
    }
    this._capricorn = options.capricorn
    this._collectionName = options.collectionName
  }

  public static isValidName(name: string): boolean {
    return /^[a-zA-Z0-9._-]+$/.test(name)
  }

  public async insertOne(document: T): Promise<WithCapricornID<T>> {
    await this._createCollection()
    try {
      let id: string | null = null
      if ((document as WithCapricornID<T>).id) {
        if (!isValidCapricornDocumentID((document as WithCapricornID<T>).id)) {
          throw new InvalidDocumentIDError()
        }
        id = (document as WithCapricornID<T>).id
      } else {
        id = await this._capricorn.service.generateDocumentID()
      }
      const documentWithID = { ...document, id } as WithCapricornID<T>
      await this._capricorn.service.insert(`
        INSERT INTO "${this._databaseTableName}" (id, document) VALUES (?, jsonb(?))
      `, [id, JSON.stringify(document)])
      return documentWithID
    } catch (err) {
      if (CapricornDBError.isCapricornDBError(err)) {
        throw err
      }
      if (err instanceof Error) {
        if (err.message.includes('UNIQUE constraint failed')) {
          throw new DocumentExistsError((document as WithCapricornID<T>).id)
        }
      }
      throw new DatabaseError('Failed to insert document.')
    }
  }

  public async insertMany(documents: T[]): Promise<WithCapricornID<T>[]> {
    const isInsideeTransaction = this._capricorn.hasActiveTransaction
    try {
      if (!isInsideeTransaction) {
        await this._capricorn.service.startTransaction()
      }
      const addedDocuments: WithCapricornID<T>[] = []
      for (const document of documents) {
        const addedDocument = await this.insertOne(document)
        addedDocuments.push(addedDocument)
      }
      if (!isInsideeTransaction) {
        await this._capricorn.service.commitTransaction()
      }
      return addedDocuments
    } catch (err) {
      if (CapricornDBError.isCapricornDBError(err)) {
        throw err
      }
      if (!isInsideeTransaction) {
        await this._capricorn.service.rollbackTransaction()
      }
      throw new DatabaseError('Failed to insert documents.')
    }
  }

  public async findByID(id: CapricornDocumentID): Promise<WithCapricornID<T> | null> {
    if (!isValidCapricornDocumentID(id)) {
      throw new InvalidDocumentIDError()
    }
    try {
      const result = await this._capricorn.service.querySingle<{ document: string }>(`
        SELECT json(document) as document FROM "${this._databaseTableName}" WHERE id = ?
      `, [id])
      if (!result) {
        return null
      }
      return {
        ...JSON.parse(result.document),
        id: id
      } as WithCapricornID<T>
    } catch (err) {
      if (CapricornDBError.isCapricornDBError(err)) {
        throw err
      }
      throw new DatabaseError('Failed to find document by ID.')
    }
  }

  public async findOne(filter: CapricornDBFilter<T>): Promise<WithCapricornID<T> | null> {
    try {
      if (filter instanceof CapricornDBQuery) {
        const query = filter.getSQLAndParams(true)
        const result = await this._capricorn.service.querySingle<{ id: string, document: string }>(`
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
    } catch (err) {
      if (CapricornDBError.isCapricornDBError(err)) {
        throw err
      }
      throw new DatabaseError('Failed to find document.')
    }
  }

  public async find(filter: CapricornDBFilter<T>): Promise<WithCapricornID<T>[]> {
    try {
      if (filter instanceof CapricornDBQuery) {
        const query = filter.getSQLAndParams(true)
        const results = await this._capricorn.service.queryMultiple<{ id: string, document: string }>(`
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
          const results = await this._capricorn.service.queryMultiple<{ id: string, document: string }>(`
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
    } catch (err) {
      if (CapricornDBError.isCapricornDBError(err)) {
        throw err
      }
      throw new DatabaseError('Failed to find documents.')
    }
  }

  public async updateOne(filter: CapricornDBFilter<T>, update: Partial<T>): Promise<void> {
    try {
      const document = await this.findOne(filter)
      if (!document) {
        throw new DocumentNotFoundError((filter as WithCapricornID<T>).id ?? 'unknown')
      }
      if ((update as WithCapricornID<T>).id && (update as WithCapricornID<T>).id !== document.id) {
        throw new ImmutableIDUpdateError()
      }
      const updatedDocument = { ...document, ...update }
      await this._capricorn.service.update(`
        UPDATE "${this._databaseTableName}" SET document = jsonb(?) WHERE id = ?
      `, [JSON.stringify(updatedDocument), document.id])
    } catch (err) {
      if (CapricornDBError.isCapricornDBError(err)) {
        throw err
      }
      throw new DatabaseError('Failed to update document.')
    }
  }

  public async updateMany(filter: CapricornDBFilter<T>, update: Partial<T>): Promise<void> {
    const isInsideeTransaction = this._capricorn.hasActiveTransaction
    try {
      if (!isInsideeTransaction) {
        await this._capricorn.service.startTransaction()
      }
      const documents = await this.find(filter)
      for (const document of documents) {
        const updatedDocument = { ...document, ...update }
        if ((update as WithCapricornID<T>).id && (update as WithCapricornID<T>).id !== document.id) {
          throw new ImmutableIDUpdateError()
        }
        await this._capricorn.service.update(`
          UPDATE "${this._databaseTableName}" SET document = jsonb(?) WHERE id = ?
        `, [JSON.stringify(updatedDocument), document.id])
      }
      if (!isInsideeTransaction) {
        await this._capricorn.service.commitTransaction()
      }
    } catch (error) {
      if (CapricornDBError.isCapricornDBError(error)) {
        throw error
      }
      if (!isInsideeTransaction) {
        await this._capricorn.service.rollbackTransaction()
      }
      throw new DatabaseError('Failed to update documents.')
    }
  }

  public async deleteOne(filter: CapricornDBFilter<T>): Promise<void> {
    try {
      if (filter instanceof CapricornDBQuery) {
        const query = filter.getSQLAndParams(true)
        await this._capricorn.service.delete(`
          DELETE FROM "${this._databaseTableName}" ${query?.sql ?? ''} LIMIT 1
        `, query?.params ?? [])
      } else {
        if (filter.id) {
          await this._capricorn.service.delete(`
            DELETE FROM "${this._databaseTableName}" WHERE id = ? LIMIT 1
          `, [filter.id])
        } else {
          if (Object.keys(filter).length === 0) {
            throw new InvalidQueryError('Filter cannot be empty for deleteOne operation.')
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
    } catch (err) {
      if (CapricornDBError.isCapricornDBError(err)) {
        throw err
      }
      throw new DatabaseError('Failed to delete document.')
    }
  }

  public async deleteMany(filter: CapricornDBFilter<T>): Promise<void> {
    try {
      if (filter instanceof CapricornDBQuery) {
        const query = filter.getSQLAndParams(true)
        await this._capricorn.service.delete(`
          DELETE FROM "${this._databaseTableName}" ${query?.sql ?? ''}
        `, query?.params ?? [])
      } else {
        if (filter.id) {
          await this._capricorn.service.delete(`
            DELETE FROM "${this._databaseTableName}" WHERE id = ?
          `, [filter.id])
        } else {
          if (Object.keys(filter).length === 0) {
            await this._capricorn.service.delete(`DELETE FROM "${this._databaseTableName}"`)
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
    } catch (err) {
      if (CapricornDBError.isCapricornDBError(err)) {
        throw err
      }
      throw new DatabaseError('Failed to delete documents.')
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
    try {
      await this._capricorn.service.execute(`CREATE TABLE IF NOT EXISTS "${this._databaseTableName}" (id TEXT PRIMARY KEY, document BLOB)`)
      this._capricorn.collections.push(this._collectionName)
    } catch (err) {
      if (CapricornDBError.isCapricornDBError(err)) {
        throw err
      }
      throw new DatabaseError('Failed to create collection.')
    }
  }
}