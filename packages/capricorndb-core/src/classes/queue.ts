export class CapricornDBQueue {
  private queue: Promise<unknown> = Promise.resolve()
  public enqueue<T>(operation: () => T): Promise<T> {
    const result = this.queue.then(() => operation())
    this.queue = result.catch(() => undefined)
    return result
  }
}