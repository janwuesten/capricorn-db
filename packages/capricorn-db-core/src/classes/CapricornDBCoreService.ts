import { CapricornDocumentID } from '@/types/CapricornDocumentID'

export abstract class CapricornDBCoreService {
  public abstract listTables(): Promise<string[]>
  public abstract startTransaction(): Promise<void>
  public abstract commitTransaction(): Promise<void>
  public abstract rollbackTransaction(): Promise<void>
  public abstract performQuery(query: string, params?: unknown[]): Promise<void>
  public abstract querySingleDocument<T>(query: string, params?: unknown[]): Promise<T | null>
  public abstract queryMultipleDocuments<T>(query: string, params?: unknown[]): Promise<T[]>
  public abstract insertDocument(query: string, params?: unknown[]): Promise<CapricornDocumentID>
  public abstract updateDocument(query: string, params?: unknown[]): Promise<void>
  public abstract deleteDocument(query: string, params?: unknown[]): Promise<void>
  public abstract generateDocumentID(): Promise<CapricornDocumentID>
}