"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { createHmac } from "crypto";

// Base64 decoding utility
function base64Decode(str: string): string {
  return Buffer.from(str, 'base64').toString('utf-8');
}

// HMAC-SHA256 implementation using Node.js crypto
function hmacSha256(key: string, message: string): string {
  const hmac = createHmac('sha256', key);
  hmac.update(message);
  return hmac.digest('base64');
}

interface MusixMatchTrack {
  track_id: number;
  track_name: string;
  artist_name: string;
  album_name: string;
  track_length: number;
  instrumental: number;
  has_lyrics: number;
  has_lyrics_crowd: number;
  has_richsync: number;
  has_subtitles: number;
  updated_time: string;
}

interface MusixMatchLyrics {
  lyrics_id: number;
  lyrics_body: string;
  script_tracking_url: string;
  pixel_tracking_url: string;
  lyrics_copyright: string;
  updated_time: string;
}

interface MusixMatchResponse<T> {
  message: {
    header: {
      status_code: number;
      execute_time: number;
      available: number;
    };
    body: T;
  };
}

class MusixMatchAPI {
  private baseUrl = "https://www.musixmatch.com/ws/1.1/";
  private headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36"
  };
  private secret: string | null = null;

  private async getLatestApp(): Promise<string> {
    const url = "https://www.musixmatch.com/search";
    const headers = {
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Cookie": "mxm_bab=AB",
    };
    
    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        throw new Error(`Failed to fetch MusixMatch search page: HTTP ${response.status} ${response.statusText}`);
      }
      
      const htmlContent = await response.text();
      
      // Regular expression to match `_app` script URLs
      const pattern = /src="([^"]*\/_next\/static\/chunks\/pages\/_app-[^"]+\.js)"/g;
      const matches = [...htmlContent.matchAll(pattern)];
      
      if (matches.length === 0) {
        console.error("MusixMatch HTML structure changed. No _app script found.");
        console.error("HTML snippet:", htmlContent.substring(0, 1000));
        throw new Error("_app URL not found in the HTML content. MusixMatch may have changed their site structure.");
      }
      
      return matches[matches.length - 1][1]; // Get the last match
    } catch (error) {
      console.error("Error fetching MusixMatch app URL:", error);
      throw new Error(`Failed to extract MusixMatch app URL: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async getSecret(): Promise<string> {
    if (this.secret) return this.secret;
    
    try {
      const appUrl = await this.getLatestApp();
      const fullAppUrl = appUrl.startsWith('http') ? appUrl : `https://www.musixmatch.com${appUrl}`;
      
      const response = await fetch(fullAppUrl, { headers: this.headers });
      if (!response.ok) {
        throw new Error(`Failed to fetch MusixMatch JavaScript: HTTP ${response.status} ${response.statusText}`);
      }
      
      const javascriptCode = await response.text();
      
      // Regular expression to capture the string inside `from(...)`
      const pattern = /from\(\s*"(.*?)"\s*\.split/;
      const match = javascriptCode.match(pattern);
      
      if (!match) {
        console.error("MusixMatch JavaScript structure changed. Secret extraction pattern not found.");
        console.error("JS snippet:", javascriptCode.substring(0, 2000));
        
        // Try alternative patterns
        const alternativePatterns = [
          /from\("([^"]+)"\)/,
          /\.from\s*\(\s*"([^"]+)"/,
          /"([A-Za-z0-9+/]{20,}={0,2})"\.split/,
        ];
        
        for (const altPattern of alternativePatterns) {
          const altMatch = javascriptCode.match(altPattern);
          if (altMatch) {
            console.log("Found secret using alternative pattern:", altPattern);
            const encodedString = altMatch[1];
            const reversedString = encodedString.split('').reverse().join('');
            const decodedString = base64Decode(reversedString);
            this.secret = decodedString;
            return decodedString;
          }
        }
        
        throw new Error("Encoded string not found in the JavaScript code. MusixMatch may have changed their authentication method.");
      }
      
      const encodedString = match[1];
      const reversedString = encodedString.split('').reverse().join('');
      const decodedString = base64Decode(reversedString);
      
      this.secret = decodedString;
      return decodedString;
    } catch (error) {
      console.error("Error extracting MusixMatch secret:", error);
      throw new Error(`Failed to extract MusixMatch secret: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async generateSignature(url: string): Promise<string> {
    const secret = await this.getSecret();
    const currentDate = new Date();
    const year = currentDate.getFullYear().toString();
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const day = currentDate.getDate().toString().padStart(2, '0');
    
    const message = url + year + month + day;
    const signature = hmacSha256(secret, message);
    
    return `&signature=${encodeURIComponent(signature)}&signature_protocol=sha256`;
  }

  async searchTracks(query: string, page: number = 1): Promise<MusixMatchResponse<{ track_list: Array<{ track: MusixMatchTrack }> }>> {
    const encodedQuery = encodeURIComponent(query).replace(/%20/g, '+');
    const url = `track.search?app_id=web-desktop-app-v1.0&format=json&q=${encodedQuery}&f_has_lyrics=true&page_size=100&page=${page}`;
    return this.makeRequest(url);
  }

  async getTrack(trackId: number): Promise<MusixMatchResponse<{ track: MusixMatchTrack }>> {
    const url = `track.get?app_id=web-desktop-app-v1.0&format=json&track_id=${trackId}`;
    return this.makeRequest(url);
  }

  async getTrackLyrics(trackId: number): Promise<MusixMatchResponse<{ lyrics: MusixMatchLyrics }>> {
    const url = `track.lyrics.get?app_id=web-desktop-app-v1.0&format=json&track_id=${trackId}`;
    return this.makeRequest(url);
  }

  private async makeRequest<T>(url: string): Promise<T> {
    try {
      const cleanUrl = url.replace(/%20/g, '+').replace(/ /g, '+');
      const fullUrl = this.baseUrl + cleanUrl;
      const signedUrl = fullUrl + await this.generateSignature(fullUrl);
      
      const response = await fetch(signedUrl, { headers: this.headers });
      
      if (!response.ok) {
        const responseText = await response.text();
        console.error(`MusixMatch API HTTP error: ${response.status} ${response.statusText}`);
        console.error("Response body:", responseText);
        throw new Error(`MusixMatch API HTTP error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Check the MusixMatch-specific status code
      if (result.message?.header?.status_code !== 200) {
        const statusCode = result.message?.header?.status_code;
        const hint = result.message?.header?.hint;
        
        if (statusCode === 401) {
          if (hint === "captcha") {
            throw new Error("MusixMatch API blocked the request with captcha challenge. This may indicate rate limiting or bot detection. Try again later or use a different approach.");
          }
          throw new Error(`MusixMatch API authentication failed (401). ${hint ? `Hint: ${hint}` : 'The extracted secret may be invalid or expired.'}`);
        }
        
        throw new Error(`MusixMatch API error: Status ${statusCode}${hint ? `, Hint: ${hint}` : ''}`);
      }
      
      return result;
    } catch (error) {
      console.error("MusixMatch API request failed:", error);
      throw error;
    }
  }
}

// Singleton instance
const musixMatchAPI = new MusixMatchAPI();

export const searchTracks = action({
  args: { 
    query: v.string(),
    page: v.optional(v.number())
  },
  returns: v.array(v.object({
    id: v.number(),
    name: v.string(),
    trackName: v.string(),
    artistName: v.string(),
    albumName: v.string(),
    duration: v.number(),
    instrumental: v.boolean(),
    plainLyrics: v.string(),
    syncedLyrics: v.string(),
  })),
  handler: async (ctx, args) => {
    try {
      const response = await musixMatchAPI.searchTracks(args.query, args.page || 1);
      
      if (response.message.header.status_code !== 200) {
        const statusCode = response.message.header.status_code;
        const hint = response.message.header.hint;
        
        if (statusCode === 401) {
          if (hint === "captcha") {
            throw new Error("MusixMatch API is currently blocking requests with captcha challenges. This may indicate rate limiting or bot detection. Please try again later.");
          }
          throw new Error(`MusixMatch API authentication failed. ${hint ? `Hint: ${hint}` : 'The authentication secret may be invalid or expired.'}`);
        }
        
        throw new Error(`MusixMatch API error: Status ${statusCode}${hint ? `, Hint: ${hint}` : ''}`);
      }

      const tracks = response.message.body.track_list || [];
      return tracks.map(({ track }) => ({
        id: track.track_id,
        name: track.track_name,
        trackName: track.track_name,
        artistName: track.artist_name,
        albumName: track.album_name,
        duration: track.track_length,
        instrumental: track.instrumental === 1,
        plainLyrics: "", // Will be fetched separately
        syncedLyrics: "",
      }));
    } catch (error) {
      console.error("Error searching tracks:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Provide helpful error message for common issues
      if (errorMessage.includes("captcha") || errorMessage.includes("401")) {
        throw new Error("MusixMatch API is currently unavailable due to rate limiting or bot detection. This is a known issue with scraping-based approaches. Consider using an official API or trying again later.");
      }
      
      throw new Error(`Failed to search tracks: ${errorMessage}`);
    }
  },
});

export const getTrack = action({
  args: { trackId: v.number() },
  returns: v.object({
    id: v.number(),
    name: v.string(),
    trackName: v.string(),
    artistName: v.string(),
    albumName: v.string(),
    duration: v.number(),
    instrumental: v.boolean(),
    plainLyrics: v.string(),
    syncedLyrics: v.string(),
  }),
  handler: async (ctx, args) => {
    try {
      // First get track info
      const trackResponse = await musixMatchAPI.getTrack(args.trackId);
      
      if (trackResponse.message.header.status_code !== 200) {
        const statusCode = trackResponse.message.header.status_code;
        const hint = trackResponse.message.header.hint;
        
        if (statusCode === 401) {
          if (hint === "captcha") {
            throw new Error("MusixMatch API is currently blocking requests with captcha challenges. This may indicate rate limiting or bot detection. Please try again later.");
          }
          throw new Error(`MusixMatch API authentication failed. ${hint ? `Hint: ${hint}` : 'The authentication secret may be invalid or expired.'}`);
        }
        
        throw new Error(`MusixMatch API error: Status ${statusCode}${hint ? `, Hint: ${hint}` : ''}`);
      }

      const track = trackResponse.message.body.track;
      
      // Then get lyrics if available
      let lyricsBody = "";
      if (track.has_lyrics === 1) {
        try {
          const lyricsResponse = await musixMatchAPI.getTrackLyrics(args.trackId);
          if (lyricsResponse.message.header.status_code === 200) {
            lyricsBody = lyricsResponse.message.body.lyrics.lyrics_body;
          } else if (lyricsResponse.message.header.status_code === 401) {
            console.warn(`MusixMatch API blocked lyrics request for track ${args.trackId} (401 with captcha)`);
          }
        } catch (error) {
          console.warn(`Could not fetch lyrics for track ${args.trackId}:`, error);
        }
      }

      return {
        id: track.track_id,
        name: track.track_name,
        trackName: track.track_name,
        artistName: track.artist_name,
        albumName: track.album_name,
        duration: track.track_length,
        instrumental: track.instrumental === 1,
        plainLyrics: lyricsBody,
        syncedLyrics: "",
      };
    } catch (error) {
      console.error(`Error fetching track ${args.trackId}:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Provide helpful error message for common issues
      if (errorMessage.includes("captcha") || errorMessage.includes("401")) {
        throw new Error("MusixMatch API is currently unavailable due to rate limiting or bot detection. This is a known issue with scraping-based approaches. Consider using an official API or trying again later.");
      }
      
      throw new Error(`Failed to fetch track: ${errorMessage}`);
    }
  },
});