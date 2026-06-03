// pipeline/fetch/failure-class.js
//
// Map an ingest error message to a failure class + whether it's worth retrying.
// Used by run-ingest-batch to (a) record outcomes in ingest_attempts, (b) retry
// only transient classes with backoff, and (c) let the cohort selector skip
// recently-failed hospitals. Buckets mirror docs/INGEST_RETRO.md.

/**
 * @param {string} message
 * @returns {{ failureClass: string, transient: boolean, httpCode: number|null }}
 */
export function classifyFailure(message = '') {
  const m = String(message);
  const httpCode = (m.match(/HTTP (\d{3})/) || [])[1];
  const code = httpCode ? parseInt(httpCode, 10) : null;
  const is = (re) => re.test(m);

  // Transient — worth retrying (network blips, rate limits, server hiccups, timeouts).
  if (is(/HTTP 429/)) return { failureClass: 'http_429', transient: true, httpCode: code };
  if (is(/HTTP 5\d\d/)) return { failureClass: 'http_5xx', transient: true, httpCode: code };
  if (is(/abort|timed?\s?out|ETIMEDOUT/i)) return { failureClass: 'timeout', transient: true, httpCode: code };
  if (is(/fetch failed|ENOTFOUND|ECONNRESET|ECONNREFUSED|EAI_AGAIN|socket hang|network|empty response/i))
    return { failureClass: 'fetch_failed', transient: true, httpCode: code };

  // Permanent — a plain retry won't help; needs discovery/Tier-2/parser/format work.
  if (is(/HTTP 404/)) return { failureClass: '404_dead', transient: false, httpCode: code };
  if (is(/HTTP 40[013]|tier1:.*tier2:/)) return { failureClass: '403_blocked', transient: false, httpCode: code };
  if (is(/maximum_object_size/)) return { failureClass: 'giant_json', transient: false, httpCode: code };
  if (is(/Out of Memory/i)) return { failureClass: 'oom', transient: false, httpCode: code };
  if (is(/No \.csv\/\.json entry/)) return { failureClass: 'zip_no_csv', transient: false, httpCode: code };
  if (is(/Not a recognizable CSV/)) return { failureClass: 'unrecognized', transient: false, httpCode: code };
  if (is(/Binder Error|INTERNAL Error|Quote Not Closed|DuckDB exited|Invalid Input|Conversion Error/))
    return { failureClass: 'parse', transient: false, httpCode: code };

  return { failureClass: 'other', transient: false, httpCode: code };
}
