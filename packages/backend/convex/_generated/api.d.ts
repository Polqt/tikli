/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activityLog from "../activityLog.js";
import type * as cycles from "../cycles.js";
import type * as dashboard from "../dashboard.js";
import type * as groups from "../groups.js";
import type * as healthCheck from "../healthCheck.js";
import type * as invites from "../invites.js";
import type * as members from "../members.js";
import type * as payments from "../payments.js";
import type * as privateData from "../privateData.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activityLog: typeof activityLog;
  cycles: typeof cycles;
  dashboard: typeof dashboard;
  groups: typeof groups;
  healthCheck: typeof healthCheck;
  invites: typeof invites;
  members: typeof members;
  payments: typeof payments;
  privateData: typeof privateData;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
