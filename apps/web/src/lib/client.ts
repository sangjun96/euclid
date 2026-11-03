import { hc } from "hono/client";
import type { AppType } from "@euclid/api";

// The hc client takes the AppType generic, giving total TypeScript autocompletion
// and compile-time verification on every route, path param, query param, body, and response.
export const api = hc<AppType>("/");
