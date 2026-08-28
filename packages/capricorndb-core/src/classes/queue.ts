export class CapricornDBQueue {
  private queue: Promise<unknown> = Promise.resolve()
  private pending = 0
  public enqueue<T>(operation: () => T): Promise<T> {
    this.pending++
    const result = this.queue.then(() => operation())
    this.queue = result.catch(() => undefined).finally(() => this.pending--)
    return result
  }

  /**
   * Indicates whether the queue has finished all work.
   * @returns True if there are no pending or running operations, false otherwise.
   */
  public isCompleted(): boolean {
    return this.pending === 0
  }

  /**
   * Waits until all pending and running operations in the queue have settled.
   * @returns A promise that resolves once the queue is completed.
   */
  public async waitForCompletion(): Promise<void> {
    while (this.pending > 0) {
      await this.queue.catch(() => undefined)
    }
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