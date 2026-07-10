export * from '@janwuesten/capricorndb-core'
import { CapricornDB } from '@janwuesten/capricorndb-core'
import { CapricornDBService } from '@/classes/CapricornDBService'
import { DatabaseSync } from 'node:sqlite'

/**
 * Options for creating a CapricornDB instance.
 */
export interface CapricornDBCreateOptions {
  /**
   * The path to the database file. If the file does not exist, it will be created. Use :memory: to create an in-memory database.
   */
  databasePath: string
}

/**
 * Creates a new instance of CapricornDB using the provided options.
 * @param options The options to create the CapricornDB instance.
 * @returns A promise that resolves to the CapricornDB instance.
 */
export const getCapricornDB = async (options: CapricornDBCreateOptions) => {
  const database = new DatabaseSync(options.databasePath, {
    allowExtension: true
  })
  const capricorn = await CapricornDB.create({
    service: new CapricornDBService(database)
  })
  return capricorn
}