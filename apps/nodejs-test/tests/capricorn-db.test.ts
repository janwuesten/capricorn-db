import { and, CapricornDB, createCapricornDB, or, where, WithCapricornID } from '@janwuesten/capricorndb-nodejs'

interface TestDocument {
  name: string
  age: number
  flags: string[]
  address?: {
    street: string
    city: string
  }
}
interface TestDocumentForSpeed {
  number: number
}

describe('capricorn-db', () => {
  let capricorn: CapricornDB
  it('should create a capricorn instance', async () => {
    capricorn = await createCapricornDB({
      databasePath: ':memory:'
    })
    expect(capricorn).toBeDefined()
  })
  it('should create a collection and insert a document', async () => {
    const collection = capricorn.collection<TestDocument>('test')
    const document: TestDocument = {
      name: 'John Doe',
      age: 30,
      flags: ['active'],
      address: {
        street: '123 Main St',
        city: 'Anytown'
      }
    }
    const insertedDocument = await collection.insertOne(document)
    expect(insertedDocument).toBeDefined()
    expect(insertedDocument.id).toBeDefined()
    expect(insertedDocument.name).toBe(document.name)
    expect(insertedDocument.age).toBe(document.age)
    expect(insertedDocument.flags).toEqual(document.flags)
  })
  it('should insert multiple documents', async () => {
    const collection = capricorn.collection<TestDocument>('test')
    const documents: TestDocument[] = [
      { name: 'Alice', age: 25, flags: ['active'], address: { street: '456 Elm St', city: 'Othertown' } },
      { name: 'Bob', age: 35, flags: ['inactive'], address: { street: '789 Oak St', city: 'Sometown' } }
    ]
    const insertedDocuments = await collection.insertMany(documents)
    expect(insertedDocuments).toBeDefined()
    expect(insertedDocuments.length).toBe(documents.length)
    for (let i = 0; i < documents.length; i++) {
      expect(insertedDocuments[i].id).toBeDefined()
      expect(insertedDocuments[i].name).toBe(documents[i].name)
      expect(insertedDocuments[i].age).toBe(documents[i].age)
      expect(insertedDocuments[i].flags).toEqual(documents[i].flags)
      expect(insertedDocuments[i].address).toEqual(documents[i].address)
    }
  })
  it('should insert document with id', async () => {
    const collection = capricorn.collection<TestDocument>('test')
    const document: TestDocument & { id: string } = {
      id: await capricorn.newDocumentID(),
      name: 'Eve',
      age: 22,
      flags: ['active', 'new'],
      address: { street: '321 Maple St', city: 'Newtown' }
    }
    const insertedDocument = await collection.insertOne(document)
    expect(insertedDocument).toBeDefined()
    expect(insertedDocument.id).toBe(document.id)
    expect(insertedDocument.name).toBe(document.name)
    expect(insertedDocument.age).toBe(document.age)
    expect(insertedDocument.flags).toEqual(document.flags)
    expect(insertedDocument.address).toEqual(document.address)
  })
  it('should find documents by id', async () => {
    const collection = capricorn.collection<TestDocument>('test')
    const document: TestDocument = {
      name: 'Charlie',
      age: 28,
      flags: ['active', 'new'],
      address: { street: '321 Maple St', city: 'Newtown' }
    }
    const insertedDocument = await collection.insertOne(document)
    const foundDocument = await collection.findOne({
      id: insertedDocument.id
    })
    expect(foundDocument).toBeDefined()
    expect(foundDocument?.id).toBe(insertedDocument.id)
    expect(foundDocument?.name).toBe(document.name)
    expect(foundDocument?.age).toBe(document.age)
    expect(foundDocument?.flags).toEqual(document.flags)
    expect(foundDocument?.address).toEqual(document.address)
  })
  it('should find documents by simple query', async () => {
    const collection = capricorn.collection<TestDocument>('test')
    const result = await collection.find({ name: 'Alice' })
    expect(result).toBeDefined()
    expect(result.length).toBe(1)
    expect(result[0].name).toBe('Alice')
  })
  it('should find documents by complex query', async () => {
    const collection = capricorn.collection<TestDocument>('test')
    const query = collection.createQuery(
      where('age', 'gte', 30),
      or(
        where('flags', 'array-contains', 'active'),
        where('address.city', 'eq', 'Sometown'),
        where('name', 'eq', 'Bob')
      )
    )
    
    const result = await collection.find(query)
    expect(result).toBeDefined()
    expect(result.length).toBe(2)
    const names = result.map((doc) => doc.name)
    expect(names).toContain('John Doe')
    expect(names).toContain('Bob')
  })
  it('should update one document', async () => {
    const collection = capricorn.collection<TestDocument>('test')
    const insertedDocument = await collection.insertOne({
      name: 'Inga',
      age: 19,
      flags: ['active'],
      address: { street: '456 Elm St', city: 'Othertown' }
    })
    await collection.updateOne({ id: insertedDocument.id }, { age: 20 })
    const updatedDocument = await collection.findOne({ id: insertedDocument.id })
    expect(updatedDocument).toBeDefined()
    expect(updatedDocument?.age).toBe(20)
  })
  it('should update many documents', async () => {
    const collection = capricorn.collection<TestDocument>('test')
    await collection.insertMany([
      { name: 'Dave', age: 40, flags: ['inactive'], address: { street: '789 Oak St', city: 'Sometown' } },
      { name: 'Eve', age: 22, flags: ['active', 'new'], address: { street: '321 Maple St', city: 'Newtown' } }
    ])
    await collection.updateMany(collection.createQuery(where('flags', 'gt', 'inactive')), { flags: ['active'] })
    const updatedDocuments = await collection.find(collection.createQuery(
      or(
        where('name', 'eq', 'Dave'),
        where('flags', 'array-contains', 'active')
      )
    ))
    expect(updatedDocuments).toBeDefined()
    const names = updatedDocuments.map((doc) => doc.name)
    expect(names).toContain('Dave')
    expect(names).toContain('Eve')
  })
  it('should work with transactions', async () => {
    const collection = capricorn.collection<TestDocument>('test')
    await capricorn.withTransaction(async () => {
      await collection.insertOne({
        name: 'Frank',
        age: 22,
        flags: ['inactive'],
        address: { street: '654 Pine St', city: 'Oldtown' }
      })
      await collection.insertOne({
        name: 'Charlie',
        age: 23,
        flags: ['inactive'],
        address: { street: '654 Pine St', city: 'Oldtown' }
      })
    })
    const foundDocument = await collection.findOne({ name: 'Frank', age: 22 })
    expect(foundDocument).toBeDefined()
    expect(foundDocument?.name).toBe('Frank')
    const newID = await capricorn.newDocumentID()
    try {
      await capricorn.withTransaction(async () => {
        await collection.insertOne({
          id: newID,
          name: 'Simon',
          age: 45,
          flags: ['inactive'],
          address: { street: '654 Pine St', city: 'Oldtown' }
        } as WithCapricornID<TestDocument>)
        await collection.insertOne({
          id: 'invalid-id-to-fail',
          name: 'Charlie',
          age: 23,
          flags: ['inactive'],
          address: { street: '654 Pine St', city: 'Oldtown' }
        } as WithCapricornID<TestDocument>)
      })
      /* eslint-disable no-empty */
    } catch {}
    const hopefullyMissingDocument = await collection.findOne({ id: newID })
    expect(hopefullyMissingDocument).toBeNull()
  })
  it('should perform 10000 insertions in under 1 second', async () => {
    const collection = capricorn.collection<TestDocumentForSpeed>('speedtest')
    const documents: TestDocumentForSpeed[] = []
    for (let i = 0; i < 10000; i++) {
      documents.push({ number: i })
    }
    const startTime = Date.now()
    await collection.insertMany(documents)
    const endTime = Date.now()
    const duration = endTime - startTime
    expect(duration).toBeLessThan(1000)
  })
  it('should handle a simple query inside a large collection in under 10ms', async () => {
    const collection = capricorn.collection<TestDocumentForSpeed>('speedtest')
    const startTime = Date.now()
    const result = await collection.find({ number: 5000 })
    const endTime = Date.now()
    const duration = endTime - startTime
    expect(result).toBeDefined()
    expect(result.length).toBe(1)
    expect(result?.[0]?.number).toBe(5000)
    expect(duration).toBeLessThan(10)
  })
  it('should handle a complex query inside a large collection in under 10ms', async () => {
    const collection = capricorn.collection<TestDocumentForSpeed>('speedtest')
    const query = collection.createQuery(or(
      and(
        where('number', 'gte', 9990),
        where('number', 'lte', 9999)
      ),
      and(
        where('number', 'gte', 0),
        where('number', 'lte', 999)
      )
    ))
    const startTime = Date.now()
    const result = await collection.find(query)
    const endTime = Date.now()
    const duration = endTime - startTime
    expect(result).toBeDefined()
    expect(result.length).toBe(1010)
    expect(duration).toBeLessThan(10)
  })
  it('should cleanup the collection', async () => {
    const collection = capricorn.collection<TestDocumentForSpeed>('speedtest')
    await collection.deleteMany({})
    const count = await collection.find({})
    expect(count.length).toBe(0)
  })
})
