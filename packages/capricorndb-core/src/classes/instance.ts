import { CapricornDB } from './capricorn'

export class CapricornDBInstanceManager {
  private static instance: CapricornDBInstanceManager
  private capricornDBInstances: Map<string, CapricornDB> = new Map()

  public static getInstance(): CapricornDBInstanceManager {
    if (!CapricornDBInstanceManager.instance) {
      CapricornDBInstanceManager.instance = new CapricornDBInstanceManager()
    }
    return CapricornDBInstanceManager.instance
  }

  private constructor() {
    
  }

  public getCapricornDBInstance(name: string): CapricornDB | null {
    return this.capricornDBInstances.get(name) ?? null
  }

  public addCapricornDBInstance(name: string, instance: CapricornDB): void {
    this.capricornDBInstances.set(name, instance)
  }

  public removeCapricornDBInstance(name: string): void {
    this.capricornDBInstances.delete(name)
  }
}