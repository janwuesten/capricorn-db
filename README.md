# CapricornDB

## Introduction

CapricornDB is a NoSQL database for local application storage such as React Native app development.

It is based on SQLite and comes with a MongoDB similar syntax and improved query language that works nativly with TypeScript types.

It has several packages for different runtimes that will extend over time.

The database is currently in development and not feature complete.

## Requirements

The requirements will vary depending on the runtime, but in general using CapricornDB requires:

- [Node.js 22+](https://nodejs.org/en)
- [TypeScript](https://www.typescriptlang.org)
- A package manager of your choice. PNPM recommended.

Package specific requirements are displayed inside the specific package documentation.

## Quick start

1. Install the package for your runtime (see package documentation for more information) with the package manager of your choice. 

`pnpm i @janwuesten/capricorn-db-nodejs`

2. Create a CapricornDB instance.

```ts
const capricornDB = await createCapricornDB({
  databasePath: './myDatabase.capricorndb'
})
```

3. Insert some documents inside a collection

```ts
const collection = capricorn.collection<Message>('test')
await collection.insertMany([
  {
    message: 'Hello world!',
    sender: 'Foo'
  }
])
```

4. Query some documents
```ts
const messages = await collection.find({
  sender: 'Foo'
})
console.log(messages)
```

5. Perform complex queries
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

## Contributing

At the moment, the CapricornDB is in active development. As it is primarily created at the moment to solve my problems, contributing is not possible at this stage in development in order to focus on the direction I have in mind.

Later when my direction is set and my problems are generally solved, Contributing will of couse be open.

If you have any suggestion, improvements or bugs you can always open an issue.

## License

All packages are generally licensed unter the MIT license. Check the `LICENSE.txt` for each package for more information.

## Additional information

No AI was harmed in the making of this project. I will still provide LLM documentation once the human readable documentation is ready.