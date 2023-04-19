import type { NextPageContext } from 'next'
import type { GameRates } from 'src/server/external-api/game-rates'
import type { FilledGame } from 'src/server/api-methods/games/everything'
import { MutableRefObject, useEffect, useRef, useState } from 'react'
import Head from 'next/head'
import useSWR from 'swr'
import { ViewportList } from 'react-viewport-list'
import { squeezePercents, groupByField, makeDict, hasIntersection } from 'src/libs/helpers'
import { BEST_RATIO, NOT_RECOMMEND_RATIO } from 'src/server/constants'
import { GameTags } from 'src/server/external-api/game-tags.ts'
import Selector from 'src/components/Selector.tsx'
import ScrollToTopButton from 'src/components/ScrollToTopButton.tsx'

const fetcher = async (url: string): Promise<any> => await fetch(url)
  .then(async (res) => await res.json())
  .then(json => json.payload)

const PLAYERS_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

enum ComparisonType { absolute = 'Absolute', relative = 'Relative' }
enum RatingType { geek = 'Geek', user = 'User' }

const TagsOptions = Object.values(GameTags)

const ComparisonOptions = [
  { value: ComparisonType.absolute, title: 'Absolute Score' },
  { value: ComparisonType.relative, title: 'Relative Score' }
]

const RatingOptions = [
  { value: RatingType.geek, title: 'Geeks Rating' },
  { value: RatingType.user, title: 'Users Rating' }
]

type ExtendedRate = GameRates & { ratingToUse: number, totalRate: number, reviewScore: number }
type ExtendedRateDict = Record<string, ExtendedRate[]>
type GameDict = Record<any, FilledGame>

export default function Home (props: { telegram: boolean }): JSX.Element {
  const params = typeof window === 'undefined'
    ? new URLSearchParams('')
    : new URLSearchParams(window.location.search)
  const bggIds = params.get('bggIds') ?? ''

  const [tags, setTags] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const scrollRef = useRef<HTMLElement | null>(null)
  const [num, setNum] = useState<number>(4)
  const [rating, setRating] = useState<ExtendedRateDict>()
  const [games, setGames] = useState<GameDict>()
  const { data: gameList } = useSWR<FilledGame[]>(`/api/games/everything?bggIds=${bggIds}`, fetcher, { revalidateOnFocus: false, revalidateOnReconnect: false })
  const [comparisonType, setCType] = useState<ComparisonType>(ComparisonType.absolute)
  const [ratingType, setRType] = useState<RatingType>(RatingType.geek)

  const isLoading = games === undefined || rating === undefined

  useEffect(() => {
    if (Array.isArray(gameList)) {
      let list: FilledGame[] = []

      if (search.length > 1 || tags.length > 0) {
        const regexpText = search
          .replace(/[^\w.,;]/g, ' ')
          .split(/[,;]/)
          .map(n => n.trim())
          .filter(n => n !== '')
          .join('|')

        const regexp = new RegExp(regexpText, 'im')

        for (const game of gameList) {
          if (regexp.test(game.name) && hasIntersection(tags, game.tags)) {
            list.push(game)
          }
        }
      } else {
        list = gameList
      }

      setGames(makeDict(list, 'bggId'))

      const rateList = list
        .map(n => n.polls)
        .flat(1)

      setRating(groupByField(rateList, 'number'))
    }
  }, [gameList, search, tags])

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
        {
          props.telegram ? (<script defer src='https://telegram.org/js/telegram-web-app.js' />) : null
        }
      </Head>
      <main className='main-overflow' ref={scrollRef}>
        <div className='main'>
          <div className='filter'>
            <div className='filter-search'>
              <input type='text' placeholder='...' onInput={e => setSearch((e.target as any).value as string)} />
            </div>
            <div className='strange-row'>
              <Selector
                title='Comparison'
                options={ComparisonOptions}
                value={comparisonType}
                onInput={(value) => setCType(value)}
              />
              <Selector
                title='Rating'
                options={RatingOptions}
                value={ratingType}
                onInput={(value) => setRType(value)}
              />
              <Selector
                title='Tags'
                options={TagsOptions}
                value={tags}
                multiple
                onInput={(value) => setTags(value)}
              />
              <Selector
                title='Players'
                options={PLAYERS_NUMBERS}
                value={num}
                onInput={(value) => setNum(value)}
                hiddenDefault={false}
              />
            </div>
          </div>
          {
            isLoading
              ? '...loading...'
              : <GameRatingContainer
                  rating={currentRating}
                  games={games}
                  ratingType={ratingType}
                  comparisonType={comparisonType}
                  containerRef={scrollRef}
                />
          }
        </div>
      </main>
      <ScrollToTopButton overflowRef={scrollRef} />
    </>
  )
}

function GameRatingContainer (props: {
  rating: ExtendedRate[]
  games: GameDict
  ratingType: RatingType
  comparisonType: ComparisonType
  containerRef: MutableRefObject<HTMLElement | null>
}): JSX.Element {
  let {
    rating,
    games,
    ratingType,
    comparisonType,
    containerRef
  } = props

  if (comparisonType === ComparisonType.relative) {
    rating = squeezePercents(rating, 'rate')
  } else {
    rating = squeezePercents(rating, 'rate', BEST_RATIO * 100, NOT_RECOMMEND_RATIO * 100)
  }

  for (const n of rating) {
    n.ratingToUse = ratingType === RatingType.geek
      ? (games[n.bggId].avgScore ?? 0)
      : (games[n.bggId].score ?? 0)

    n.reviewScore = n.ratingToUse * 10
  }

  if (comparisonType === ComparisonType.relative) {
    rating = squeezePercents(rating, 'reviewScore')
  }

  for (const n of rating) {
    // n.totalRate = n.reviewScore * (n.rate * BEST_RATIO / 100)
    n.totalRate = n.rate + n.reviewScore
  }

  if (comparisonType === ComparisonType.relative) {
    rating = squeezePercents(rating, 'totalRate')
  } else {
    // rating = squeezePercents(rating, 'totalRate', BEST_RATIO * 100, 0)
    rating = squeezePercents(rating, 'totalRate', 200, 0)
  }

  rating = rating
    .filter(n => n.totalRate > 49 && n.rate > 49)
    .sort((b, a) => a.totalRate - b.totalRate)

  return (
    <section className='games'>
      <ViewportList viewportRef={containerRef} items={rating}>
        {
          (game) => {
            return (<GamesRating key={game.bggId} rating={game} meta={games[game.bggId]} />)
          }
        }
      </ViewportList>
    </section>
  )
}

function GamesRating (props: { meta: FilledGame, rating: ExtendedRate }): JSX.Element {
  const { meta, rating } = props

  return (
    <div className='game-container'>
      <img
        src={meta.image ?? meta.imageSmall}
        alt={meta.name}
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
            Rating:{' '}
          </span>
          <span>
            {rating.ratingToUse?.toFixed(1) ?? '—'}
          </span>
        </div>
        <div className='game-description-row'>
          <span>
            Rating by players number:{' '}
          </span>
          <span>
            {(rating.rate / 10).toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  )
}

export async function getServerSideProps (context: NextPageContext): Promise<Record<string, any>> {
  const telegram = context.query.telegram !== undefined

  return {
    props: { telegram }
  }
}
