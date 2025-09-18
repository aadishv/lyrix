
/* eslint-disable @typescript-eslint/no-var-requires */
declare const require: any;
const { load } = require('cheerio');
import { SpotifyApi } from '@spotify/web-api-ts-sdk';
import readline from 'readline';

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const GENIUS_TOKEN = process.env.GENIUS_ACCESS_TOKEN;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Please set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET environment variables.');
  process.exit(1);
}

type TokenInfo = {
  accessToken: string;
  expiresAt: number; // epoch ms
};

let tokenCache: TokenInfo | null = null;
const queryCache = new Map<string, any>();
let lastResults: any[] = [];

async function fetchWithRedirect(url: string, init: RequestInit = {}, maxRedirects = 5): Promise<Response> {
  let current = url;
  let redirects = 0;
  let lastErr: any = null;
  while (redirects <= maxRedirects) {
    try {
      const res = await fetch(current, init);
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get('location');
        if (!loc) return res;
        // Resolve relative redirects
        current = new URL(loc, current).toString();
        redirects++;
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      // transient network errors: retry a few times
      if (redirects >= maxRedirects) break;
      redirects++;
      await new Promise((r) => setTimeout(r, 200 * redirects));
    }
  }
  throw lastErr || new Error('Failed to fetch');
}

async function fetchText(url: string, init: RequestInit = {}): Promise<string> {
  const res = await fetchWithRedirect(url, init);
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Fetch ${url} failed: ${res.status} ${txt}`);
  }
  // Use arrayBuffer + TextDecoder to be robust across runtimes
  const ab = await res.arrayBuffer();
  return new TextDecoder('utf-8').decode(ab);
}

async function fetchAccessToken(): Promise<TokenInfo> {
  const basic = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  const res = await fetchWithRedirect('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to get token: ${res.status} ${body}`);
  }

  const data = await res.json();
  const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 3600;
  const expiresAt = Date.now() + (expiresIn - 60) * 1000; // refresh 60s early
  return { accessToken: data.access_token, expiresAt };
}

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.accessToken;
  tokenCache = await fetchAccessToken();
  return tokenCache.accessToken;
}

async function searchTracks(query: string) {
  const sdk = SpotifyApi.withClientCredentials(process.env.SPOTIFY_CLIENT_ID!, process.env.SPOTIFY_CLIENT_SECRET!, []);
  const results = await sdk.search(query, ['track']).then(items => items.tracks.items);
  return results;
}

function printTrack(track: any, index: number) {
  const title = track.name ?? '<unknown title>';
  const artists = Array.isArray(track.artists) ? track.artists.map((a: any) => a.name).join(', ') : '<unknown artists>';
  const album = track.album?.name ?? '<unknown album>';
  const keys = Object.keys(track).join(', ');

  console.log(`\n#${index + 1}: ${title}`);
  console.log(`  Artist : ${artists}`);
  console.log(`  Album  : ${album}`);
  console.log(`  Keys   : ${keys}`);
}

async function fetchLyricsFromGenius(track: any): Promise<string | null> {
  if (!GENIUS_TOKEN) {
    throw new Error('GENIUS_ACCESS_TOKEN not set');
  }

  const title = track.name ?? '';
  const artist = Array.isArray(track.artists) && track.artists[0] ? track.artists[0].name : '';
  const q = `${title} ${artist}`.trim();

  const searchUrl = `https://api.genius.com/search?q=${encodeURIComponent(q)}`;
  const res = await fetchWithRedirect(searchUrl, { headers: { Authorization: `Bearer ${GENIUS_TOKEN}`, Accept: 'application/json' } });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Genius search failed: ${res.status} ${txt}`);
  }
  const data = await res.json();
  const hits = data.response?.hits ?? [];
  if (!hits.length) return null;

  let chosen: any = hits[0];
  if (artist) {
    const lowerArtist = artist.toLowerCase();
    const match = hits.find((h: any) => (h.result?.primary_artist?.name ?? '').toLowerCase().includes(lowerArtist));
    if (match) chosen = match;
  }

  const path = chosen.result?.path;
  if (!path) return null;

  const pageUrl = `https://genius.com${path}`;
  const html = await fetchText(pageUrl, { headers: { 'User-Agent': 'lyrics-fetcher/1.0', Accept: 'text/html' } });

  const $ = load(html);
  const DEBUG = !!process.env.DEBUG_LYRICS;

  const containers = $('[data-lyrics-container="true"]');
  if (!containers.length) {
    if (DEBUG) console.error('No [data-lyrics-container] elements found on page');
    return null;
  }

  if (DEBUG) {
    console.error(`Genius: found ${containers.length} [data-lyrics-container] nodes`);
  }

  const texts: string[] = [];
  containers.each((i: number, el: any) => {
    const t = $(el).find("br").replaceWith("\n").end().text();
    if (t != null) texts.push(t);
  });

  let lyrics = texts.join('\n');
  console.log(lyrics);
  // Apply user's Read More trimming: split on "Read More", drop the leading chunk
  if (lyrics.includes('Read More')) {
    const parts = lyrics.split('Read More');
    if (parts.length > 1) lyrics = parts.slice(1).join('Read More');
  }

  return lyrics.trim() || null;
}
async function check(url: string) {
  const html = await fetchText(url, { headers: { 'User-Agent': 'lyrics-fetcher/1.0', Accept: 'text/html' } });

  const $ = load(html);
  const DEBUG = !!process.env.DEBUG_LYRICS;

  const containers = $('[data-lyrics-container="true"]');
  if (!containers.length) {
    if (DEBUG) console.error('No [data-lyrics-container] elements found on page');
    return null;
  }

  if (DEBUG) {
    console.error(`Genius: found ${containers.length} [data-lyrics-container] nodes`);
  }

  const texts: string[] = [];
  containers.each((i: number, el: any) => {
    const t = $(el).find("br").replaceWith("\n").end().text();
    if (t != null) texts.push(t);
  });

  let lyrics = texts.join('\n');
  // Apply user's Read More trimming: split on "Read More", drop the leading chunk
  if (lyrics.includes('Read More')) {
    const parts = lyrics.split('Read More');
    if (parts.length > 1) lyrics = parts.slice(1).join('Read More');
  }

  return lyrics.trim() || null;
}
async function main() {
  console.log('Spotify search (Client Credentials). Type a query and press Enter. Type `exit` to quit.');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const question = (prompt: string) => new Promise<string>((resolve) => rl.question(prompt, resolve));

  try {
    while (true) {
      const q = await question('> ');
      if (!q) continue;
      const trimmed = q.trim();
      if (!trimmed) continue;
      if (trimmed.toLowerCase() === 'exit' || trimmed.toLowerCase() === 'quit') break;

      const numMatch = trimmed.match(/^\s*(?:select\s+)?(\d+)\s*$/i);
      if (numMatch) {
        const idx = parseInt(numMatch[1], 10) - 1;
        if (!lastResults || lastResults.length === 0) {
          console.log('No previous search results. Perform a search first.');
          continue;
        }
        if (idx < 0 || idx >= lastResults.length) {
          console.log(`Index out of range (1-${lastResults.length})`);
          continue;
        }
        const track = lastResults[idx];
        console.log(`Fetching lyrics for #${idx + 1}: ${track.name} — ${track.artists?.map((a: any) => a.name).join(', ')}`);
        try {
          const lyrics = await fetchLyricsFromGenius(track);
          if (!lyrics) {
            console.log('Lyrics not found on Genius.');
          } else {
            console.log('\n---- LYRICS ----\n');
            console.log(lyrics);
            console.log('\n---- END ----\n');
          }
        } catch (err) {
          console.error('Error fetching lyrics:', err instanceof Error ? err.message : String(err));
        }
        continue;
      }

      try {
        const results = await searchTracks(trimmed);
        if (!results || results.length === 0) {
          console.log('No tracks found.');
          continue;
        }
        for (let i = 0; i < results.length; i++) {
          printTrack(results[i], i);
        }
        console.log('\nEnter a number (e.g. `1`) or `select 1` to fetch lyrics for that track.');
      } catch (err) {
        console.error('Error:', err instanceof Error ? err.message : String(err));
      }
    }
  } finally {
    rl.close();
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

// console.log(await check("https://genius.com/Twenty-one-pilots-ride-lyrics"));
