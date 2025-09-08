import { Resolver as  BaseResolver } from './resolver.js';
import { BrowserCacheProvider } from './browser_cache_provider.js';
import type { CacheProvider } from './cache_provider.js';

interface ResolverOptions {
  depth?: number;
  cacheProvider?: CacheProvider;
}

export class Resolver extends BaseResolver {
  constructor(options: ResolverOptions = {}) {
    super({
      ...options,
      cacheProvider: options.cacheProvider ?? new BrowserCacheProvider(),
    });
  }
}

export * from './public_api.js';
export { BrowserCacheProvider } from './browser_cache_provider.js';
