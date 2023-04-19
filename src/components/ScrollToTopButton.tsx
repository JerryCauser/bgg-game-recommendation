import type { MutableRefObject } from 'react'

export default function ScrollToTopButton (props: { overflowRef: MutableRefObject<HTMLElement | null> }): JSX.Element | null {
  if (props.overflowRef.current === null) return null

  return (
    <button
      className='scroll-to-top-button'
      onClick={() => props.overflowRef.current?.scrollTo(0, 0)}
    >
      ⬆
    </button>
  )
}
