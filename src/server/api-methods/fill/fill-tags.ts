import { NextApiRequest, NextApiResponse } from 'next'
import { collections, mongoClient } from 'src/server/db'
import { GameTagsGenerator } from 'src/server/external-api/game-tags'
import { auth } from 'src/server/auth'

export const meta = {
  ac: null as (AbortController | null)
}

export async function handler (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  auth(req, res).throw()

  if (meta.ac !== null) meta.ac.abort()

  const ac = meta.ac = new AbortController()

  try {
    await mongoClient.connect()
    const credits = collections.credits.find({})

    let i = 100
    while (--i > 0) {
      const bulk = collections.games.initializeUnorderedBulkOp()
      let credit = null

      for (let i = 0; i < 1000; ++i) {
        if (ac.signal.aborted) break
        credit = await credits.next()

        if (credit === null) break

        bulk
          .find({ bggId: credit.bggId })
          .updateOne({
            $set: {
              tags: [...GameTagsGenerator(credit.tags)]
            }
          })
      }

      await bulk.execute().catch(() => {})

      if (credit === null) break
    }

    res.status(200).json({
      statusCode: 200,
      message: 'done'
    })
  } catch (error) {
    res.status(200).json({ statusCode: 400, error: error.message })
  } finally {
    if (meta.ac === ac) {
      meta.ac = null
    }
    await mongoClient.close()
  }
}
