import type { Collection, Db } from 'mongodb'
import { MongoClient, ServerApiVersion } from 'mongodb'

interface Collections {
  games: Collection
  credits: Collection
  polls: Collection
}

export const mongoClient: MongoClient = new MongoClient(process.env.MONGODB_URL as string, {
  maxConnecting: 10,
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true
  }
})

export const db: Db = mongoClient.db(process.env.DB_NAME)

export const collections: Collections = {
  games: db.collection('games'),
  credits: db.collection('credits'),
  polls: db.collection('polls')
}
