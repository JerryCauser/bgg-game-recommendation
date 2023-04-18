import type { GameRates } from 'src/server/external-api/game-rates'
import type { GameItem } from 'src/server/external-api/games'
import Head from 'next/head'
import useSWR from 'swr'
import { useEffect, useState } from 'react'
import { squeezePercents, groupByField, makeDict } from 'src/libs/helpers'
import { BEST_RATIO, NOT_RECOMMEND_RATIO } from 'src/server/constants'

const fetcher = async (url: string): Promise<any> => await fetch(url)
  .then(async (res) => await res.json())
  .then(json => json.payload)

const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

enum RatingType { absolute, relative }

type ExtendedRate = GameRates & { totalRate: number, reviewScore: number }
type ExtendedRateDict = Record<string, ExtendedRate[]>
type GameDict = Record<any, GameItem>

export default function Home (): JSX.Element {
  const params = typeof window === 'undefined'
    ? new URLSearchParams('')
    : new URLSearchParams(window.location.search)
  const bggIds = params.get('bggIds') ?? ''

  const [num, setNum] = useState<number>(4)
  const [rating, setRating] = useState<ExtendedRateDict>()
  const [games, setGames] = useState<GameDict>()
  const { data: rateList } = useSWR(`/api/games/rating?bggIds=${bggIds}`, fetcher, { revalidateOnFocus: false, revalidateOnReconnect: false })
  const { data: gameList } = useSWR(`/api/games/all?bggIds=${bggIds}`, fetcher, { revalidateOnFocus: false, revalidateOnReconnect: false })
  const [ratingType, setRType] = useState<RatingType>(RatingType.absolute)

  const isLoading = games === undefined || rating === undefined

  useEffect(() => {
    if (Array.isArray(rateList) && rateList.length > 0) setRating(groupByField(rateList, 'number'))
  }, [rateList])

  useEffect(() => {
    if (Array.isArray(gameList) && gameList.length > 0) setGames(makeDict(gameList, 'bggId'))
  }, [gameList])

  const currentRating = isLoading
    ? []
    : rating?.[num.toString()] ?? []

  return (
    <>
      <Head>
        <title>Games to play</title>
        <meta name='description' content='Games to play' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <link rel='icon' href='/favicon.ico' />
        <script async src='/lazysizes.min.js' />
      </Head>
      <main className='main'>
        <div className='rating-type'>
          <button
            className={ratingType === RatingType.absolute ? 'active' : ''}
            onClick={() => setRType(RatingType.absolute)}
          >
            Absolute Score
          </button>
          <button
            className={ratingType === RatingType.relative ? 'active' : ''}
            onClick={() => setRType(RatingType.relative)}
          >
            Relative Score
          </button>
        </div>
        <div className='button-container'>
          <span className='button-container-label'>Players:</span>
          {numbers.map(n => (<button className={n === num ? 'active' : ''} key={n} onClick={() => setNum(n)}>{n}</button>))}
        </div>
        {
          isLoading
            ? '...loading...'
            : <GameRatingContainer rating={currentRating} games={games} ratingType={ratingType} />
        }
      </main>
    </>
  )
}

function GameRatingContainer (props: { rating: ExtendedRate[], games: GameDict, ratingType: RatingType }): JSX.Element {
  let { rating, games, ratingType } = props

  if (ratingType === RatingType.relative) {
    rating = squeezePercents(rating, 'rate')
  } else {
    rating = squeezePercents(rating, 'rate', BEST_RATIO * 100, NOT_RECOMMEND_RATIO * 100)
  }

  for (const n of rating) {
    n.reviewScore = (games[n.bggId].avgScore ?? 0) * 10
  }

  if (ratingType === RatingType.relative) {
    rating = squeezePercents(rating, 'reviewScore')
  }

  for (const n of rating) {
    n.totalRate = n.rate + n.reviewScore
  }

  if (ratingType === RatingType.relative) {
    rating = squeezePercents(rating, 'totalRate')
  } else {
    rating = squeezePercents(rating, 'totalRate', 200, 0)
  }

  rating = rating.sort((b, a) => a.totalRate - b.totalRate)

  return (
    <section className='games'>
      {
        rating.map(game => {
          return (<GamesRating key={game.bggId} rating={game} meta={games[game.bggId]} />)
        })
      }
    </section>
  )
}

function GamesRating (props: { meta: GameItem, rating: GameRates & { totalRate: number } }): JSX.Element {
  const { meta, rating } = props

  return (
    <div className='game-container'>
      <img
        data-src={meta.image ?? meta.imageSmall}
        alt={meta.name}
        className='lazyload'
      />
      <div className='game-rating'>
        {(rating.totalRate).toFixed(0)}
      </div>
      <div className='game-description'>
        <div className='game-description-row'>
          <a href={meta.url} target='_blank' rel='noreferrer'>{meta.name}</a>
        </div>
        <div className='game-description-row'>
          <span>
            Review score:{' '}
          </span>
          <span>
            {meta.avgScore?.toFixed(1) ?? '—'}
          </span>
        </div>
        <div className='game-description-row'>
          <span>
            Number of players score:{' '}
          </span>
          <span>
            {(rating.rate / 10).toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  )
}
