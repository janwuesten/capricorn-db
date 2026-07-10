import { CapricornDBError } from './error'

export class DatabaseError extends CapricornDBError {
  constructor(message?: string) {
    super(message ?? 'An error occurred in the database operation.')
    this.name = 'DatabaseError'
  }
}