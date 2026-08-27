export class CapricornDBQueue {
  private queue: Promise<unknown> = Promise.resolve()
  public enqueue<T>(operation: () => T): Promise<T> {
    const result = this.queue.then(() => operation())
    this.queue = result.catch(() => undefined)
    return result
  }
}

/**
 * Creates a queue for operations that need to be executed in order. This is useful for operations that need to be executed in a specific order, such as transactions.
 * @example
 * const queue = createQueue()
 * queue.enqueue(async () => await doSomething())
 * queue.enqueue(async () => await doSomethingElse())
 * @returns {CapricornDBQueue} A new instance of CapricornDBQueue
 */
export function createQueue(): CapricornDBQueue {
  return new CapricornDBQueue()
}