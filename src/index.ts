//import btcUsdFeed from './btc-usd';
import { btcUsdFeed } from './btc-usd';
import { aemetIsobarsFeed } from './aemet-isobaras';



export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/favicon.ico") {

      const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 100">
        <text y="0.9em" font-size="90">🌊</text>
      </svg>`;

      return new Response(FAVICON_SVG, {
        headers: {
          "content-type": "image/svg+xml; charset=utf-8",
          "cache-control": "public, max-age=86400"
        }
      });
    }

    if (url.pathname === "/favicon-aemet.ico") {

      const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 100">
        <text y="0.9em" font-size="90">🌤️</text>
      </svg>`;

      return new Response(FAVICON_SVG, {
        headers: {
          "content-type": "image/svg+xml; charset=utf-8",
          "cache-control": "public, max-age=86400"
        }
      });
    }

    if (url.pathname === "/favicon-btc.ico") {

      const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 100">
        <text y="0.9em" font-size="90">₿</text>
      </svg>`;

      return new Response(FAVICON_SVG, {
        headers: {
          "content-type": "image/svg+xml; charset=utf-8",
          "cache-control": "public, max-age=86400"
        }
      });
    }

    switch (url.pathname) {
      case "/btc-usd.xml":
        return btcUsdFeed(request, env);
      case "/aemet/mapa-isobaras.xml":
        return aemetIsobarsFeed(request, env);
      default:
        return env.ASSETS.fetch(request)
    }
  },
};



