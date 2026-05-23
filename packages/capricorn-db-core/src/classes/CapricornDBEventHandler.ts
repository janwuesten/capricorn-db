import { CapricornDocument } from '@/types/CapricornDocument'
import { WithCapricornID } from '@/types/CapricornDocumentID'
import { CollectionName } from '@/types/CollectionName'

export class CapricornDBEventHandler {
  /** @internal */
  documentInserted: CapricornDBDocumentsEvent = new CapricornDBDocumentsEvent()
  documentUpdated: CapricornDBDocumentsEvent = new CapricornDBDocumentsEvent()
  documentDeleted: CapricornDBDocumentsEvent = new CapricornDBDocumentsEvent()
}
export class CapricornDBDocumentsEvent {
  private _handlers: Map<CollectionName, ((payload: WithCapricornID<CapricornDocument>[]) => void)[]> = new Map()
  
  /** @internal */
  trigger(collectionName: CollectionName, documents: Array<WithCapricornID<CapricornDocument>>) {
    const handlers = this._handlers.get(collectionName)
    if (handlers) {
      handlers.forEach((handler) => handler(documents))
    }
  }

  public on<DOCUMENT extends CapricornDocument>(collectionName: string, handler: (documents: WithCapricornID<DOCUMENT>[]) => void) {
    if (!this._handlers.has(collectionName)) {
      this._handlers.set(collectionName, [])
    }
    this._handlers.get(collectionName)!.push(handler as (payload: WithCapricornID<CapricornDocument>[]) => void)
    return () => this.unsubscribe(collectionName, handler as (documents: WithCapricornID<CapricornDocument>[]) => void)
  }
  public unsubscribe<DOCUMENT extends CapricornDocument>(collectionName: string, handler: (documents: WithCapricornID<DOCUMENT>[]) => void) {
    const handlers = this._handlers.get(collectionName)
    if (handlers) {
      this._handlers.set(collectionName, handlers.filter((h) => h !== handler))
    }
  }

  public hasSubscribers(collectionName: string): boolean {
    const handlers = this._handlers.get(collectionName)
    return handlers !== undefined && handlers.length > 0
  }
}