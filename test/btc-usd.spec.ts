import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

// Correctly-typed Request as in existing tests
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

// Helper to fetch and parse JSON feed
async function fetchFeed(path: string) {
  const request = new IncomingRequest(`https://example.com${path}`);
  const ctx = createExecutionContext();
  const response = await worker.fetch(request, env);
  await waitOnExecutionContext(ctx);
  expect(response.ok).toBe(true);
  expect(response.headers.get('content-type')).toContain('application/json');
  const json = await response.json();
  return json as any;
}

describe('BTC/USD feed timezone handling', () => {
  it('returns UTC when no tz param', async () => {
    const feed = await fetchFeed('/btc-usd.json');
    expect(feed.description).toContain('Time shown in UTC');
    const item = feed.items[0];
    expect(item.content_text).toMatch(/Timezone: UTC/);
  });

  it('returns CET when tz=CET', async () => {
    const feed = await fetchFeed('/btc-usd.json?tz=CET');
    expect(feed.description).toContain('Time shown in CET');
    const item = feed.items[0];
    expect(item.content_text).toMatch(/Timezone: CET/);
  });

  it('returns offset -6 when tz=-6', async () => {
    const feed = await fetchFeed('/btc-usd.json?tz=-6');
    // Description will show label derived from parsing (UTC-6)
    expect(feed.description).toContain('UTC-6');
    const item = feed.items[0];
    expect(item.content_text).toMatch(/Timezone: UTC-6/);
  });

  it('returns IST (fractional offset) when tz=IST', async () => {
    const feed = await fetchFeed('/btc-usd.json?tz=IST');
    expect(feed.description).toContain('Time shown in IST');
    const item = feed.items[0];
    expect(item.content_text).toMatch(/Timezone: IST/);
  });

  it('reuses cached price across different tz params without refetching immediately', async () => {
    // First fetch (likely triggers API call)
    const first = await fetchFeed('/btc-usd.json');
    const second = await fetchFeed('/btc-usd.json?tz=CET');
    // Price should match because within cache TTL
    expect(second.items[0].title).toBe(first.items[0].title);
    // date_published (UTC ISO) should match as underlying fetch time
    expect(second.items[0].date_published).toBe(first.items[0].date_published);
  });
});
