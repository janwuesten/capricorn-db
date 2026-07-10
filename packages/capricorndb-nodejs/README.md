# Capricorn DB for NodeJS

## Introduction

The Capricorn DB is a Document database for local runtimes like Desktop Apps or React Native Apps. It offers a syntax similar to MongoDB for local apps and is fully compatible with TypeScript for avoid typos and type missmatches.

This package is for the NodeJS runtime.

## Features

| Feature | Version |
| -- | -- |
| Inserting documents | 0.1.0 |
| Updating documents | 0.1.0 |
| Deleting documents | 0.1.0 |
| Query documents | 0.1.0 |
| Events for realtime Updates | 0.1.0 |

## Requirements

To use this package, the following requirements are needed:

- [NodeJS](https://nodejs.org/en) 22 or newer
- [TypeScript](https://www.typescriptlang.org) (optional, but recommended)

## Installation

To install Capricorn DB for NodeJS install the `@janwuesten/capricorn-db-nodejs` with your favorite package manager:

`pnpm i @janwuesten/capricorn-db-nodejs`

## Getting started

To create a capricorn database, simply use the `createCapricornDB` method and specify a `databasePath` for your database. No additional configuration is required for NodeJS.

```ts
import { createCapricornDB } from '@janwuesten/capricorn-db-nodejs'

const capricorn = await createCapricornDB({
  databasePath: './myDatabase.capricorndb'
})
```

You are now ready to use the Capricorn DB in your project.

See the WIKI for a documentation for all methods.