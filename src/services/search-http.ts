import type { SearchResult } from "@/domain/search";
import { rawSearchParams, searchParamsToInput } from "@/lib/search-params";
import { ProviderError, type AccommodationProvider } from "@/providers/types";
import { validateSearchQuery, type ValidationIssue } from "./search-query";
import { searchStays } from "./search-stays";

export type ApiErrorCode = "INVALID_QUERY" | "PROVIDER_UNAVAILABLE" | "PROVIDER_ERROR" | "INTERNAL";

export interface ApiError {
  readonly code: ApiErrorCode;
  /** Safe to show to users; never contains internal details. */
  readonly message: string;
  readonly issues?: readonly ValidationIssue[];
}

/** Every response is either `{ data }` or `{ error }`, so clients branch on one field. */
export type SearchApiResponse = { readonly data: SearchResult } | { readonly error: ApiError };

export interface SearchHttpDependencies {
  readonly provider: AccommodationProvider;
  readonly now?: Date;
  readonly logError?: (event: string, details: Record<string, unknown>) => void;
}

/**
 * `GET /api/search?city=…&checkIn=…`: the same search the web page runs,
 * as JSON, for other clients (a mobile app, partners, tests). Kept apart from
 * the route file so it is a plain function of (Request, deps) → Response.
 *
 * Status codes tell clients what to do next: 400 = fix the request,
 * 503 = try again later (with Retry-After), 502/500 = not your fault.
 */
export async function handleSearchRequest(request: Request, deps: SearchHttpDependencies): Promise<Response> {
  const logError = deps.logError ?? defaultLogError;
  const params = rawSearchParams(new URL(request.url).searchParams);
  const validation = validateSearchQuery(searchParamsToInput(params), { now: deps.now });

  if (!validation.ok) {
    return json(
      { error: { code: "INVALID_QUERY", message: "Arama parametreleri geçersiz.", issues: validation.issues } },
      400,
    );
  }

  try {
    const result = await searchStays(validation.query, { provider: deps.provider, signal: request.signal });
    // Prices move; let the browser reuse an answer briefly, but never share it through a CDN.
    return json({ data: result }, 200, { "Cache-Control": "private, max-age=60" });
  } catch (error) {
    if (error instanceof ProviderError) {
      logError("search.provider_failed", {
        providerId: error.providerId,
        retryable: error.retryable,
        message: error.message,
      });
      return error.retryable
        ? json(
            {
              error: {
                code: "PROVIDER_UNAVAILABLE",
                message: "Konaklama verilerine şu an ulaşılamıyor. Lütfen birkaç saniye sonra tekrar deneyin.",
              },
            },
            503,
            { "Retry-After": "5" },
          )
        : json({ error: { code: "PROVIDER_ERROR", message: "Konaklama sağlayıcısı isteği yanıtlayamadı." } }, 502);
    }
    logError("search.unexpected_error", { message: error instanceof Error ? error.message : String(error) });
    return json({ error: { code: "INTERNAL", message: "Beklenmeyen bir hata oluştu." } }, 500);
  }
}

function json(body: SearchApiResponse, status: number, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers });
}

/** One JSON line per event: easy to grep locally, and log platforms parse it as structured data. */
function defaultLogError(event: string, details: Record<string, unknown>): void {
  console.error(JSON.stringify({ level: "error", event, ...details, at: new Date().toISOString() }));
}
