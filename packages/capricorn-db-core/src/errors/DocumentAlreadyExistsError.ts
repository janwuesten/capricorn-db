export class DocumentAlreadyExistsError extends Error {
  documentID?: string
  constructor(documentID?: string) {
    super()
    this.name = 'DocumentAlreadyExistsError'
    this.documentID = documentID
  }
}