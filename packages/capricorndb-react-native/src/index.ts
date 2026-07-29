export * from '@janwuesten/capricorndb-core'
import { CapricornDB } from '@janwuesten/capricorndb-core'
import { CapricornDBService } from './classes/service'
import { open } from 'react-native-nitro-sqlite'

/**
 * Options for creating a CapricornDB instance.
 */
export interface CapricornDBCreateOptions {
  /**
   * The path to the database file. If the file does not exist, it will be created. Use :memory: to create an in-memory database.
   */
  name: string

  /**
   * The location where the database file should be stored. This is optional and can be used to specify a custom location for the database file. If not provided, the default location will be used.
   */
  location?: string
}

/**
 * Creates a new instance of CapricornDB using the provided options.
 * @param options The options to create the CapricornDB instance.
 * @returns A promise that resolves to the CapricornDB instance.
 */
export const createCapricornDB = async (options: CapricornDBCreateOptions) => {
  const database = open({
    name: options.name,
    location: options.location
  })
  const capricorn = await CapricornDB.create({
    service: new CapricornDBService(database)
  })
  return capricorn
}