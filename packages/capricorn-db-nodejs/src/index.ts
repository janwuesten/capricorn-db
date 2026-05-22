export * from '@janwuesten/capricorn-db-core'
import { CapricornDB } from '@janwuesten/capricorn-db-core'
import { CapricornDBService } from '@/classes/CapricornDBService'
import { DatabaseSync } from 'node:sqlite'

export interface CapricornDBCreateOptions {
  databasePath: string
}
export const getCapricornDB = async (options: CapricornDBCreateOptions) => {
  const database = new DatabaseSync(options.databasePath, {
    allowExtension: true
  })
  const capricorn = await CapricornDB.create({
    service: new CapricornDBService(database)
  })
  return capricorn
}