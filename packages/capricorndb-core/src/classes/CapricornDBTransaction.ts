import { PendingTransactionError } from '@/errors/transaction'
import { CapricornDB } from './CapricornDB'
import { CapricornDBError } from '@/errors/error'

export type CapricornDBTransactionCallback = () => Promise<void>
export class CapricornDBTransaction {
  private _capricorn: CapricornDB
  private _callback: CapricornDBTransactionCallback

  constructor(options: { capricorn: CapricornDB, callback: CapricornDBTransactionCallback }) {
    this._capricorn = options.capricorn
    this._callback = options.callback
  }

  /** @internal */
  public async execute(): Promise<void> {
    if (this._capricorn.hasActiveTransaction) {
      throw new PendingTransactionError()
    }
    this._capricorn.currentTransaction = this
    try {
      await this._capricorn.service.startTransaction()
      await this._callback()
      await this._capricorn.service.commitTransaction()
    } catch (error) {
      await this._capricorn.service.rollbackTransaction()
      if (CapricornDBError.isCapricornDBError(error)) {
        throw error
      }
      throw error instanceof Error ? error : new Error(String(error))
    } finally {
      this._capricorn.currentTransaction = null
    }
  }
}