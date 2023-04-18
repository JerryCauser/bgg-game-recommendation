import { NextApiRequest, NextApiResponse } from 'next'
import db from 'src/server/db'
import useSSE from 'src/server/use-sse'
import { getOneGameRates } from 'src/server/external-api/game-rates'
import { POLL_TYPES } from 'src/server/constants'
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

  if (meta.ac !== null) meta.ac.abort()

  const { collections } = await db

  const ac = meta.ac = new AbortController()

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [send, end] = useSSE(res, () => ac.abort())

  try {
    const bggIds: number[] = (
      await collections.games
        .aggregate([
          {
            $match: {
              ratesFilledAt: { $exists: false },
              bggId: { $gte: meta.lastBggId ?? 0 }
            }
          },
          { $project: { bggId: 1 } },
          { $sort: { bggId: 1 } }
        ])
        .toArray() ?? []
    ).map(r => r.bggId as number)

    while (bggIds.length > 0 && !ac.signal.aborted) {
      const chunk = bggIds.splice(0, 10)

      const polls = (
        await Promise.allSettled(
          chunk.map(async (id) => await getOneGameRates(id))
        )
      ) as FixedPromiseSettledResult[]

      const bulk = collections.polls.initializeUnorderedBulkOp()
      const gamesBulk = collections.games.initializeUnorderedBulkOp()

      for (const { value: poll } of polls) {
        if (poll === undefined) continue

        const bggId = poll[0]?.bggId
        if (typeof bggId === 'number') {
          gamesBulk.find({ bggId }).updateOne({ $set: { ratesFilledAt: Date.now() } })
        }

        for (const rate of poll) {
          bulk.find({ bggId: rate.bggId, number: rate.number })
            .upsert()
            .updateOne({
              $set: {
                ...rate,
                type: POLL_TYPES.PLAYER_NUMBER,
                updatedAt: Date.now()
              }
            })
        }
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
