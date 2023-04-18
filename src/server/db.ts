import type { Collection, Db } from 'mongodb'
import { MongoClient, ServerApiVersion } from 'mongodb'

interface Collections {
  games: Collection
  credits: Collection
  polls: Collection
}

interface DbInstance {
  db: Db
  mongoClient: MongoClient
  collections: Collections
}

let db: Db
let mongoClient: MongoClient
let collections: Collections

interface options {
  name: string
  url: string
}

async function initDb ({ name, url }: options): Promise<void> {
  try {
    mongoClient = new MongoClient(url, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true
      }
    })

    await mongoClient.connect()

    db = mongoClient.db(name)

    console.log(`Connected to DB ${url} ${name}`)

    collections = {
      games: db.collection('games'),
      credits: db.collection('credits'),
      polls: db.collection('polls')
    }
  } catch (e) {
    console.error('initDb error:', e)
    await initDb({ name, url })
  }
}

const instance: Promise<DbInstance> = new Promise((resolve, reject) => {
  initDb({
    name: process.env.DB_NAME as string,
    url: process.env.MONGODB_URL as string
  })
    .then(() => {
      resolve({ db, mongoClient, collections })
    })
    .catch(reject)
})

export default instance
