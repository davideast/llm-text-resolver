# llm-txt-resolver

> Aggregating web content into a consolidated, LLM-ready context.

`llm-txt-resolver` is a tool for crawling an `llms.txt`, html page, or markdown document and aggregating connected links into a single clean text block.

## Features

- **Recursive Crawling**: Traverses a document by following links, up to a configurable depth.
- **Content Extraction**: Intelligently extracts the main content from html and markdown pages.
- **Caching**: Caches content to speed up subsequent runs and reduce network requests.
- **Knowledge Graph**: Builds a graph of the site's structure, which can be used for further analysis.
- **Node & Browser**: Works both in Node.js and in browser. Uses file system for Node.js caching and `Cache` API for browser caching.

## Installation

```bash
npm i llm-txt-resolver
# or bun
bun i llm-txt-resolver
```

## CLI Usage

```bash
npx llm-txt-resolver https://firebase.google.com/docs/ai-logic/llms.txt ai/llms.txt --depth 2 # default is 2
```

## Library Quick Start

```ts
import { Resolver } from 'llm-txt-resolver'

const resolver = new Resolver()
const llmsTxt = 'https://firebase.google.com/docs/ai-logic/llms.txt'

// Promised based
const { content, graph } = await resolver.resolve(llmsTxt)
console.log({ content, graph })

// Stream based
const stream = resolver.resolve(llmsTxt, { stream: true })
for await(let chunk of stream) {
  console.log(chunk)
}
```

## Browser Usage

The browser build of `llm-txt-resolver` is configured to use the `BrowserCacheProvider` by default, which leverages the browser's Cache API for caching. This makes it easy to use the resolver in a browser environment without any additional configuration.

To use the browser version, import from `llm-txt-resolver/browser`:

```ts
import { Resolver } from 'llm-txt-resolver/browser'

const resolver = new Resolver()
const llmsTxt = 'https://firebase.google.com/docs/ai-logic/llms.txt'

const { content, graph } = await resolver.resolve(llmsTxt)
console.log({ content, graph })

const stream = resolver.resolve(llmsTxt, { stream: true })
for await(let chunk of stream) {
  console.log(chunk)
}
```

The `Resolver` in the browser build has the same API as the Node.js version, but with `BrowserCacheProvider` as the default cache provider. You can still provide your own `cacheProvider` in the constructor if you wish to override the default behavior.

## API Reference

### `Resolver`

The main class for resolving web content.

#### `new Resolver(options?: ResolverOptions)`

Creates a new `Resolver` instance.

- `options` (optional): An object with the following properties:
  - `depth` (optional, default: `2`): The maximum depth to crawl.
  - `cacheProvider` (optional, default: `new FileSystemCacheProvider()` in Node.js, `new BrowserCacheProvider()` in the browser): An instance of a class that implements the `CacheProvider` interface.

#### `resolve(rootUrl: string, options?: ResolveOptions): Promise<{ content: string; graph: KnowledgeGraph }>`

Starts the crawling process from the given `rootUrl`.

- `rootUrl`: The URL to start crawling from.
- `options`: An object with the following properties:
  - `stream` (optional, default: `false`): Whether to stream the output.
- Returns a promise that resolves to an object with the following properties:
  - `content`: A single string containing the aggregated content of the website.
  - `graph`: A `KnowledgeGraph` instance representing the structure of the site.

### `CacheProvider`

An interface for implementing custom caching strategies.

```typescript
export interface CacheProvider {
  load(rootUrl: string): Promise<KnowledgeGraph | null>;
  save(rootUrl: string, graph: KnowledgeGraph): Promise<void>;
}
```

### `FileSystemCacheProvider`

The default Node.js cache provider, which stores the cache on the local file system.

#### `new FileSystemCacheProvider(cacheDir?: string)`

- `cacheDir` (optional, default: `.cache`): The directory to store the cache in.

### `BrowserCacheProvider`

The default Browser cache provider, which uses the Cache API to store the cache.

#### `new BrowserCacheProvider()`

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

[MIT](./LICENSE)