import { groupByField } from './helpers'
import { type GameRates, getOneGameRates } from './game'

export type ExtendedGameRate = GameRates
export type GamesRating = Record<string, ExtendedGameRate[]>
export interface MakeRatingOptions { omitUnviable?: boolean }

export async function makeRating (bggIds: number[], options?: MakeRatingOptions): Promise<GamesRating> {
  const promises = []

  const {
    omitUnviable = true
  } = options ?? {}

  for (const bggId of bggIds) promises.push(getOneGameRates(bggId, { omitUnviable }))

  const rateList = ((await Promise.allSettled(promises) as unknown) as FixedPromiseSettledResult[])
    .map(n => {
      if (n.status === 'rejected') {
        console.error(n.reason.slug, n.reason.message)

        return null
      }

      return n.value
    })
    .filter(Boolean)
    .flat(1) satisfies GameRates[]

  const rating = groupByField(rateList, 'number')

  for (const [key, value] of Object.entries(rating)) {
    rating[key] = value.sort((b: any, a: any) => a.rate - b.rate)
  }

  return rating as GamesRating
}
