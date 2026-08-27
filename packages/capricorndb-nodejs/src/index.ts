export * from '@janwuesten/capricorndb-core'
import { CapricornDB, CapricornDBInstanceManager } from '@janwuesten/capricorndb-core'
import { CapricornDBService } from '@/classes/service'
import { DatabaseSync } from 'node:sqlite'
import { existsSync, mkdirSync } from 'fs'

/**
 * Options for creating a CapricornDB instance.
 */
export interface CapricornDBCreateOptions {
  /**
   * The path to the database file. If the file does not exist, it will be created. Use :memory: to create an in-memory database.
   */
  path: string
}

/**
 * Creates a new instance of CapricornDB using the provided options.
 * @param options The options to create the CapricornDB instance.
 * @returns A promise that resolves to the CapricornDB instance.
 */
export const createCapricornDB = async (options: CapricornDBCreateOptions) => {
  const database = new DatabaseSync(options.path, {
    allowExtension: true
  })
  const capricorn = await CapricornDB.create({
    service: new CapricornDBService(database, options)
  })
  return capricorn
}

/**
 * Retrieves an existing CapricornDB instance by name. If the instance does not exist or is closed, a new instance will be created.
 * @param name The name of the CapricornDB instance to retrieve.
 * @returns A promise that resolves to the CapricornDB instance.
 */
export const retrieveCapricornDB = async (name: string = 'default') => {
  const instanceManager = CapricornDBInstanceManager.getInstance()
  const instance = instanceManager.getCapricornDBInstance(name)
  if (instance && instance.isOpen) {
    return instance
  }
  if (!existsSync('./capricorn')) {
    mkdirSync('./capricorn')
  }
  const capricorn = await createCapricornDB({
    path: `./capricorn/${name}.capricorn`
  })
  instanceManager.addCapricornDBInstance(name, capricorn)
  return capricorn
}