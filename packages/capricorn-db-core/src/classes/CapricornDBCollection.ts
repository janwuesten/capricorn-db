import { CollectionName } from '@/types/CollectionName'
import { CapricornDB } from './CapricornDB'
import { CapricornDocument } from '@/types/CapricornDocument'
import { CapricornDocumentID, isValidCapricornDocumentID, WithCapricornID } from '@/types/CapricornDocumentID'
import { CapricornDBQuery, createQuery } from './CapricornDBQuery'
import { CapricornDBFilter } from '@/types/CapricornDBFilter'
import { DocumentExistsError, DocumentNotFoundError, ImmutableIDUpdateError, InvalidDocumentIDError } from '@/errors/document'
import { DatabaseError } from '@/errors/database'
import { InvalidCollectionNameError } from '@/errors/collection'
import { CapricornDBError } from '@/errors/error'
import { InvalidQueryError } from '@/errors/query'
import { FlatKey } from '@/types/FlatKey'

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

  /**
   * Validates a collection name against the allowed pattern. Collection names can only contain letters, numbers, dots, underscores and hyphens.
   * @param name The collection name to validate.
   * @returns True if the collection name is valid, false otherwise.
   */
  public static isValidName(name: string): boolean {
    return /^[a-zA-Z0-9._-]+$/.test(name)
  }

  /**
   * Inserts a single document into the collection. If the document does not have an ID, a new unique ID will be generated.
   * @param document The document to insert into the collection.
   * @returns A promise that resolves to the inserted document with its ID.
   * @throws DocumentExistsError if a document with the same ID already exists in the collection.
   * @throws DatabaseError if there is an error inserting the document.
   * @example
   * const newDocument = await collection.insertOne({ name: 'Alice', age: 30 })
   * console.log(newDocument.id) // Logs the generated ID of the inserted document
   */
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

  /**
   * Inserts multiple documents into the collection. If any document does not have an ID, a new unique ID will be generated for it.
   * @param documents An array of documents to insert into the collection.
   * @returns A promise that resolves to an array of the inserted documents with their IDs.
   * @throws DocumentExistsError if a document with the same ID already exists in the collection.
   * @throws DatabaseError if there is an error inserting the documents.
   * @example
   * const newDocuments = await collection.insertMany([
   *   { name: 'Alice', age: 30 },
   *   { name: 'Bob', age: 25, id: 'custom-id-123' }
   * ])
   * console.log(newDocuments[0].id) // Logs the generated ID of the first inserted document
   * console.log(newDocuments[1].id) // Logs 'custom-id-123'
   */
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

  /**
   * Finds a single document in the collection by its ID. Returns null if no document with the specified ID is found.
   * @param id The ID of the document to find.
   * @returns A promise that resolves to the found document with its ID, or null if no document is found.
   * @throws InvalidDocumentIDError if the provided ID is not a valid CapricornDocumentID.
   * @throws DatabaseError if there is an error finding the document.
   * @example
   * const document = await collection.findByID('some-document-id')
   * if (document) {
   *   console.log(document.name) // Logs the name of the found document
   * } else {
   *   console.log('Document not found')
   * }
   */
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

  /**
   * Finds a single document in the collection that matches the specified filter. Returns null if no matching document is found.
   * @param filter The filter criteria to find the document. Can be a simple object with field-value pairs or a more complex CapricornDBQuery.
   * @returns A promise that resolves to the found document with its ID, or null if no document is found.
   * @throws InvalidQueryError if the provided filter is invalid.
   * @throws DatabaseError if there is an error finding the document.
   * @example
   * const document = await collection.findOne({ name: 'Alice' })
   * if (document) {
   *   console.log(document.id) // Logs the ID of the found document
   * } else {
   *   console.log('Document not found')
   * }
   */
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
        const query = new CapricornDBQuery<T>()
        for (const key in filter) {
          const value = filter[key as keyof typeof filter]
          if (value !== undefined) {
            query.where(key as FlatKey<T>, 'eq', value)
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

  /**
   * Finds multiple documents in the collection that match the specified filter. Returns an empty array if no matching documents are found.
   * @param filter The filter criteria to find the documents. Can be a simple object with field-value pairs or a more complex CapricornDBQuery.
   * @returns A promise that resolves to an array of found documents with their IDs, or an empty array if no documents are found.
   * @throws InvalidQueryError if the provided filter is invalid.
   * @throws DatabaseError if there is an error finding the documents.
   * @example
   * const documents = await collection.find({ age: 30 })
   * console.log(documents.length) // Logs the number of found documents
   */
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
        const query = new CapricornDBQuery<T>()
        for (const key in filter) {
          const value = filter[key as keyof typeof filter]
          if (value !== undefined) {
            query.where(key as FlatKey<T>, 'eq', value)
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

  /**
   * Updates a single document in the collection that matches the specified filter with the provided update data. The document to be updated is determined by the filter criteria, and the update data specifies the fields to be updated and their new values. If the filter matches multiple documents, only one of them will be updated.
   * @param filter The filter criteria to find the document to update. Can be a simple object with field-value pairs or a more complex CapricornDBQuery.
   * @param update An object containing the fields to be updated and their new values.
   * @returns A promise that resolves when the update operation is complete.
   * @throws DocumentNotFoundError if no document matching the filter is found in the collection.
   * @throws ImmutableIDUpdateError if the update data contains an attempt to change the document's ID.
   * @throws InvalidQueryError if the provided filter is invalid.
   * @throws DatabaseError if there is an error updating the document.
   * @example
   * await collection.updateOne({ name: 'Alice' }, { age: 31 })
   * console.log('Document updated successfully')
   */
  public async updateOne(filter: CapricornDBFilter<T>, update: Partial<T>): Promise<WithCapricornID<T>> {
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
      return updatedDocument as WithCapricornID<T>
    } catch (err) {
      if (CapricornDBError.isCapricornDBError(err)) {
        throw err
      }
      throw new DatabaseError('Failed to update document.')
    }
  }

  /**
   * Updates multiple documents in the collection that match the specified filter with the provided update data. The documents to be updated are determined by the filter criteria, and the update data specifies the fields to be updated and their new values.
   * @param filter The filter criteria to find the documents to update. Can be a simple object with field-value pairs or a more complex CapricornDBQuery.
   * @param update An object containing the fields to be updated and their new values.
   * @returns A promise that resolves when the update operation is complete.
   * @throws ImmutableIDUpdateError if the update data contains an attempt to change any document's ID.
   * @throws InvalidQueryError if the provided filter is invalid.
   * @throws DatabaseError if there is an error updating the documents.
   * @example
   * await collection.updateMany({ age: 30 }, { active: true })
   * console.log('Documents updated successfully')
   */
  public async updateMany(filter: CapricornDBFilter<T>, update: Partial<T>): Promise<WithCapricornID<T>[]> {
    const isInsideeTransaction = this._capricorn.hasActiveTransaction
    try {
      if (!isInsideeTransaction) {
        await this._capricorn.service.startTransaction()
      }
      const documents = await this.find(filter)
      const updatedDocuments: WithCapricornID<T>[] = []
      for (const document of documents) {
        const updatedDocument = { ...document, ...update }
        if ((update as WithCapricornID<T>).id && (update as WithCapricornID<T>).id !== document.id) {
          throw new ImmutableIDUpdateError()
        }
        await this._capricorn.service.update(`
          UPDATE "${this._databaseTableName}" SET document = jsonb(?) WHERE id = ?
        `, [JSON.stringify(updatedDocument), document.id])
        updatedDocuments.push(updatedDocument as WithCapricornID<T>)
      }
      if (!isInsideeTransaction) {
        await this._capricorn.service.commitTransaction()
      }
      return updatedDocuments
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

  /**
   * Deletes a single document from the collection that matches the specified filter. The document to be deleted is determined by the filter criteria. If the filter matches multiple documents, only one of them will be deleted.
   * @param filter The filter criteria to find the document to delete. Can be a simple object with field-value pairs or a more complex CapricornDBQuery.
   * @param options Optional settings for the delete operation. If `returnDocument` is set to true, the deleted document will be returned.
   * @returns A promise that resolves to the deleted document if `returnDocument` is true, otherwise resolves to null.
   * @throws InvalidQueryError if the provided filter is invalid.
   * @throws DatabaseError if there is an error deleting the document.
   * @notice When passing returnDocument as true, the method will perform an additional query to retrieve the document before deleting it, which may impact performance. Use this option only when you need to access the deleted document's data.
   * await collection.deleteOne({ name: 'Alice' })
   * console.log('Document deleted successfully')
   */
  async deleteOne(filter: CapricornDBFilter<T>, options?: { returnDocument?: boolean }): Promise<WithCapricornID<T> | null> {
    try {
      if (filter instanceof CapricornDBQuery) {
        let deletedDocument: WithCapricornID<T> | null = null
        if (options?.returnDocument) {
          deletedDocument = await this.findOne(filter)
        }
        const query = filter.getSQLAndParams(true)
        await this._capricorn.service.delete(`
          DELETE FROM "${this._databaseTableName}" ${query?.sql ?? ''} LIMIT 1
        `, query?.params ?? [])
        return deletedDocument
      } else {
        if (Object.keys(filter).length === 0) {
          throw new InvalidQueryError('Filter cannot be empty for deleteOne operation.')
        }
        const query = new CapricornDBQuery<T>()
        for (const key in filter) {
          const value = filter[key as keyof typeof filter]
          if (value !== undefined) {
            query.where(key as FlatKey<T>, 'eq', value)
          }
        }
        return this.deleteOne(query)
      }
    } catch (err) {
      if (CapricornDBError.isCapricornDBError(err)) {
        throw err
      }
      throw new DatabaseError('Failed to delete document.')
    }
  }

  /**
   * Deletes multiple documents from the collection that match the specified filter. The documents to be deleted are determined by the filter criteria.
   * @param filter The filter criteria to find the documents to delete. Can be a simple object with field-value pairs or a more complex CapricornDBQuery.
   * @param options Optional settings for the delete operation. If `returnDocuments` is true, the method will return the deleted documents.
   * @returns A promise that resolves to the deleted documents if `returnDocuments` is true, otherwise resolves to null.
   * @throws InvalidQueryError if the provided filter is invalid.
   * @throws DatabaseError if there is an error deleting the documents.
   * @notice When passing returnDocument as true, the method will perform an additional query to retrieve the document before deleting it, which may impact performance. Use this option only when you need to access the deleted document's data.
   * @example
   * await collection.deleteMany({ age: 30 })
   * console.log('Documents deleted successfully')
   */
  public async deleteMany(filter: CapricornDBFilter<T>, options?: { returnDocuments?: boolean }): Promise<WithCapricornID<T>[] | null> {
    try {
      if (filter instanceof CapricornDBQuery) {
        let deletedDocuments: WithCapricornID<T>[] | null = null
        if (options?.returnDocuments) {
          deletedDocuments = await this.find(filter)
        }
        const query = filter.getSQLAndParams(true)
        await this._capricorn.service.delete(`
          DELETE FROM "${this._databaseTableName}" ${query?.sql ?? ''}
        `, query?.params ?? [])
        return deletedDocuments
      } else {
        if (Object.keys(filter).length === 0) {
          let deletedDocuments: WithCapricornID<T>[] | null = null
          if (options?.returnDocuments) {
            deletedDocuments = await this.find(filter)
          }
          await this._capricorn.service.delete(`DELETE FROM "${this._databaseTableName}"`)
          return deletedDocuments
        }
        const query = new CapricornDBQuery<T>()
        for (const key in filter) {
          const value = filter[key as keyof typeof filter]
          if (value !== undefined) {
            query.where(key as FlatKey<T>, 'eq', value)
          }
        }
        return this.deleteMany(query)
      }
    } catch (err) {
      if (CapricornDBError.isCapricornDBError(err)) {
        throw err
      }
      throw new DatabaseError('Failed to delete documents.')
    }
  }

  /**
   * Creates a new CapricornDBQuery instance for the collection with the specified query conditions. This method allows you to build complex queries using the provided conditions and logical operators.
   * @param conditions The query conditions and logical operators to build the query.
   * @returns A new instance of CapricornDBQuery with the specified conditions.
   * @example
   * const query = collection.createQuery(
   *   where('age', 'gte', 30),
   *   or(
   *     where('flags', 'array-contains', 'active'),
   *     where('address.city', 'eq', 'Sometown'),
   *     where('name', 'eq', 'Bob')
   *   )
   * )
   */
  public createQuery(...queries: CapricornDBQuery<T>[]): CapricornDBQuery<T> {
    return createQuery<T>(...queries)
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