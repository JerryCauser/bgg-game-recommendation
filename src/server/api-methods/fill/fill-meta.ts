import { NextApiRequest, NextApiResponse } from 'next'
import db from 'src/server/db'
import useSSE from 'src/server/use-sse'
import { getGameMetaInfo } from 'src/server/external-api/game-meta'
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
          { $match: { bggId: { $gte: meta.lastBggId ?? 0 }, metaFilledAt: { $exists: false } } },
          { $project: { bggId: 1 } },
          { $sort: { bggId: 1 } }
        ])
        .toArray() ?? []
    ).map(r => r.bggId as number)

    while (bggIds.length > 0 && !ac.signal.aborted) {
      const chunk = bggIds.splice(0, 10)

      const gamesWithTags = await Promise.all(chunk.map(async (id) => await getGameMetaInfo(id)))

      const bulk = collections.games.initializeUnorderedBulkOp()

      for (const game of gamesWithTags) {
        bulk.find({ bggId: game.bggId }).upsert().updateOne({
          $set: {
            ...game,
            metaFilledAt: Date.now(),
            updatedAt: Date.now()
          }
        })
      }

      await bulk.execute().catch(() => {})

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
