export class CapricornDBError extends Error {
  public capricornError = true

  constructor(message?: string) {
    super(message ?? 'An error occurred in CapricornDB.')
  }

  static isCapricornDBError(error: unknown): error is CapricornDBError {
    return error instanceof Error && (error as CapricornDBError).capricornError === true
  }
}