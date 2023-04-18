import { NextApiRequest, NextApiResponse } from 'next'
import db from 'src/server/db'
import useSSE from 'src/server/use-sse'
import { getBggGameTags } from 'src/server/external-api/game-tags'
import { auth } from 'src/server/auth'

export const meta = {
  ac: null as (AbortController | null),
  lastBggId: 0
}

export async function handler (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  auth(req, res).throw()

  if (meta.ac !== null) {
    meta.ac.abort()
  }

  const { collections } = await db

  const ac = meta.ac = new AbortController()

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [send, end] = useSSE(res, () => ac.abort())

  try {
    const bggIds: number[] = (
      await collections.games
        .aggregate([
          { $match: { bggId: { $gte: meta.lastBggId ?? 0 }, creditsFilledAt: { $exists: false } } },
          { $project: { bggId: 1 } },
          { $sort: { bggId: 1 } }
        ])
        .toArray() ?? []
    ).map(r => r.bggId as number)

    while (bggIds.length > 0 && !ac.signal.aborted) {
      const chunk = bggIds.splice(0, 10)

      const gamesWithTags = await Promise.all(chunk.map(async (id) => await getBggGameTags(id)))

      const bulk = collections.credits.initializeUnorderedBulkOp()
      const gamesBulk = collections.games.initializeUnorderedBulkOp()

      for (const { bggId, tags } of gamesWithTags) {
        bulk.find({ bggId }).upsert().updateOne({
          $set: {
            bggId,
            tags,
            updatedAt: Date.now()
          }
        })

        gamesBulk.find({ bggId }).updateOne({ $set: { creditsFilledAt: Date.now() } })
      }

      await bulk.execute().catch(() => {})
      await gamesBulk.execute().catch(() => {})

      meta.lastBggId = bggIds[0] ?? 0

      send(bggIds.length.toString() + ' left')
    }

    send('1', 'done')
  } catch (error) {
    console.error(error)
    send({ statusCode: 400, error: error.message }, 'error')
  } finally {
    if (meta.ac === ac) {
      meta.ac = null
    }
    end()
  }
}
