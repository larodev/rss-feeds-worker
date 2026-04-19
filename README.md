# BTC Feed - Cloudflare Worker

RSS feed for Bitcoin USD price updates, built with Cloudflare Workers and Wrangler.

## Environment Variables Setup

### Local Development

1. Create a `.dev.vars` file in the project root:

```bash
COINGECKO_API_KEY=your_coingecko_api_key_here
AEMET_API_KEY=your_aemet_api_key_here
```

2. Replace the placeholder values with your actual API keys:
   - Get your CoinGecko API key from [CoinGecko API](https://www.coingecko.com/en/api)
   - Get your AEMET API key from [AEMET OpenData](https://opendata.aemet.es/centrodedescargas/altaUsuario)

3. The `.dev.vars` file is already gitignored for security

When you run `wrangler dev`, the variables from `.dev.vars` will be automatically loaded.

### Production/Deployment

For production, use Wrangler's secret management to securely store your API keys:

```bash
wrangler secret put COINGECKO_API_KEY
wrangler secret put AEMET_API_KEY
```

Each command will prompt you to enter the API key value. The secrets will be encrypted and stored securely in Cloudflare.

#### Alternative Method (Not Recommended for Secrets)

If the value is not sensitive, you can add it directly to `wrangler.jsonc`:

```jsonc
{
  // ... existing config
  "vars": {
    "COINGECKO_API_KEY": "your_key_here",
    "AEMET_API_KEY": "your_key_here"
  }
}
```

⚠️ **Note:** This method exposes the value in your config file, so only use it for non-sensitive values.

## Development

Start the development server:

```bash
npm run dev
# or
npx wrangler dev
```

## Deployment

Deploy to Cloudflare Workers:

```bash
npm run deploy
# or
wrangler deploy
```

## Usage

The worker will automatically use `env.COINGECKO_API_KEY` and `env.AEMET_API_KEY` in both development and production environments.

## Timezone Support

Append a timezone parameter to the feed URL to get local times:

- `?tz=Europe/Madrid` - IANA timezone name
- `?tz=+1` or `?tz=-6` - Numeric UTC offset

Example: `/btc-usd.xml?tz=+1`
