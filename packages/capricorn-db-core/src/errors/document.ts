import { CapricornDBError } from './error'

export class InvalidDocumentIDError extends CapricornDBError {
  constructor() {
    super('Invalid document ID.')
    this.name = 'InvalidDocumentIDError'
  }
}
export class DocumentExistsError extends CapricornDBError {
  constructor(documentID: string) {
    super(`Document with ID "${documentID}" already exists.`)
    this.name = 'DocumentExistsError'
  }
}
export class DocumentNotFoundError extends CapricornDBError {
  constructor(documentID: string) {
    super(`Document with ID "${documentID}" not found.`)
    this.name = 'DocumentNotFoundError'
  }
}
export class ImmutableIDUpdateError extends CapricornDBError {
  constructor() {
    super('Cannot update document ID.')
    this.name = 'ImmutableIDUpdateError'
  }
}