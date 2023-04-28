import 'src/styles/globals.css'
import type { AppProps } from 'next/app'
import FontWrapper from 'src/components/FontWrapper.tsx'
import { Analytics } from '@vercel/analytics/react'

export default function App ({ Component, pageProps }: AppProps): JSX.Element {
  return (
    <>
      <FontWrapper>
        <Component {...pageProps} />

      </FontWrapper>
      <Analytics />
    </>
  )
}
