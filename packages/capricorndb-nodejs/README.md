# Capricorn DB for NodeJS

## Introduction

CapricornDB is a NoSQL database for local application storage such as React Native app development.

It is based on SQLite and comes with a MongoDB similar syntax and improved query language that works nativly with TypeScript types.

It has several packages for different runtimes that will extend over time.

The database is currently in development and not feature complete.

This package is for the NodeJS runtime.

## Requirements

To use this package, the following requirements are needed:

- [Node.js 22+](https://nodejs.org/en)
- [TypeScript](https://www.typescriptlang.org) (optional, but recommended)
- A package manager of your choice. PNPM recommended.

## Features

| Feature | Version |
| -- | -- |
| Inserting documents | 0.1.0 |
| Updating documents | 0.1.0 |
| Deleting documents | 0.1.0 |
| Query documents | 0.1.0 |
| Events for realtime Updates | 0.1.0 |

## Installation

To install Capricorn DB for NodeJS install the `@janwuesten/capricorn-db-nodejs` with your favorite package manager:

`pnpm i @janwuesten/capricorndb-nodejs`

## Quick start

1. Create a CapricornDB instance.

```ts
const capricornDB = await createCapricornDB({
  path: './myDatabase.capricorndb'
})
```

2. Insert some documents inside a collection

```ts
const collection = capricorn.collection<Message>('test')
await collection.insertMany([
  {
    message: 'Hello world!',
    sender: 'Foo'
  }
])
```

3. Query some documents
```ts
const messages = await collection.find({
  sender: 'Foo'
})
console.log(messages)
```

4. Perform complex queries
```ts
const query = collection.createQuery(
  and(
    where('sender', 'eq', 'Foo'),
    where('message', 'contains-case-sensitive', 'world')
  )
)
const messages = await collection.find(query)
console.log(messages)
```

See the [WIKI](https://github.com/janwuesten/capricorn-db/wiki) for a documentation for all methods and features.

## License

The package is licensed under the MIT license. Check the `LICENSE.txt` for more information.

## Additional information

No AI was harmed in the making of this project. I will still provide LLM documentation once the human readable documentation is ready.