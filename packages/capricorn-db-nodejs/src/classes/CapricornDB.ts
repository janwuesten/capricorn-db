import { CapricornDB } from '@janwuesten/capricorn-db-core'
import { CapricornDBService } from './CapricornDBService'
import { DatabaseSync } from 'node:sqlite'

export interface CapricornDBCreateOptions {
  databasePath: string
}
export const getCapricorn = async (options: CapricornDBCreateOptions) => {
  const database = new DatabaseSync(options.databasePath, {
    allowExtension: true
  })
  const capricorn = await CapricornDB._create({
    service: new CapricornDBService(database)
  })
  return capricorn
}