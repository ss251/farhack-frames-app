/** @jsxImportSource frog/jsx */

import { Button, Frog, TextInput } from 'frog'
import { handle } from 'frog/next'
import { neynar } from 'frog/hubs'
import { Lum0x } from 'lum0x-sdk'
import { devtools } from 'frog/dev'
import { serveStatic } from 'frog/serve-static'
import { NextRequest } from 'next/server'

Lum0x.init(process.env.LUM0X_API_KEY as string)

const app = new Frog({
  assetsPath: '/',
  basePath: '/api',
  browserLocation: '/:path',
  hub: neynar({ apiKey: process.env.NEYNAR_API_KEY as string }),
  title: 'Farcaster Analytics Hub',
})

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

app.frame('/', (c) => {
  const { buttonValue, inputText } = c
  console.log('Main frame:', { buttonValue, inputText })

  return c.res({
    image: (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#1E1E1E', color: 'white', fontFamily: 'Arial, sans-serif' }}>
        <h1 style={{ fontSize: '32px', marginBottom: '20px', textAlign: 'center' }}>Farcaster Analytics Hub</h1>
        <p style={{ fontSize: '18px', textAlign: 'center' }}>Enter a Farcaster ID to explore detailed analytics</p>
      </div>
    ),
    intents: [
      <TextInput placeholder="Enter Farcaster ID" />,
      <Button action="/user_info">User Info</Button>,
      <Button action="/cast_analytics">Cast Analytics</Button>,
      // <Button action="/engagement_stats">Engagement Stats</Button>,
    ],
  })
})

app.frame('/user_info', async (c) => {
  const fid = c.inputText
  console.log('User Info frame:', { fid })

  if (!fid) {
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#1E1E1E', color: 'white', fontFamily: 'Arial, sans-serif' }}>
          <h1 style={{ fontSize: '24px', marginBottom: '20px', textAlign: 'center' }}>Error: No FID provided</h1>
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
          <h1 style={{ fontSize: '24px', marginBottom: '20px', textAlign: 'center' }}>User Info: {user.display_name}</h1>
          <p style={{ fontSize: '18px' }}>Username: @{user.username}</p>
          <p style={{ fontSize: '18px' }}>Followers: {user.follower_count}</p>
          <p style={{ fontSize: '18px' }}>Following: {user.following_count}</p>
        </div>
      ),
      intents: [
        <Button action="/">Back to Main</Button>,
        <Button action={`/cast_analytics?fid=${fid}`}>View Cast Analytics</Button>,
      ],
    })
  } catch (error) {
    console.error('Error fetching user data:', error)
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#1E1E1E', color: 'white', fontFamily: 'Arial, sans-serif' }}>
          <h1 style={{ fontSize: '24px', marginBottom: '20px', textAlign: 'center' }}>Error fetching user data</h1>
          <p style={{ fontSize: '18px', color: 'red' }}>{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      ),
      intents: [<Button action="/">Back to Main</Button>],
    })
  }
})

app.frame('/cast_analytics', async (c) => {
  const fid = c.inputText
  console.log('Cast Analytics frame:', { fid })

  if (!fid) {
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#1E1E1E', color: 'white', fontFamily: 'Arial, sans-serif' }}>
          <h1 style={{ fontSize: '24px', marginBottom: '20px', textAlign: 'center' }}>Error: No FID provided</h1>
        </div>
      ),
      intents: [<Button action="/">Back to Main</Button>],
    })
  }

  try {
    // Get user profile
    const userRes = await Lum0x.farcasterUser.getUserByFids({ fids: fid })
    console.log('User Info API response:', JSON.stringify(userRes, null, 2))
    const user = userRes.users[0]

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
      ? ((totalLikes + totalRecasts + totalReplies) / (totalCasts * user.follower_count) * 100).toFixed(2)
      : '0.00'

    // Get follower count
    const followerCount = user.follower_count

    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#1E1E1E', color: 'white', fontFamily: 'Arial, sans-serif' }}>
          <h1 style={{ fontSize: '24px', marginBottom: '20px', textAlign: 'center' }}>Cast Analytics for @{user.username}</h1>
          <p style={{ fontSize: '18px' }}>Followers: {followerCount}</p>
          <p style={{ fontSize: '18px' }}>Total Casts (30 days): {totalCasts}</p>
          <p style={{ fontSize: '18px' }}>Total Likes: {totalLikes}</p>
          <p style={{ fontSize: '18px' }}>Total Recasts: {totalRecasts}</p>
          <p style={{ fontSize: '18px' }}>Total Replies: {totalReplies}</p>
          <p style={{ fontSize: '18px' }}>Engagement Rate: {engagementRate}%</p>
        </div>
      ),
      intents: [
        <Button action="/">Back to Main</Button>,
        <Button action={`/user_info?fid=${fid}`}>View User Info</Button>,
      ],
    })
  } catch (error) {
    console.error('Error fetching cast data:', error)
    return c.res({
      image: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#1E1E1E', color: 'white', fontFamily: 'Arial, sans-serif' }}>
          <h1 style={{ fontSize: '24px', marginBottom: '20px', textAlign: 'center' }}>Error fetching cast data</h1>
          <p style={{ fontSize: '18px', color: 'red' }}>{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      ),
      intents: [<Button action="/">Back to Main</Button>],
    })
  }
})

// app.frame('/engagement_stats', async (c) => {
//   const fid = c.inputText
//   console.log('Engagement Stats frame:', { fid })

//   if (!fid) {
//     return c.res({
//       image: (
//         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#1E1E1E', color: 'white', fontFamily: 'Arial, sans-serif' }}>
//           <h1 style={{ fontSize: '24px', marginBottom: '20px', textAlign: 'center' }}>Error: No FID provided</h1>
//         </div>
//       ),
//       intents: [<Button action="/">Back to Main</Button>],
//     })
//   }

//   try {
//     const res = await Lum0x.farcasterCast.getCastsByFid({ fid: Number(fid), limit: 50 })
//     console.log('Casts API response for engagement stats:', JSON.stringify(res, null, 2))
//     const casts = res.result.casts as Cast[]

//     const engagementByHour = Array(24).fill(0)
//     casts.forEach((cast: Cast) => {
//       const hour = new Date(cast.timestamp).getHours()
//       engagementByHour[hour] += cast.reactions.count + cast.recasts.count
//     })

//     const maxEngagement = Math.max(...engagementByHour)

//     return c.res({
//       image: (
//         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#1E1E1E', color: 'white', fontFamily: 'Arial, sans-serif' }}>
//           <h1 style={{ fontSize: '24px', marginBottom: '20px', textAlign: 'center' }}>Engagement Stats for FID: {fid}</h1>
//           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '300px', width: '100%' }}>
//             {engagementByHour.map((engagement, hour) => (
//               <div key={hour} style={{ width: '4%', height: `${(engagement / maxEngagement) * 100}%`, backgroundColor: 'purple', position: 'relative' }}>
//                 <span style={{ position: 'absolute', top: '-20px', left: '50%', transform: 'translateX(-50%)', fontSize: '12px' }}>{hour}:00</span>
//               </div>
//             ))}
//           </div>
//         </div>
//       ),
//       intents: [
//         <Button action="/">Back to Main</Button>,
//         <Button action={`/user_info?fid=${fid}`}>View User Info</Button>,
//       ],
//     })
//   } catch (error) {
//     console.error('Error fetching engagement data:', error)
//     return c.res({
//       image: (
//         <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#1E1E1E', color: 'white', fontFamily: 'Arial, sans-serif' }}>
//           <h1 style={{ fontSize: '24px', marginBottom: '20px', textAlign: 'center' }}>Error fetching engagement data</h1>
//           <p style={{ fontSize: '18px', color: 'red' }}>{error instanceof Error ? error.message : 'Unknown error'}</p>
//         </div>
//       ),
//       intents: [<Button action="/">Back to Main</Button>],
//     })
//   }
// })

if (process.env.NODE_ENV === 'development') {
  devtools(app, { serveStatic })
}

export const GET = (req: NextRequest, ctx: any) => handle(app)(req, ctx)
export const POST = (req: NextRequest, ctx: any) => handle(app)(req, ctx)