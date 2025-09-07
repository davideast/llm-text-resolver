## Technical Design: `llm-txt-resolver`

### 1. Introduction & Goals

This document outlines the technical design for `llm-txt-resolver`, a Node.js library for aggregating web content into a consolidated, LLM-ready context.

The primary goals of this design are:

  * **Modularity:** Create a decoupled architecture where crawling, processing, and caching are distinct, replaceable components.
  * **Efficiency:** Minimize network requests and redundant processing through an intelligent caching strategy.
  * **Extensibility:** Ensure the system can be easily expanded with new features (e.g., semantic chunking) without major refactoring.

### 2. Core Data Structures

The entire system is built around a central, in-memory graph representation of the crawled website.

#### 2.1 `GraphNode`

A `GraphNode` represents a single, unique document (URL) in the system. It is the atomic unit of the `KnowledgeGraph`.

```typescript
// Interface for a single document node
interface GraphNode {
  // --- Core Identifiers ---
  id: string; // The canonical, absolute URL of the document.
  title: string | null; // The extracted document title (<title> or H1).

  // --- Crawl & Processing Metadata ---
  status: 'pending' | 'fetching' | 'processing' | 'completed' | 'error';
  depth: number; // 0 for the root, 1 for its children, etc.
  mimeType: string | null; // e.g., 'text/html', 'text/markdown'.
  error: string | null; // Stores error message if status is 'error'.

  // --- Content Payloads ---
  rawContent: string | null; // The original, unmodified content.
  cleanContent: string | null; // Boilerplate-free text content.

  // --- Graph Structure (Edges) ---
  links: {
    text: string; // Anchor text of the link.
    targetId: string; // The resolved absolute URL of the link target.
  }[];

  // --- Caching & Change Detection ---
  eTag: string | null; // From the 'ETag' HTTP header.
  lastModified: string | null; // From the 'Last-Modified' header.
  contentHash: string | null; // SHA-256 hash of rawContent.
}
```

#### 2.2 `KnowledgeGraph`

The `KnowledgeGraph` is the container for the entire state of a crawl. It holds all `GraphNode` objects and provides methods to access the processed data.

```typescript
// The main graph structure
class KnowledgeGraph {
  public rootId: string;
  public nodes: Map<string, GraphNode>; // Map<URL, GraphNode> for O(1) lookups.

  // Methods to generate final outputs
  getFlattenedContent(strategy: 'bfs' | 'dfs' = 'bfs'): string;
  getAsciiVisual(): string;
  toJson(): string;
}
```

### 3. Architecture & Control Flow

The `Resolver` class orchestrates the crawl using an asynchronous Breadth-First Search (BFS) algorithm. This ensures that the `depth` limit is naturally respected.

#### 3.1 The `resolve()` Method Flow

1.  **Initialization:**

      * A new `KnowledgeGraph` instance is created.
      * The `CacheProvider` attempts to load a previously saved `KnowledgeGraph` (the cache).
      * A queue is initialized with the root URL at `depth: 0`.

2.  **Crawl Loop:** The loop continues as long as the queue is not empty.

      * **Dequeue:** A URL is taken from the front of the queue.
      * **Check Visited:** If the URL has already been processed in this run, skip.
      * **Check Depth:** If the node's depth exceeds the configured limit, skip.
      * **Cache Check (The Efficiency Core):**
          * Look up the URL in the cached graph from the previous run.
          * If found, perform a `HEAD` request with the cached `ETag` and `Last-Modified` headers.
          * If the server responds with `304 Not Modified`, the cached `GraphNode` is copied to the new graph, and the process for this URL ends. **No download or processing occurs.**
      * **Fetch & Process:**
          * If no cache hit, a full `GET` request is made.
          * The response content is passed to the **`Processor` Pipeline**.
          * The pipeline populates the `GraphNode` with `cleanContent`, `title`, `links`, and caching headers.
          * A hash of the `rawContent` is calculated and stored.
      * **Enqueue Children:** All newly discovered `links` from the processed node are added to the back of the queue with their `depth` incremented.

3.  **Finalization:**

      * Once the queue is empty, the populated `KnowledgeGraph` is used to generate the final `content` string.
      * The new graph is saved via the `CacheProvider` for the next run.
      * The `{ content, graph }` object is returned.

#### 3.2 Key Abstractions

  * **`Processor` Pipeline:** A series of modules that transform a `GraphNode`. The core engine will iterate through registered processors, and for each one that `supports` the node's `mimeType`, it will execute its `process` method.

      * **`HtmlProcessor`:** Uses `cheerio` to parse HTML, `Readability.js` to extract `cleanContent`, and extracts all `<a>` tags for `links`.
      * **`MarkdownProcessor`:** Uses `marked` to find links and strips markdown syntax for `cleanContent`.

  * **`CacheProvider`:** A simple interface for persistence.

    ```typescript
    interface CacheProvider {
      load(sourceId: string): Promise<KnowledgeGraph | null>;
      save(sourceId: string, graph: KnowledgeGraph): Promise<void>;
    }
    ```

    The default `FileSystemCacheProvider` will save the graph as a JSON file in a `.cache/` directory, keyed by a hash of the root URL.

### 4. Public API Design

The library exposes a single class, `Resolver`.

```typescript
// Main entry point for the library
class Resolver {
  constructor(options?: {
    depth?: number;
    cacheProvider?: CacheProvider;
    processors?: Processor[];
  });

  async resolve(rootUrl: string): Promise<{
    content: string; // The final flattened text content.
    graph: KnowledgeGraph; // The complete knowledge graph object.
  }>;
}
```

### 5. Error Handling & Edge Cases

  * **Network Errors:** Any non-2xx HTTP response will result in the node's `status` being set to `error` with the status code in the `error` message. The crawl will continue with other queued URLs.
  * **Crawl Loops:** The "Check Visited" step in the control flow inherently prevents infinite loops by ensuring each URL is processed only once per run.
  * **Parsing Errors:** Processors should be wrapped in `try/catch` blocks. A failure to parse a document will mark its node as `error` but will not crash the entire process.

### 6. Dependencies

  * **HTTP Client:** Native `fetch`
  * **HTML Parsing:** `cheerio` (fast, server-side jQuery-like API).
  * **Markdown Parsing:** `marked` (fast and extensible).
  * **Hashing:** Node.js native `crypto` module for SHA-256.

Of course. Here is a new section for the TDD detailing the test cases required to validate the library.

***

### 7. Test Cases & Validation Strategy

The library's validity will be determined by a comprehensive suite of unit, integration, and edge-case tests. A mock HTTP server (e.g., `nock`) will be used for all tests involving network requests to ensure fast, reliable, and deterministic results.

#### 7.1 Unit Tests

Unit tests will focus on individual components in isolation to verify their specific logic.

* **`HtmlProcessor`**
    * **Given:** A simple HTML string.
    * **Then:** It correctly extracts the `<title>` tag content.
    * **Then:** It correctly extracts all absolute (`http://...`), relative (`/about`), and root-relative (`/page.html`) links.
    * **Then:** It correctly uses `Readability.js` to extract only the main article text, excluding headers, footers, and sidebars.

* **`MarkdownProcessor`**
    * **Given:** A Markdown string with various link types.
    * **Then:** It correctly extracts all `[text](link)` style links.
    * **Then:** It identifies the first H1 (`# Title`) as the document title.

* **`KnowledgeGraph`**
    * **Given:** A pre-populated `KnowledgeGraph` instance with 3 nodes added in a specific order.
    * **Then:** The `.getFlattenedContent()` method correctly concatenates the `cleanContent` of each node in BFS order.

#### 7.2 Integration Tests

Integration tests will validate the end-to-end functionality of the `Resolver` class.

* **Basic Crawl**
    * **Given:** A mock server with three pages (A -> B, A -> C) and a `Resolver` with `depth: 2`.
    * **When:** `resolver.resolve()` is called on page A.
    * **Then:** The returned `graph` contains exactly three `GraphNode` objects.
    * **Then:** The returned `content` is the concatenated `cleanContent` of pages A, B, and C.

* **Depth Limiting**
    * **Given:** A mock server with a deep path (A -> B -> C) and a `Resolver` with `depth: 1`.
    * **When:** `resolver.resolve()` is called on page A.
    * **Then:** The returned `graph` contains only nodes for A and B. Node C should not be present.

* **Caching (`ETag` `304 Not Modified`)**
    * **Given:** A configured `Resolver` with a file system cache.
    * **When:** `resolver.resolve()` is called for the **first time**.
    * **Then:** The mock server receives `GET` requests for all resources.
    * **When:** `resolver.resolve()` is called a **second time** on the same URL, and the server is mocked to return `304 Not Modified`.
    * **Then:** The mock server should **not** receive any `GET` requests, only `HEAD` requests. The final output must be identical to the first run.

* **Caching (Content Hash Fallback)**
    * **Given:** A mock server that does **not** provide `ETag` headers.
    * **When:** `resolver.resolve()` is run twice, with the second run providing identical content.
    * **Then:** `GET` requests are made in both runs, but the internal processor for the unchanged content should be skipped due to a matching `contentHash`.

#### 7.3 Edge Case Tests

These tests ensure the library is robust against unexpected inputs and failures.

* **Circular Dependency**
    * **Given:** A mock server where page A links to page B, and page B links back to page A.
    * **When:** `resolver.resolve()` is called.
    * **Then:** The process must complete successfully without entering an infinite loop. The final graph should contain exactly two nodes.

* **Network Errors (`404 Not Found`)**
    * **Given:** A mock server where page A links to page B, but page B returns a `404` error.
    * **When:** `resolver.resolve()` is called on page A.
    * **Then:** The process completes successfully.
    * **Then:** The `GraphNode` for page B should have `status: 'error'` and a corresponding error message. The final `content` should not include anything from page B.

* **Initial Root URL Failure**
    * **Given:** A root URL that returns a `404` error.
    * **When:** `resolver.resolve()` is called.
    * **Then:** The promise should reject with a clear and informative error message.