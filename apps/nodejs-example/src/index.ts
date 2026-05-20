import { and, getCapricorn, or, where } from '@janwuesten/capricorn-db-nodejs'
import { Console, Effect } from 'effect'

interface User {
  name: string
  email: string
}

const main = Effect.gen(function* () {
  const capricorn = yield* Effect.promise(() => getCapricorn({
    databasePath: './example.capricorndb'
  }))

  const query =
    or(
      and(
        where('email', 'startsWith', 'john'),
        where('email', 'startsWith', 'john'),
        where('email', 'startsWith', 'john'),
        where('email', 'startsWith', 'john'),
        where('email', 'startsWith', 'john'),
        where('email', 'startsWith', 'john'),
        where('email', 'startsWith', 'john')
      ),
      where('name', 'contains', 'doe')
    )



  yield* Console.log('Constructed query:', query._getSQLAndParams())

  const collection = capricorn.collection<User>('user.test')
  const doc = yield* Effect.promise(() => collection.insertOne({ name: 'John Doe', email: 'john.doe@example.com' }))
  yield* Console.log('Inserted document:', doc)
  const foundDoc = yield* Effect.promise(() => collection.findByID(doc.id))
  yield* Console.log('Found document by ID:', foundDoc)
  const foundFindOne = yield* Effect.promise(() => collection.findOne({ email: 'john.doe@example.com' }))
  yield* Console.log('Found document by findOne:', foundFindOne)
  const foundFind = yield* Effect.promise(() => collection.find({ email: 'john.doe@example.com' }))
  yield* Console.log('Found documents by find:', foundFind)
  const foundQuery = yield* Effect.promise(() => collection.find(query))
  yield* Console.log('Found documents by query:', foundQuery)
  yield* Effect.promise(() => collection.deleteMany({}))
  return capricorn
})
Effect.runPromise(main).then(() => {
  console.log('CollectionDB initialized successfully')
}).catch((error) => {
  console.error('Error initializing CollectionDB:', error)
})