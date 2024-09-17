import { getFrameMetadata } from 'frog/next'
import type { Metadata } from 'next'
import styles from './page.module.css'

export async function generateMetadata(): Promise<Metadata> {
  const url = process.env.VERCEL_URL || 'http://localhost:3000'
  const frameMetadata = await getFrameMetadata(`${url}/api`)
  return {
    title: 'Farcaster Analytics Hub',
    description: 'Explore detailed analytics for Farcaster users',
    other: frameMetadata,
  }
}

export default function Home() {
  return (
    <main className={styles.main}>
      <h1>Welcome to Farcaster Analytics Hub</h1>
      <p>This is a web application for exploring Farcaster analytics.</p>
      <p>To interact with the Frame, visit this page on a Farcaster client.</p>
    </main>
  )
}