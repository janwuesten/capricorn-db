import { CapricornDBError } from './error'

export class DatabaseError extends CapricornDBError {
  err: unknown
  constructor(message?: string, err?: unknown) {
    super(message ?? 'An error occurred in the database operation.')
    this.name = 'DatabaseError'
    this.err = err
  }
}