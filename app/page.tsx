import { getFrameMetadata } from 'frog/next'
import type { Metadata } from 'next'
import styles from './page.module.css'
import Link from 'next/link'

export async function generateMetadata(): Promise<Metadata> {
  const url = process.env.VERCEL_URL || 'http://localhost:3000'
  const frameMetadata = await getFrameMetadata(`${url}/api`)
  return {
    title: 'Stat Frame',
    description: 'Explore detailed statistics for Farcaster users',
    other: frameMetadata,
  }
}

export default function Home() {
  return (
    <main className={styles.main}>
      <h1>Welcome to Stat Frame</h1>
      <p>This is a Frame server for exploring Farcaster user statistics within frames.</p>
      <p>To interact with the Frame, check it out on <Link  target="_blank" className='text-purple-500 underline' href="https://warpcast.com/thescoho/0xf1d1006d">Warpcast</Link></p>
    </main>
  )
}