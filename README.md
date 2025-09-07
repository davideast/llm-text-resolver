# llm-txt-resolver

> Aggregating web content into a consolidated, LLM-ready context.

`llm-txt-resolver` is a tool for crawling an `llms.txt`, html page, or markdown document and aggregating connected links into a single clean text block.

- ADD STREAMING

## Features

- **Recursive Crawling**: Traverses a document by following links, up to a configurable depth.
- **Content Extraction**: Intelligently extracts the main content from html and markdown pages.
- **Caching**: Caches content to speed up subsequent runs and reduce network requests.
- **Knowledge Graph**: Builds a graph of the site's structure, which can be used for further analysis.

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
import { Resolver } from 'llm-txt-resolver';

const resolver = new Resolver();
const { content, graph } = await resolver.resolve('https://firebase.google.com/docs/ai-logic/llms.txt');

console.log('--- Aggregated Content ---');
console.log(content);

console.log('--- Knowledge Graph ---');
console.log(graph);
```

## API Reference

### `Resolver`

The main class for resolving web content.

#### `new Resolver(options?: ResolverOptions)`

Creates a new `Resolver` instance.

- `options` (optional): An object with the following properties:
  - `depth` (optional, default: `2`): The maximum depth to crawl.
  - `cacheProvider` (optional, default: `new FileSystemCacheProvider()`): An instance of a class that implements the `CacheProvider` interface.

#### `resolve(rootUrl: string): Promise<{ content: string; graph: KnowledgeGraph }>`

Starts the crawling process from the given `rootUrl`.

- `rootUrl`: The URL to start crawling from.
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

The default cache provider, which stores the cache on the local file system.

#### `new FileSystemCacheProvider(cacheDir?: string)`

- `cacheDir` (optional, default: `.cache`): The directory to store the cache in.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

[MIT](./LICENSE)