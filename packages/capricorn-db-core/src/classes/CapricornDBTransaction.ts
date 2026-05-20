import { CapricornDB } from './CapricornDB'

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
    if (this._capricorn._currentTransaction) {
      throw new Error('A transaction is already in progress. Nested transactions are not supported.')
    }
    this._capricorn._currentTransaction = this
    try {
      await this._capricorn._service.startTransaction()
      await this._callback()
      await this._capricorn._service.commitTransaction()
    } catch (error) {
      await this._capricorn._service.rollbackTransaction()
      throw error instanceof Error ? error : new Error(String(error))
    } finally {
      this._capricorn._currentTransaction = null
    }
  }
}