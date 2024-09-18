/** @jsxImportSource frog/jsx */

import { Button, Frog, TextInput } from 'frog';
import { handle } from 'frog/next';
import { neynar } from 'frog/hubs';
import { Lum0x } from 'lum0x-sdk';
import { devtools } from 'frog/dev';
import { serveStatic } from 'frog/serve-static';
import { createSystem } from 'frog/ui';

Lum0x.init(process.env.LUM0X_API_KEY as string);

// Define interfaces for the API responses
interface User {
  fid: number;
  username: string;
  display_name: string;
  pfp_url: string;
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
  fid: string;
};

const {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Icon,
  Image,
  Divider,
  vars,
} = createSystem();

const app = new Frog<{ State: State }>({
  assetsPath: '/',
  basePath: '/api',
  browserLocation: '/:path',
  hub: neynar({ apiKey: process.env.NEYNAR_API_KEY as string }),
  initialState: {
    fid: '',
  },
  ui: { vars },
  title: 'Farcaster Analytics Hub',
});

app.frame('/', (c) => {
  const { buttonValue, inputText } = c;
  console.log('Main frame:', { buttonValue, inputText });

  return c.res({
    image: (
      <Box
        grow
        alignHorizontal="center"
        alignVertical="center"
        backgroundColor="background"
        padding="32"
      >
        <VStack gap="16" alignHorizontal="center">
          <Heading size="48">
            <Icon name="bar-chart" size="48" color="teal500" />{' '}
            Farcaster Analytics Hub
          </Heading>
          <Text color="text200" size="24">
            Enter a Farcaster ID to explore detailed analytics
          </Text>
        </VStack>
      </Box>
    ),
    intents: [
      <TextInput placeholder="Enter Farcaster ID" />,
      <Button action="/user_info">User Info</Button>,
      <Button action="/cast_analytics">Cast Analytics</Button>,
    ],
  });
});

app.frame('/user_info', async (c) => {
  const { deriveState } = c;
  const state = deriveState((previousState) => {
    if (c.inputText) {
      previousState.fid = c.inputText;
    }
  });
  const fid = state.fid;
  console.log('User Info frame:', { fid });

  if (!fid) {
    return c.res({
      image: (
        <Box grow alignHorizontal="center" backgroundColor="background" padding="32">
          <VStack gap="16">
            <Heading size="48" color="red500">Error: No FID provided</Heading>
          </VStack>
        </Box>
      ),
      intents: [<Button action="/">Back to Main</Button>],
    });
  }

  try {
    const res = await Lum0x.farcasterUser.getUserByFids({ fids: fid });
    console.log('User Info API response:', JSON.stringify(res, null, 2));
    const user = res.users[0] as User | undefined;

    if (!user) {
      throw new Error('User not found');
    }

    return c.res({
      image: (
        <Box
          grow
          alignHorizontal="center"
          alignVertical="center"
          backgroundColor="background"
          padding="32"
        >
          <VStack gap="16" alignHorizontal="center">
            <Image
              src={user.pfp_url}
              width="96"
              height="96"
              borderRadius="48"
            />
            <Heading size="32">{user.display_name}</Heading>
            <Text size="24" color="text200">
              @{user.username}
            </Text>
            <HStack gap="32" alignHorizontal="center">
              <Box alignItems="center">
                <Icon name="user" size="24" color="teal500" />
                <Text size="24">{user.follower_count}</Text>
                <Text size="20" color="text200">Followers</Text>
              </Box>
              <Box alignItems="center">
                <Icon name="user-check" size="24" color="teal500" />
                <Text size="24">{user.following_count}</Text>
                <Text size="20" color="text200">Following</Text>
              </Box>
            </HStack>
          </VStack>
        </Box>
      ),
      intents: [
        <Button action="/">Back to Main</Button>,
        <Button action="/cast_analytics">View Cast Analytics</Button>,
      ],
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    return c.res({
      image: (
        <Box grow alignHorizontal="center" backgroundColor="background" padding="32">
          <VStack gap="16">
            <Heading size="32" color="red500">Error fetching user data</Heading>
            <Text size="24" color="red">{error instanceof Error ? error.message : 'Unknown error'}</Text>
          </VStack>
        </Box>
      ),
      intents: [<Button action="/">Back to Main</Button>],
    });
  }
});

app.frame('/cast_analytics', async (c) => {
  const { deriveState } = c;
  const state = deriveState((previousState) => {
    if (c.inputText) {
      previousState.fid = c.inputText;
    }
  });
  const fid = state.fid;
  console.log('Cast Analytics frame:', { fid });

  if (!fid) {
    return c.res({
      image: '/cast_analytics/analytics_image', // Updated URL
      intents: [<Button action="/">Back to Main</Button>],
    });
  }

  // Store the fid in the state for the image handler to access
  return c.res({
    image: '/cast_analytics/analytics_image', // Updated URL
    intents: [
      <Button action="/">Back to Main</Button>,
      <Button action="/user_info">View User Info</Button>,
    ],
  });
});

app.image('/cast_analytics/analytics_image', async (c) => {
  // Updated handler path
  const state = c.previousState as State;
  const fid = state?.fid;
  console.log('Image Handler - Cast Analytics:', { fid });

  if (!fid) {
    return c.res({
      image: (
        <Box
          grow
          alignHorizontal="center"
          backgroundColor="background"
          padding="32"
        >
          <VStack gap="16">
            <Heading size="48" color="red500">
              Error: No FID provided
            </Heading>
          </VStack>
        </Box>
      ),
    });
  }

  try {
    // Get user profile
    const userRes = await Lum0x.farcasterUser.getUserByFids({ fids: fid });
    const user = userRes.users[0] as User | undefined;

    if (!user) {
      throw new Error('User not found');
    }

    // Get casts for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const castsRes = await Lum0x.farcasterCast.getCastsByFid({
      fid: Number(fid),
      limit: 100,
    });

    if (!castsRes.result || !Array.isArray(castsRes.result.casts)) {
      throw new Error('Invalid casts data received');
    }

    const casts = castsRes.result.casts.filter(
      (cast: Cast) => new Date(cast.timestamp) >= thirtyDaysAgo
    );

    // Calculate analytics
    const totalCasts = casts.length;
    const totalLikes = casts.reduce(
      (sum: number, cast: Cast) => sum + (cast.reactions?.count || 0),
      0
    );
    const totalRecasts = casts.reduce(
      (sum: number, cast: Cast) => sum + (cast.recasts?.count || 0),
      0
    );
    const totalReplies = casts.reduce(
      (sum: number, cast: Cast) => sum + (cast.replies?.count || 0),
      0
    );

    const engagementRate =
      totalCasts > 0 && user.follower_count > 0
        ? (
            ((totalLikes + totalRecasts + totalReplies) /
              (totalCasts * user.follower_count)) *
            100
          ).toFixed(2)
        : '0.00';

    // Return the image component with enhanced aesthetics
    return c.res({
      image: (
        <Box
          grow
          alignHorizontal="center"
          alignVertical="center"
          backgroundColor="background"
          padding="32"
        >
          <VStack gap="16" alignHorizontal="center">
            <Heading size="32">
              Cast Analytics for @{user.username}
            </Heading>
            <Divider />
            <HStack gap="32" alignHorizontal="center">
              <Box alignItems="center">
                <Icon name="pencil" size="24" color="teal500" />
                <Text size="24">{totalCasts}</Text>
                <Text size="20" color="text200">Casts</Text>
              </Box>
              <Box alignItems="center">
                <Icon name="heart" size="24" color="red500" />
                <Text size="24">{totalLikes}</Text>
                <Text size="20" color="text200">Likes</Text>
              </Box>
              <Box alignItems="center">
                <Icon name="refresh-cw" size="24" color="teal500" />
                <Text size="24">{totalRecasts}</Text>
                <Text size="20" color="text200">Recasts</Text>
              </Box>
              <Box alignItems="center">
                <Icon name="message-square" size="24" color="teal500" />
                <Text size="24">{totalReplies}</Text>
                <Text size="20" color="text200">Replies</Text>
              </Box>
            </HStack>
            <Divider />
            <Text size="24" color="text200">
              Engagement Rate: {engagementRate}%
            </Text>
          </VStack>
        </Box>
      ),
      headers: {
        'Cache-Control': 'max-age=0', // Optional: Prevent caching
      },
    });
  } catch (error) {
    console.error('Error in Image Handler:', error);
    return c.res({
      image: (
        <Box
          grow
          alignHorizontal="center"
          backgroundColor="background"
          padding="32"
        >
          <VStack gap="16">
            <Heading size="32" color="red500">
              Error fetching cast data
            </Heading>
            <Text size="24" color="red">
              {error instanceof Error ? error.message : 'Unknown error'}
            </Text>
          </VStack>
        </Box>
      ),
    });
  }
});

if (process.env.NODE_ENV === 'development') {
  devtools(app, { serveStatic });
}

export const GET = handle(app);
export const POST = handle(app);