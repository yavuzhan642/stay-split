import { loadServerConfig } from "@/config/server-config";
import { getAccommodationProvider } from "@/providers/registry";
import { createRateLimiter } from "@/services/rate-limit";
import { handleSearchRequest } from "@/services/search-http";

const { apiRateLimitPerMinute } = loadServerConfig();
// One limiter per server process, shared by all requests to this route.
const rateLimiter =
  apiRateLimitPerMinute > 0 ? createRateLimiter({ limit: apiRateLimitPerMinute, windowMs: 60_000 }) : undefined;

/** JSON version of the search page; see docs/API.md for the contract. */
export function GET(request: Request): Promise<Response> {
  return handleSearchRequest(request, { provider: getAccommodationProvider(), rateLimiter });
}
