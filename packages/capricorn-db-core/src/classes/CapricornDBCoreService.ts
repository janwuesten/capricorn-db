import { CapricornDocumentID } from '@/types/CapricornDocumentID'

export abstract class CapricornDBCoreService {
  abstract listTables(): Promise<string[]>
  abstract startTransaction(): Promise<void>
  abstract commitTransaction(): Promise<void>
  abstract rollbackTransaction(): Promise<void>
  abstract performQuery(query: string, params?: unknown[]): Promise<void>
  abstract querySingleDocument<T>(query: string, params?: unknown[]): Promise<T | null>
  abstract queryMultipleDocuments<T>(query: string, params?: unknown[]): Promise<T[]>
  abstract insertDocument(query: string, params?: unknown[]): Promise<CapricornDocumentID>
  abstract updateDocument(query: string, params?: unknown[]): Promise<void>
  abstract deleteDocument(query: string, params?: unknown[]): Promise<void>
  abstract generateDocumentID(): Promise<CapricornDocumentID>
}