import { CapricornDBError } from './error'

export class PendingTransactionError extends CapricornDBError {
  constructor() {
    super('A transaction is already pending. Please commit or rollback the current transaction before starting a new one.')
    this.name = 'PendingTransactionError'
  }
}