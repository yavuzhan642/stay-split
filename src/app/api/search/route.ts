import { getAccommodationProvider } from "@/providers/registry";
import { handleSearchRequest } from "@/services/search-http";

/** JSON version of the search page; see docs/API.md for the contract. */
export function GET(request: Request): Promise<Response> {
  return handleSearchRequest(request, { provider: getAccommodationProvider() });
}
