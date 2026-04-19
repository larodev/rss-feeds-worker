import { escapeXml } from "./utils";

async function btcUsdFeed(request: Request, env: Env): Promise<Response> {
  const cacheKey = "btc_feed";
  const CACHE_TTL_MS = 60 * 1000; // 1 minute for re-fetch

  // Parse timezone from query parameter ?tz=
  const url = new URL(request.url);
  const tzParam = url.searchParams.get("tz")?.trim();
  const tz = parseTimezone(tzParam);

  // Fetch cached minimal data (price + timestamp)
  interface CachedPriceRecord { price: number; fetchedAt: string }
  const cachedRaw = await env.RSS_CACHE.get(cacheKey, { type: "json" }) as (CachedPriceRecord | null);
  let price: number | undefined;
  let fetchedAtISO: string | undefined; // ISO timestamp when price was fetched in UTC
  if (cachedRaw) {
    price = cachedRaw.price;
    fetchedAtISO = cachedRaw.fetchedAt;
  }

  const needRefresh = !fetchedAtISO || !price || (Date.now() - new Date(fetchedAtISO).getTime()) > CACHE_TTL_MS;

  if (needRefresh) {
    const apiUrl = "https://api.coingecko.com/api/v3/coins/bitcoin";
    const response = await fetch(apiUrl, {
      headers: {
        "accept": "application/json",
        // In case plan supports API key; optional
        ...(env as any).COINGECKO_API_KEY ? { "x-cg-demo-api-key": (env as any).COINGECKO_API_KEY } : {}
      },
    });
    console.log(response);
    
    if (response.ok) {
      const data: CoinGeckoResponse = await response.json();
      price = data.market_data.current_price.usd;
      fetchedAtISO = new Date().toISOString();
      // Store minimal cache
      await env.RSS_CACHE.put(
        cacheKey,
        JSON.stringify({ price, fetchedAt: fetchedAtISO }),
        { expirationTtl: 120 }
      );
    } else if (!price) {
      return new Response(JSON.stringify({ error: "Failed to fetch Bitcoin price" }), {
        status: 502,
        headers: { "content-type": "application/json" },
      });
    }
  }

  // At this point we have price and fetchedAtISO
  if (!price || !fetchedAtISO) {
    return new Response(JSON.stringify({ error: "Price unavailable" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
  const fetchedDate = new Date(fetchedAtISO);

  let displayTime: string;
  let hours: string;
  let minutes: string;
  let tzLabel = tz.label;

  if (tz.timeZone) {
    // Use Intl for precise timezone handling
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz.timeZone,
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(fetchedDate);

    const get = (type: string) => parts.find(p => p.type === type)?.value || "";
    const dayNum = parseInt(get("day"), 10);
    const monthName = get("month");
    hours = get("hour").padStart(2, "0");
    minutes = get("minute").padStart(2, "0");

    const ordinal = (d: number) =>
      (d > 3 && d < 21) ? "th" :
        ({1:"st",2:"nd",3:"rd"} as Record<number,string>)[d % 10] || "th";

    displayTime = `${dayNum}${ordinal(dayNum)} ${monthName} ${hours}:${minutes} ${tzLabel}`;
  } else {
    // Fallback to offset math for numeric UTC±
    const offsetMs = (tz.offsetHours || 0) * 3600_000;
    const adjusted = new Date(fetchedDate.getTime() + offsetMs);
    const day = adjusted.getUTCDate();
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const month = monthNames[adjusted.getUTCMonth()];
    hours = String(adjusted.getUTCHours()).padStart(2,'0');
    minutes = String(adjusted.getUTCMinutes()).padStart(2,'0');
    const ordinal = (d: number) => (d > 3 && d < 21) ? 'th' : ({1:"st",2:"nd",3:"rd"} as any)[d % 10] || 'th';
    displayTime = `${day}${ordinal(day)} ${month} ${hours}:${minutes} ${tzLabel}`;
  }

  // // date_published stays original UTC iso (fetchedAtISO)
  // const feed = {
  //   version: "https://jsonfeed.org/version/1",
  //   title: "Bitcoin USD Price Feed",
  //   home_page_url: "https://laro.dev",
  //   feed_url: request.url,
  //   icon: '/favicon-btc.ico',
  //   description: `Current Bitcoin price in USD updated every minute. Price provided by CoinGecko. Feed created by laro.dev. Time shown in ${tzLabel}.`,
  //   items: [
  //     {
  //       id: fetchedAtISO,
  //       title: `BTC/USD ${hours}:${minutes} ${tzLabel}: $${price.toFixed(2)}`,
  //       content_html: `<p>Bitcoin price at ${displayTime}: <b>$${price.toFixed(2)}</b> USD. Timezone: ${tzLabel}. Price provided by <a href="https://www.coingecko.com/en/coins/bitcoin" target="_blank" rel="noreferrer" title="Bitcoin at Coingecko" aria-label="Bitcoin at Coingecko">CoinGecko</a>. Feed created by <a href="https://laro.dev" target="_blank" rel="noreferrer" title="laro.dev" aria-label="laro.dev">laro.dev</a>.</p>`,
  //       content_text: `Bitcoin price at ${displayTime}: $${price.toFixed(2)} USD. Timezone: ${tzLabel}. Price provided by CoinGecko. Feed created by https://laro.dev.`,
  //       summary: `Bitcoin price at ${displayTime}: $${price.toFixed(2)} USD. Timezone: ${tzLabel}. Price provided by CoinGecko. Feed created by laro.dev.`,
  //       date_published: fetchedAtISO,
  //       author: "laro.dev",
  //       url: "https://www.coingecko.com/en/coins/bitcoin",
  //       external_url: "https://laro.dev"
  //     },
  //   ],
  // };

  const feedid = "8e4e90e4-6c56-4b68-83db-d0b8c5e86af8";
  const feedTitle = "Bitcoin USD Price Feed";
  const description = `Current Bitcoin price in USD updated every minute. Price provided by CoinGecko. Feed created by laro.dev. Time shown in ${tzLabel}. `;
  const feedUrl = "https://rss.laro.dev/btc-usd.xml";
  const sourceUrl = "https://www.coingecko.com/en/coins/bitcoin";
  const contentHtml = `<p>Bitcoin price at ${displayTime}: <b>$${price.toFixed(2)}</b> USD. Timezone: ${tzLabel}. Price provided by <a href="https://www.coingecko.com/en/coins/bitcoin" target="_blank" rel="noreferrer" title="Bitcoin at Coingecko" aria-label="Bitcoin at Coingecko">CoinGecko</a>. Feed created by <a href="https://laro.dev" target="_blank" rel="noreferrer" title="laro.dev" aria-label="laro.dev">laro.dev</a>.</p>
  <small>Append a timezone parameter to the feed URL to get local times: <code>?tz=Europe/Madrid</code>, <code>?tz=-6</code>, etc. (numeric UTC offset or <a href="https://en.wikipedia.org/wiki/List_of_tz_database_time_zones" alt="Timezones wikipedia article" target="_blank" rel="noreferrer">IANA timezone names</a>). Example: <a href="/btc-usd.json?tz=+1">/btc-usd.json?tz=+1</a></small>`;

  const feed = `<?xml version="1.0" encoding="utf-8"?>
<?xml-stylesheet href="/feed.xsl" type="text/xsl"?>
<feed xmlns="http://www.w3.org/2005/Atom"  
      xmlns:media="http://search.yahoo.com/mrss/"
      xml:lang="es-ES" 
      xml:base="${feedUrl}" >
    <title>${escapeXml(feedTitle)}</title>
    <author>
        <name>laro.dev</name>
        <email>hello@laro.dev</email>
    </author>
    <link rel='self' type='application/atom+xml' href='${feedUrl}' />
    <subtitle>${escapeXml(description)}</subtitle>
    <id>urn:uuid:${feedid}</id>
    <icon>/favicon-aemet.ico</icon>
    <updated>${fetchedAtISO}</updated>
    <entry>
      <title>${escapeXml(`BTC/USD ${hours}:${minutes} ${tzLabel}: $${price.toFixed(2)}`)}</title>
      <link rel='alternate' type='type/html' href='${sourceUrl}' />
      <id>${fetchedAtISO}</id>
      <published>${fetchedAtISO}</published>
      <updated>${fetchedAtISO}</updated>
      <summary type="xhtml">${contentHtml}</summary>
      <content type="xhtml">${contentHtml}</content>
    </entry>
</feed>`;

  return new Response(feed, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=60",
    },
  });
}

// Helper: validate IANA timezone
  const isValidIana = (tz: string) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tz }).format();
      return true;
    } catch {
      return false;
    }
  };

  const parseTimezone = (tz?: string): TZInfo => {
    if (!tz) return { label: "UTC", timeZone: "UTC" };
    // numeric offset support remains
    if (/^[+-]?\d{1,2}(\.\d)?$/.test(tz)) {
      const num = parseFloat(tz);
      if (num < -12 || num > 14) return { label: "UTC", timeZone: "UTC" };
      return { label: `UTC${num >= 0 ? "+" + num : num}`, offsetHours: num };
    }
    // Try IANA
    if (isValidIana(tz)) return { label: tz, timeZone: tz };
    return { label: "UTC", timeZone: "UTC" };
  };

  type TZInfo = { label: string; timeZone?: string; offsetHours?: number };


interface CoinGeckoResponse {
  market_data: {
    current_price: {
      usd: number;
      last_updated_at: number;
    }
  };
}

//export function
export { btcUsdFeed };