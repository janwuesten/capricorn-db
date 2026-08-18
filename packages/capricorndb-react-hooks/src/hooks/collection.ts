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

  const collectionRef = useRef(collection)
  collectionRef.current = collection

  useEffect(() => {
    const activeCollection = collectionRef.current
    const onRefresh = () => {
      listenerRef.current(activeCollection)
    }
    const deletedListener = activeCollection.event.documentDeleted.on(onRefresh)
    const insertedListener = activeCollection.event.documentInserted.on(onRefresh)
    const updatedListener = activeCollection.event.documentUpdated.on(onRefresh)
    onRefresh()
    return () => {
      deletedListener()
      insertedListener()
      updatedListener()
    }
  }, [collection.name, ...dependencies])
}
