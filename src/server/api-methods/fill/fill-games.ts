import { NextApiRequest, NextApiResponse } from 'next'
import db from 'src/server/db'
import useSSE from 'src/server/use-sse'
import { getItemsByRank } from 'src/server/external-api/games'
import { auth } from 'src/server/auth'

export const meta = {
  ac: null as (AbortController | null),
  from: 0
}

const MAX = 10000

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
    const gameGenerator = getItemsByRank(
      meta.from,
      MAX,
      ac.signal
    )

    let bulk = collections.games.initializeUnorderedBulkOp()

    const commit = async (oneMore: boolean): Promise<void> => {
      await bulk.execute().catch(() => {})

      if (oneMore) bulk = collections.games.initializeUnorderedBulkOp()
    }

    for await (const game of gameGenerator) {
      bulk.find({ bggId: game.bggId }).upsert().updateOne({
        $set: {
          ...game,
          updatedAt: Date.now()
        }
      })

      meta.from += 1

      if ((meta.from & 0xff) === 0) {
        await commit(true)
        send(((meta.from / MAX) * 100).toFixed(0) + '%')
      }
    }

    await commit(false)

    send('1', 'done')
  } catch (error) {
    console.error(error)
    send({ statusCode: 400, error: error.message }, 'error')
  } finally {
    if (meta.ac === ac) {
      meta.ac = null
    }
    if (meta.from >= MAX) meta.from = 0

    end()
  }
}
