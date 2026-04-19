import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src/index';

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

describe('Default HTML page', () => {
	it('returns HTML with links (unit style)', async () => {
		const request = new IncomingRequest('http://example.com');
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env);
		await waitOnExecutionContext(ctx);
		expect(response.headers.get('content-type')).toContain('text/html');
		const body = await response.text();
		expect(body).toContain('/btc-usd.json');
		expect(body).toContain('/aemet/mapa-isobaras.xml');
	});

	it('returns HTML with links (integration style)', async () => {
		const response = await SELF.fetch('https://example.com');
		expect(response.headers.get('content-type')).toContain('text/html');
		const body = await response.text();
		expect(body).toContain('<h1>Available Feeds');
	});
});
