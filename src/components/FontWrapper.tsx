import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export default function FontWrapper (props: { children: JSX.Element }): JSX.Element {
  return (
    <div className={inter.className}>
      {props.children}
    </div>
  )
}
