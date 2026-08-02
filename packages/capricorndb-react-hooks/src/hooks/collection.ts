import { CapricornDB, CapricornDBCollection, CapricornDocument, CollectionName } from '@janwuesten/capricorndb-core'
import { useEffect } from 'react'

export type UseCollectionEventListener<T extends CapricornDocument> = (collection: CapricornDBCollection<T>) => Promise<void>

/**
 * React hook to listen to changes in a CapricornDB collection and trigger a listener function when the collection is modified (document inserted, updated, or deleted).
 * @param collectionName The name of the collection to listen to.
 * @param listener A callback function that will be called with the collection whenever it is modified.
 * @param capricorn An instance of the CapricornDB database.
 * @param dependencies An optional array of dependencies that will trigger the effect to re-run when they change.
 */
export const useCollection = <T extends CapricornDocument>(collectionName: CollectionName, listener: UseCollectionEventListener<T>, capricorn: CapricornDB, dependencies: any[] = []) => {
  useEffect(() => {
    const collection = capricorn.collection<T>(collectionName)
    const onRefresh = () => {
      listener(collection)
    }
    const deletedListener = collection.event.documentDeleted.on(onRefresh)
    const insertedListener = collection.event.documentInserted.on(onRefresh)
    const updatedListener = collection.event.documentUpdated.on(onRefresh)
    onRefresh()
    return () => {
      deletedListener()
      insertedListener()
      updatedListener()
    }
  }, [capricorn, collectionName, listener, ...dependencies])
}
