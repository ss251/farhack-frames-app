import { getFrameMetadata } from 'frog/next'
import type { Metadata } from 'next'
import styles from './page.module.css'

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
      <p>This is a web application for exploring Farcaster statistics.</p>
      <p>To interact with the Frame, visit this page on a Farcaster client.</p>
    </main>
  )
}