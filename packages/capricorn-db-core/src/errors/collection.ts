import { CapricornDBError } from './error'

export class InvalidCollectionNameError extends CapricornDBError {
  constructor(message: string) {
    super(`${message}`)
    this.name = 'InvalidCollectionNameError'
  }
}