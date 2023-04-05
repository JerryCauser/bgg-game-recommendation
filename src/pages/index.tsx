import Head from 'next/head'
import useSWR from 'swr'
import { useState } from 'react'
import { GameMeta, GameRates } from 'src/libs/game'
import { squeezePercents } from 'src/libs/helpers'
import { BEST_RATIO, NOT_RECOMMEND_RATIO } from 'src/libs/constants'

const fetcher = async (url: string): Promise<any> => await fetch(url)
  .then(async (res) => await res.json())
  .then(json => json.payload)

const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

enum RatingType { absolute, relative }

type ExtendedRate = GameRates & { totalRate: number, reviewScore: number }

export default function Home (): JSX.Element {
  const params = typeof window === 'undefined'
    ? new URLSearchParams('')
    : new URLSearchParams(window.location.search)
  const bggIds = params.get('bggIds') ?? ''
  const omitUnviable = params.has('omitUnviable')

  const [num, setNum] = useState(4)
  const { data: rating, isLoading: isLoadingRating } = useSWR(`/api/rating?${omitUnviable ? 'omitUnviable&' : ''}bggIds=${bggIds}`, fetcher)
  const { data: gamesDict, isLoading: isLoadingGames } = useSWR(`/api/game/all?dict=1&bggIds=${bggIds}`, fetcher)
  const [ratingType, setRtype] = useState(RatingType.absolute)

  const isLoading = isLoadingRating || isLoadingGames

  const currentRating = isLoading
    ? []
    : rating?.[num] as ExtendedRate[] ?? []

  return (
    <>
      <Head>
        <title>Games to play</title>
        <meta name='description' content='Games to play' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <link rel='icon' href='/favicon.ico' />
      </Head>
      <main className='main'>
        <div className='rating-type'>
          <button
            className={ratingType === RatingType.absolute ? 'active' : ''}
            onClick={() => setRtype(RatingType.absolute)}
          >
            Absolute Score
          </button>
          <button
            className={ratingType === RatingType.relative ? 'active' : ''}
            onClick={() => setRtype(RatingType.relative)}
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
            : <GameRatingRow rating={currentRating} metaDict={gamesDict} ratingType={ratingType} />
        }
      </main>
    </>
  )
}

function GameRatingRow ({ rating, metaDict, ratingType }: { rating: ExtendedRate[], metaDict: any, ratingType: RatingType }): JSX.Element {
  if (ratingType === RatingType.relative) {
    rating = squeezePercents(rating, 'rate')
  }

  for (const n of rating) {
    n.reviewScore = metaDict[n.bggId].rating * 10
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
    rating = squeezePercents(rating, 'totalRate', 100 + (100 * BEST_RATIO), NOT_RECOMMEND_RATIO * 100)
  }

  rating = rating.sort((b, a) => a.totalRate - b.totalRate)

  return (
    <section className='games'>
      {
        rating.map(game => {
          return (<GamesRating key={game.bggId} rating={game} meta={metaDict[game.bggId]} />)
        })
      }
    </section>
  )
}

function GamesRating (props: { meta: GameMeta, rating: GameRates & { totalRate: number } }): JSX.Element {
  const { meta, rating } = props

  return (
    <div className='game-container'>
      <img
        src={meta.image}
        alt={meta.name}
      />
      <div className='game-rating'>
        {(rating.totalRate).toFixed(0)}
      </div>
      <div className='game-description'>
        <div className='game-description-row'>
          <a href={meta.url as string} target='_blank' rel='noreferrer'>{meta.name}</a>
        </div>
        <div className='game-description-row'>
          <span>
            Review score:{' '}
          </span>
          <span>
            {meta.rating.toFixed(1)}
          </span>
        </div>
        <div className='game-description-row'>
          <span>
            Number of players score:{' '}
          </span>
          <span>
            {rating.rate.toFixed(0)}
          </span>
        </div>
      </div>
    </div>
  )
}
