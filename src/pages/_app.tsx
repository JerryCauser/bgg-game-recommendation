import 'src/styles/globals.css'
import type { AppProps } from 'next/app'
import FontWrapper from 'src/components/FontWrapper.tsx'

export default function App ({ Component, pageProps }: AppProps): JSX.Element {
  return (
    <FontWrapper>
      <Component {...pageProps} />
    </FontWrapper>
  )
}
