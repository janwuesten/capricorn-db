import { CapricornDBError } from './error'

export class InvalidQueryError extends CapricornDBError {
  constructor(message?: string) {
    super(message ?? 'Invalid query.')
    this.name = 'InvalidQueryError'
  }
}