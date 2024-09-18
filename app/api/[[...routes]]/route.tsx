/** @jsxImportSource frog/jsx */

import { Button, Frog, TextInput } from 'frog'
import { handle } from 'frog/next'
import { neynar } from 'frog/hubs'
import { Lum0x } from 'lum0x-sdk'
import { devtools } from 'frog/dev'
import { serveStatic } from 'frog/serve-static'

Lum0x.init(process.env.LUM0X_API_KEY as string)

// Define interfaces for the API responses
interface User {
  fid: number;
  username: string;
  display_name: string;
  pfp: {
    url: string;
  };
  profile: {
    bio: {
      text: string;
      mentionedProfiles: any[];
    };
  };
  follower_count: number;
  following_count: number;
  verifications: string[];
  activeStatus: string;
}

interface Cast {
  hash: string;
  parentHash: string | null;
  parentUrl: string | null;
  rootParentUrl: string | null;
  threadHash: string;
  author: {
    fid: number;
    username: string;
    displayName: string;
    pfp: {
      url: string;
    };
  };
  text: string;
  timestamp: string;
  embeds: any[];
  reactions: {
    count: number;
    fids: number[];
    fnames: string[];
  };
  recasts: {
    count: number;
    fids: number[];
  };
  recasters: string[];
  replies: {
    count: number;
  };
  mentionedProfiles: any[];
  channel?: {
    object: string;
    id: string;
    name: string;
    image_url: string;
  };
}

type State = {
  fid: string
}

const app = new Frog<{ State: State }>({
  assetsPath: '/',
  basePath: '/api',
  browserLocation: '/:path',
  hub: neynar({ apiKey: process.env.NEYNAR_API_KEY as string }),
  initialState: {
    fid: '',
  },
  title: 'Farcaster Analytics Hub',
})

app.frame('/', (c) => {
  const { buttonValue, inputText } = c
  console.log('Main frame:', { buttonValue, inputText })

  return c.res({
    image: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#1E1E1E', color: 'white', fontFamily: 'Arial, sans-serif' }}>
        <h1 style={{ fontSize: '48px', marginBottom: '20px', textAlign: 'center' }}>Farcaster Analytics Hub</h1>
        <p style={{ fontSize: '36px', textAlign: 'center' }}>Enter a Farcaster ID to explore detailed analytics</p>
      </div>
    ),
    intents: [
      <TextInput placeholder="Enter Farcaster ID" />,
      <Button action="/user_info">User Info</Button>,
      <Button action="/cast_analytics">Cast Analytics</Button>,
    ],
  })
})

app.frame('/user_info', async (c) => {
  const { deriveState } = c
  const state = deriveState((previousState) => {
    if (c.inputText) {
      previousState.fid = c.inputText
    }
  })
  const fid = state.fid
  console.log('User Info frame:', { fid })

  if (!fid) {
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#1E1E1E', color: 'white', fontFamily: 'Arial, sans-serif' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px', textAlign: 'center' }}>Error: No FID provided</h1>
        </div>
      ),
      intents: [<Button action="/">Back to Main</Button>],
    })
  }

  try {
    const res = await Lum0x.farcasterUser.getUserByFids({ fids: fid })
    console.log('User Info API response:', JSON.stringify(res, null, 2))
    const user = res.users[0] as User | undefined

    if (!user) {
      throw new Error('User not found')
    }

    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#1E1E1E', color: 'white', fontFamily: 'Arial, sans-serif' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px', textAlign: 'center' }}>User Info: {user.display_name}</h1>
          <p style={{ fontSize: '36px' }}>Username: @{user.username}</p>
          <p style={{ fontSize: '36px' }}>Followers: {user.follower_count}</p>
          <p style={{ fontSize: '36px' }}>Following: {user.following_count}</p>
        </div>
      ),
      intents: [
        <Button action="/">Back to Main</Button>,
        <Button action="/cast_analytics">View Cast Analytics</Button>,
      ],
    })
  } catch (error) {
    console.error('Error fetching user data:', error)
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#1E1E1E', color: 'white', fontFamily: 'Arial, sans-serif' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px', textAlign: 'center' }}>Error fetching user data</h1>
          <p style={{ fontSize: '36px', color: 'red' }}>{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      ),
      intents: [<Button action="/">Back to Main</Button>],
    })
  }
})

app.frame('/cast_analytics', async (c) => {
  const { deriveState } = c
  const state = deriveState((previousState) => {
    if (c.inputText) {
      previousState.fid = c.inputText
    }
  })
  const fid = state.fid
  console.log('Cast Analytics frame:', { fid })

  if (!fid) {
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#1E1E1E', color: 'white', fontFamily: 'Arial, sans-serif' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px', textAlign: 'center' }}>Error: No FID provided</h1>
        </div>
      ),
      intents: [<Button action="/">Back to Main</Button>],
    })
  }

  try {
    // Get user profile
    const userRes = await Lum0x.farcasterUser.getUserByFids({ fids: fid })
    console.log('User Info API response:', JSON.stringify(userRes, null, 2))
    const user = userRes.users[0] as User | undefined

    if (!user) {
      throw new Error('User not found')
    }

    // Get casts for the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const castsRes = await Lum0x.farcasterCast.getCastsByFid({ fid: Number(fid), limit: 100 })
    console.log('Casts response:', JSON.stringify(castsRes, null, 2))

    if (!castsRes.result || !Array.isArray(castsRes.result.casts)) {
      throw new Error('Invalid casts data received')
    }

    const casts = castsRes.result.casts.filter((cast: Cast) => new Date(cast.timestamp) >= thirtyDaysAgo)

    // Calculate analytics
    const totalCasts = casts.length
    const totalLikes = casts.reduce((sum: number, cast: Cast) => sum + cast.reactions.count, 0)
    const totalRecasts = casts.reduce((sum: number, cast: Cast) => sum + cast.recasts.count, 0)
    const totalReplies = casts.reduce((sum: number, cast: Cast) => sum + cast.replies.count, 0)

    const engagementRate = totalCasts > 0 && user.follower_count > 0
      ? ((totalLikes + totalRecasts + totalReplies) / (totalCasts * user.follower_count) * 100).toFixed(3)
      : '0.00'

    // Get follower count
    const followerCount = user.follower_count

    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#1E1E1E', color: 'white', fontFamily: 'Arial, sans-serif' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px', textAlign: 'center' }}>Cast Analytics for @{user.username}</h1>
          <p style={{ fontSize: '36px' }}>Followers: {followerCount}</p>
          <p style={{ fontSize: '36px' }}>Total Casts (30 days): {totalCasts}</p>
          <p style={{ fontSize: '36px' }}>Total Likes: {totalLikes}</p>
          <p style={{ fontSize: '36px' }}>Total Recasts: {totalRecasts}</p>
          <p style={{ fontSize: '36px' }}>Total Replies: {totalReplies}</p>
          <p style={{ fontSize: '36px' }}>Engagement Rate: {engagementRate}%</p>
        </div>
      ),
      intents: [
        <Button action="/">Back to Main</Button>,
        <Button action="/user_info">View User Info</Button>,
      ],
    })
  } catch (error) {
    console.error('Error fetching cast data:', error)
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#1E1E1E', color: 'white', fontFamily: 'Arial, sans-serif' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '20px', textAlign: 'center' }}>Error fetching cast data</h1>
          <p style={{ fontSize: '36px', color: 'red' }}>{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      ),
      intents: [<Button action="/">Back to Main</Button>],
    })
  }
})

if (process.env.NODE_ENV === 'development') {
  devtools(app, { serveStatic })
}

export const GET = handle(app)
export const POST = handle(app)