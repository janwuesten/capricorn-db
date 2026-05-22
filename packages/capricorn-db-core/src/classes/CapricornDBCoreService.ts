import { CapricornDocumentID } from '@/types/CapricornDocumentID'

export abstract class CapricornDBCoreService {
  public abstract listTables(): Promise<string[]>
  public abstract startTransaction(): Promise<void>
  public abstract commitTransaction(): Promise<void>
  public abstract rollbackTransaction(): Promise<void>
  public abstract execute(query: string, params?: unknown[]): Promise<void>
  public abstract querySingle<T>(query: string, params?: unknown[]): Promise<T | null>
  public abstract queryMultiple<T>(query: string, params?: unknown[]): Promise<T[]>
  public abstract insert(query: string, params?: unknown[]): Promise<CapricornDocumentID>
  public abstract update(query: string, params?: unknown[]): Promise<void>
  public abstract delete(query: string, params?: unknown[]): Promise<void>
  public abstract generateDocumentID(): Promise<CapricornDocumentID>
}