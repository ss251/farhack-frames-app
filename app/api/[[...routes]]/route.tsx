/** @jsxImportSource frog/jsx */

import { Button, Frog, TextInput } from 'frog';
import { handle } from 'frog/next';
import { neynar } from 'frog/hubs';
import { Lum0x } from 'lum0x-sdk';
import { devtools } from 'frog/dev';
import { serveStatic } from 'frog/serve-static';
import { createSystem } from 'frog/ui';
import { format } from 'date-fns';

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

// Update the State type
type State = {
  fid?: string;
  username?: string; // Add username to the state
  input?: string; // Store the user input
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
  initialState: {},
  ui: { vars },
  title: 'Stat Frame',
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
          <HStack gap="8" alignHorizontal="center">
          <Icon name="bar-chart-2" size="32" color="teal700" />
          <Heading size="32">
             Stat Frame
          </Heading>
          <Text color="text200" size="16" align="center">
            Enter a Farcaster ID or Username to explore detailed stats
          </Text>
          </HStack>
          
        </VStack>
      </Box>
    ),
    intents: [
      <TextInput placeholder="Enter Farcaster ID or Username" />,
      <Button action="/user_info">User Info</Button>,
      <Button action="/cast_stats">Cast Stats</Button>,
      <Button action="/moxie_stat">Moxie Stats</Button>,
    ],
  });
});

app.frame('/user_info', (c) => {
  const { deriveState } = c;
  const state = deriveState((previousState) => {
    if (c.inputText) {
      previousState.input = c.inputText;
    }
  });
  const input = state.input;
  console.log('User Info frame:', { input });

  if (!input) {
    return c.res({
      image: '/user_info/user_image',
      intents: [<Button action="/">Back to Main</Button>],
    });
  }

  return c.res({
    image: '/user_info/user_image',
    intents: [
      <Button action="/">Back to Main</Button>,
      <Button action="/cast_stats">Cast Stats</Button>,
      <Button action="/moxie_stat">Moxie Stats</Button>,
    ],
  });
});

app.image('/user_info/user_image', async (c) => {
  const state = c.previousState as State;
  const input = state?.input;
  console.log('Image Handler - User Info:', { input });

  if (!input) {
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
              Error: No input provided
            </Heading>
          </VStack>
        </Box>
      ),
    });
  }

  try {
    // Fetch user profile and store fid and username
    const user = await fetchUserProfile(input, state);
    console.log('User in Image Handler:', user);

    // Fetch Nanograph user metrics
    const nanographMetrics = await fetchNanographMetrics(state.username!);

    // Find the top channel contribution (handle empty array)
    let topChannel = null;
    if (nanographMetrics && nanographMetrics.length > 0) {
      topChannel = nanographMetrics.reduce((prev: any, current: any) =>
        Number(prev.contribution) > Number(current.contribution) ? prev : current
      );
    }

    console.log('Top Channel:', topChannel);
    console.log('Type of contribution:', typeof topChannel?.contribution);

    // Render the user info image with top channel stats displayed side by side
    return c.res({
      image: (
        <Box
          grow
          alignHorizontal="center"
          alignVertical="center"
          backgroundColor="background"
          padding="24"
        >
          <VStack gap="16" alignHorizontal="center">
            <Image
              src={user.pfp_url}
              width="96"
              height="96"
              borderRadius="48"
            />
            <Heading size="24">{user.display_name}</Heading>
            <Text size="20" color="text200">
              @{user.username}
            </Text>

            <HStack gap="24" alignHorizontal="center">
              <Box alignItems="center">
                <Icon name="users" size="24" color="teal500" />
                <Text size="16">{user.follower_count}</Text>
                <Text size="12" color="text200">Followers</Text>
              </Box>
              <Box alignItems="center">
                <Icon name="user-plus" size="24" color="teal500" />
                <Text size="16">{user.following_count}</Text>
                <Text size="12" color="text200">Following</Text>
              </Box>
              {topChannel ? (
                <>
                  <Box alignItems="center">
                    <Icon name="hash" size="24" color="amber500" />
                    <Text size="16">{topChannel.channelID}</Text>
                    <Text size="12" color="text200">Top Channel</Text>
                  </Box>
                  <Box alignItems="center">
                    <Icon name="activity" size="24" color="amber500" />
                    <Text size="16">
                      {Number(topChannel.contribution).toLocaleString()}
                    </Text>
                    <Text size="12" color="text200">Contribution</Text>
                  </Box>
                </>
              ) : (
                <Box alignItems="center">
                  <Icon name="info" size="24" color="gray500" />
                  <Text size="16" color="text200">No Nanograph Data</Text>
                  <Text size="12" color="text200">Available</Text>
                </Box>
              )}
            </HStack>
          </VStack>
        </Box>
      ),
      headers: {
        'Cache-Control': 'public, max-age=20',
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
              Error fetching user data
            </Heading>
            <Text size="20" color="red">
              {error instanceof Error ? error.message : 'Unknown error'}
            </Text>
          </VStack>
        </Box>
      ),
    });
  }
});

// Similar changes should be made in other frames, such as '/cast_stats' and '/moxie_stat'

app.frame('/cast_stats', (c) => {
  const { deriveState } = c;
  const state = deriveState((previousState) => {
    if (c.inputText) {
      previousState.input = c.inputText;
    }
  });
  const input = state.input;
  console.log('Cast Stats frame:', { input });

  if (!input) {
    return c.res({
      image: '/cast_stats/cast_stats_image',
      intents: [<Button action="/">Back to Main</Button>],
    });
  }

  return c.res({
    image: '/cast_stats/cast_stats_image',
    intents: [
      <Button action="/">Back to Main</Button>,
      <Button action="/user_info">User Info</Button>,
      <Button action="/moxie_stat">Moxie Stats</Button>,
    ],
  });
});

app.image('/cast_stats/cast_stats_image', async (c) => {
  const state = c.previousState as State;
  const input = state?.input;
  console.log('Image Handler - Cast Stats:', { input });

  if (!input) {
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
              Error: No input provided
            </Heading>
          </VStack>
        </Box>
      ),
    });
  }

  try {
    // Fetch user profile and store fid and username
    const user = await fetchUserProfile(input, state);
    const fid = state.fid!;

    // Get casts for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Replace cached data retrieval with direct API calls
    const castsRes = await Lum0x.farcasterCast.getCastsByFid({
      fid: Number(fid),
      limit: 100,
    });

    if (!castsRes.result || !Array.isArray(castsRes.result.casts)) {
      throw new Error('Invalid casts data received');
    }

    const casts = castsRes.result.casts;
    const recentCasts = casts.filter(
      (cast: Cast) => new Date(cast.timestamp) >= thirtyDaysAgo
    );

    // Calculate stats with null checks
    const totalCasts = recentCasts.length;
    const totalLikes = recentCasts.reduce(
      (sum: number, cast: Cast) => sum + (cast.reactions?.count || 0),
      0
    );
    const totalRecasts = recentCasts.reduce(
      (sum: number, cast: Cast) => sum + (cast.recasts?.count || 0),
      0
    );
    const totalReplies = recentCasts.reduce(
      (sum: number, cast: Cast) => sum + (cast.replies?.count || 0),
      0
    );

    const totalInteractions = totalLikes + totalRecasts + totalReplies;

    const engagementRate =
      user.follower_count > 0
        ? ((totalInteractions / user.follower_count) * 100).toFixed(2)
        : '0.00';

    // Fetch Nanograph user metrics
    const nanographMetrics = await fetchNanographMetrics(state.username!);

    // Calculate total contribution from Nanograph metrics
    let totalContribution = 0;
    if (nanographMetrics && nanographMetrics.length > 0) {
      totalContribution = nanographMetrics.reduce(
        (sum: number, metric: any) => sum + (metric.contribution || 0),
        0
      );
    }

    // Render the combined analytics image with adjusted layout
    return c.res({
      image: (
        <Box
          grow
          alignHorizontal="center"
          alignVertical="center"
          backgroundColor="background"
          padding="16"
        >
          <VStack gap="16" alignHorizontal="center">
          <HStack gap="8" alignHorizontal="center">
            <Heading size="20">
              Cast Stats: 
            </Heading>
              <Image
                src={user.pfp_url}
                width="24"
                height="24"
                borderRadius="48"
                
              />
              <Heading size="20">
              @{user.username} ({user.display_name})
              </Heading>
            
            </HStack>
            <Divider color="gray700" />

            {/* Add HStack for profile image and name */}
            

            {/* Existing stats displayed in HStack */}
            <HStack gap="24" alignHorizontal="center">
              <Box alignItems="center">
                <Icon name="users" size="24" color="purple500" />
                <Text size="20">{user.follower_count}</Text>
                <Text size="16" color="text200">Followers</Text>
              </Box>
              <Box alignItems="center">
                <Icon name="pencil" size="24" color="teal500" />
                <Text size="20">{totalCasts}</Text>
                <Text size="16" color="text200">Casts</Text>
              </Box>
              <Box alignItems="center">
                <Icon name="heart" size="24" color="red500" />
                <Text size="20">{totalLikes}</Text>
                <Text size="16" color="text200">Reactions</Text>
              </Box>
              <Box alignItems="center">
                <Icon name="refresh-cw" size="24" color="teal500" />
                <Text size="20">{totalRecasts}</Text>
                <Text size="16" color="text200">Recasts</Text>
              </Box>
              <Box alignItems="center">
                <Icon name="message-square" size="24" color="blue600" />
                <Text size="20">{totalReplies}</Text>
                <Text size="16" color="text200">Replies</Text>
              </Box>
            </HStack>

            <Divider color="gray700" />

            {/* Display Engagement Rate and Total Contribution in the same line */}
            <HStack gap="24" alignHorizontal="center">
              <Box alignItems="center">
                <Icon name="activity" size="24" color="amber500" />
                <Text size="20">{engagementRate}%</Text>
                <Text size="16" color="text200">Engagement Rate</Text>
              </Box>
              {totalContribution > 0 ? (
                <Box alignItems="center">
                  <Icon name="activity" size="24" color="amber500" />
                  <Text size="20">
                    {Number(totalContribution).toLocaleString()}
                  </Text>
                  <Text size="16" color="text200">Total Contribution</Text>
                </Box>
              ) : (
                <Box alignItems="center">
                  <Icon name="info" size="24" color="gray500" />
                  <Text size="16" color="text200">No Nanograph Data</Text>
                </Box>
              )}
            </HStack>

          </VStack>
        </Box>
      ),
      headers: {
        'Cache-Control': 'public, max-age=20',
      },
    });
  } catch (error) {
    console.error('Error fetching cast data:', error);
    return c.res({
      image: (
        <Box grow alignHorizontal="center" backgroundColor="background" padding="32">
          <VStack gap="16">
            <Heading size="32" color="red500">Error fetching cast data</Heading>
            <Text size="20" color="red">{error instanceof Error ? error.message : 'Unknown error'}</Text>
          </VStack>
        </Box>
      ),
    });
  }
});

app.frame('/moxie_stat', (c) => {
  const { deriveState } = c;
  const state = deriveState((previousState) => {
    if (c.inputText) {
      previousState.input = c.inputText;
    }
  });
  const input = state.input;
  console.log('Moxie Stat frame:', { input });

  if (!input) {
    return c.res({
      image: '/moxie_stat/moxie_image',
      intents: [<Button action="/">Back to Main</Button>],
    });
  }

  return c.res({
    image: '/moxie_stat/moxie_image',
    intents: [
      <Button action="/">Back to Main</Button>,
      <Button action="/user_info">User Info</Button>,
      <Button action="/cast_stats">Cast Stats</Button>,
    ],
  });
});

app.image('/moxie_stat/moxie_image', async (c) => {
  const state = c.previousState as State;
  const input = state?.input;
  console.log('Image Handler - Moxie Stat:', { input });

  if (!input) {
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
              Error: No input provided
            </Heading>
          </VStack>
        </Box>
      ),
    });
  }

  try {
    // Fetch user profile and store fid and username
    const user = await fetchUserProfile(input, state);
    const fid = state.fid!;

    // Fetch Moxie earning stats
    const res = await Lum0x.farcasterMoxie.getEarningStat({
      entity_type: 'USER',
      entity_id: fid,
      timeframe: 'LIFETIME',
    });

    const moxieStatArray =
      res.data?.FarcasterMoxieEarningStats?.FarcasterMoxieEarningStat;

    if (
      !moxieStatArray ||
      !Array.isArray(moxieStatArray) ||
      moxieStatArray.length === 0
    ) {
      throw new Error('Moxie stats not found');
    }

    const moxieStat = moxieStatArray[0];

    // Updated image component with icons and improved styling
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
            <HStack gap="8" alignHorizontal="center">
              <Heading size="20">
                Moxie Stats: 
              </Heading>
              <Image
                src={user.pfp_url}
                width="24"
                height="24"
                borderRadius="48"
                
              />
              <Heading size="20">
              @{user.username} ({user.display_name})
              </Heading>
            </HStack>
            <Divider color="gray700" />

            <HStack gap="32" alignHorizontal="left">
              <Box alignItems="center">
                <Icon name="coins" size="24" color="green500" />
                <Text size="20">
                  {moxieStat.allEarningsAmount.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </Text>
                <Text size="16" color="text200">Total Earned</Text>
              </Box>
              <Box alignItems="center">
                <Icon name="image" size="24" color="blue500" />
                <Text size="20">
                  {moxieStat.castEarningsAmount.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </Text>
                <Text size="16" color="text200">Cast Earnings</Text>
              </Box>
            </HStack>
            <HStack gap="32" alignHorizontal="left">
            <Box alignItems="center">
                <Icon name="code" size="24" color="purple500" />
                <Text size="20">
                  {moxieStat.frameDevEarningsAmount.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </Text>
                <Text size="16" color="text200">Frame Dev Earnings</Text>
              </Box>
              <Box alignItems="center">
                <Icon name="box" size="24" color="teal500" />
                <Text size="20">
                  {moxieStat.otherEarningsAmount.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </Text>
                <Text size="16" color="text200">Other Earnings</Text>
              </Box>
            </HStack>

            <Divider color="gray700"/>
            
          </VStack>
        </Box>
      ),
      headers: {
        'Cache-Control': 'public, max-age=20',
      },
    });
  } catch (error) {
    console.error('Error in Moxie Image Handler:', error);
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
              Error fetching Moxie stats
            </Heading>
            <Text size="20" color="red">
              {error instanceof Error ? error.message : 'Unknown error'}
            </Text>
          </VStack>
        </Box>
      ),
    });
  }
});

// Utility function to fetch user profile and store fid and username
async function fetchUserProfile(input: string, state: State): Promise<User> {
  let user: User | undefined = undefined;

  if (/^\d+$/.test(input)) {
    // Input is numeric, treat as fid
    const fid = input;
    const userRes = await Lum0x.farcasterUser.getUserByFids({ fids: fid });
    user = userRes.users[0];
  } else {
    // Input is non-numeric, treat as username
    const username = input;
    const userRes = await Lum0x.farcasterUser.searchUser({
      q: username,
      limit: 1,
    });
    if (userRes.result && userRes.result.users && userRes.result.users.length > 0) {
      user = userRes.result.users[0];
    } else {
      throw new Error('User not found');
    }
  }

  if (!user) {
    throw new Error('User not found');
  }

  // Store fid and username in the state
  state.fid = user.fid.toString();
  state.username = user.username;

  console.log('Fetched User in Image Handler:', user);
  return user;
}

// Utility function to fetch Nanograph metrics
async function fetchNanographMetrics(username: string): Promise<any[]> {
  const currentDate = format(new Date(), 'yyyy-MM-dd');
  console.log('Fetching Nanograph metrics for username:', username, 'date:', currentDate);

  const response = await fetch(
    `https://api.nanograph.xyz/farcaster/user/${encodeURIComponent(username)}/metrics?timeframe=monthly&date=${currentDate}`
  );

  if (response.status === 404) {
    // No data available for this user
    console.log(`Nanograph metrics not found for username: ${username}`);
    return [];
  }

  const responseText = await response.text();
  console.log('Nanograph API response:', responseText);

  if (!response.ok) {
    throw new Error(`Nanograph API Error: ${response.status} - ${responseText}`);
  }

  const metrics = JSON.parse(responseText);
  return metrics;
}

if (process.env.NODE_ENV === 'development') {
  devtools(app, { serveStatic })
}

export const GET = handle(app)
export const POST = handle(app)