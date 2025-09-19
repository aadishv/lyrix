/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auth from "../auth.js";
import type * as authFunctions from "../authFunctions.js";
import type * as comments from "../comments.js";
import type * as http from "../http.js";
import type * as library from "../library.js";
import type * as share from "../share.js";
import type * as utils from "../utils.js";
import type * as v2_comments from "../v2/comments.js";
import type * as v2_library from "../v2/library.js";
import type * as v2_songs from "../v2/songs.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  authFunctions: typeof authFunctions;
  comments: typeof comments;
  http: typeof http;
  library: typeof library;
  share: typeof share;
  utils: typeof utils;
  "v2/comments": typeof v2_comments;
  "v2/library": typeof v2_library;
  "v2/songs": typeof v2_songs;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
