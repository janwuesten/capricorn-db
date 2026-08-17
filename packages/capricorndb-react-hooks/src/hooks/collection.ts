import { CapricornDBCollection, CapricornDocument } from '@janwuesten/capricorndb-core'
import { useEffect, useRef } from 'react'

export type UseCollectionEventListener<T extends CapricornDocument> = (collection: CapricornDBCollection<T>) => Promise<void>

/**
 * React hook to listen to changes in a CapricornDB collection and trigger a listener function when the collection is modified (document inserted, updated, or deleted).
 * @param collection The CapricornDB collection to listen to.
 * @param listener A callback function that will be called with the collection whenever it is modified.
 * @param dependencies An optional array of dependencies that will trigger the effect to re-run when they change.
 */
export const useCollection = <T extends CapricornDocument>(collection: CapricornDBCollection<T>, listener: UseCollectionEventListener<T>, dependencies: any[] = []) => {
  const listenerRef = useRef(listener)
  listenerRef.current = listener

  useEffect(() => {
    const onRefresh = () => {
      listenerRef.current(collection)
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
  }, [collection, ...dependencies])
}
