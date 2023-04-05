import type { NextApiRequest, NextApiResponse } from 'next'
import type { GamesRating } from 'src/libs/rating'
import { makeRating } from 'src/libs/rating'

interface ResponseData {
  statusCode: number
  payload?: GamesRating
  error?: any
}

export default async function handler (
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
): Promise<void> {
  try {
    const ids = typeof req.query.bggIds === 'string'
      ? req.query.bggIds.split(',').map(s => parseInt(s, 10))
      : []
    const omitUnviable = Reflect.has(req.query, 'omitUnviable')

    const rating = await makeRating(ids, { omitUnviable })

    res.status(200).json({
      statusCode: 200,
      payload: rating
    })
  } catch (error) {
    res.status(200).json({ statusCode: 400, error: error.message })
  }
}
