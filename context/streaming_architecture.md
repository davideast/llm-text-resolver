# Technical Design: Streaming Architecture

### 1. Introduction & Goals

This document outlines a significant architectural refactor for `llm-txt-resolver`. The current implementation aggregates all web content into an in-memory buffer before returning the final result. While simple, this approach is memory-intensive and can lead to high latency for large websites.

The primary goal of this refactor is to transition to a **streaming-first architecture**. This will provide two key benefits:

*   **Low Memory Footprint:** Content will be processed and passed to the consumer in small chunks, avoiding the need to buffer the entire site's content in memory.
*   **Low Time-To-First-Output:** The consumer will start receiving content as soon as the very first page is processed, making the library feel significantly more responsive.

The core technology for this change will be the **Web Streams API** (`ReadableStream`), chosen for its universal availability in both modern Node.js and browser environments, ensuring the library remains a single, cross-compatible codebase.

### 2. Public API Redesign (A Dual-Mode Approach)

To provide maximum flexibility for library consumers, the `resolve` method will be redesigned to support both streaming and the original promise-based (buffered) output. This is a **breaking change** for the default behavior but provides a clear path for existing usage.

#### 2.1 `resolve` Method Overloads

The `resolve` method will be overloaded to handle two distinct use cases:

```typescript
// Overload 1: The new default, for streaming output.
resolve(rootUrl: string): ReadableStream<string>;

// Overload 2: The classic, buffered result for convenience.
resolve(rootUrl: string, options: { stream: false }): Promise<{ content: string; graph: KnowledgeGraph }>;

// The internal implementation signature that covers both.
resolve(
  rootUrl: string,
  options?: { stream?: boolean }
): ReadableStream<string> | Promise<{ content: string; graph: KnowledgeGraph }>;
```

*   **Default to Streaming:** Calling `resolver.resolve(url)` will default to the streaming behavior, encouraging the most efficient usage pattern.
*   **Opt-in for Promise:** A consumer must explicitly pass `{ stream: false }` to receive the buffered promise. This makes buffering a conscious choice.
*   **Backward Compatibility:** The promise-based return type remains identical to the original API, ensuring a simple migration path.

### 3. Implementation Strategy (Hybrid Generator & Stream)

To achieve the best developer experience internally and the most powerful API externally, we will use a hybrid approach. The core crawling logic will be written as a clean, simple **async generator**, which will then be wrapped in a **`ReadableStream`** for the public API.

#### 3.1 Private `_crawler` Async Generator

The complex, stateful logic of crawling will be encapsulated in a private async generator.

*   **Signature:** `private async* _crawler(rootUrl: string): AsyncGenerator<string>`
*   **Responsibilities:**
    *   It will contain the primary `while` loop and queueing mechanism for the breadth-first search.
    *   It will handle all fetching, processing, and cache-checking logic.
    *   As each page's `cleanContent` is successfully generated, it will **`yield`** the content as a string chunk.
    *   It will build the `KnowledgeGraph` in memory as it runs, but it will not wait for the graph to be complete before yielding content.

This approach makes the core logic much easier to read and reason about compared to manually managing a stream controller.

#### 3.2 Public `resolve` Method Wrapper

The public `resolve` method becomes a lightweight dispatcher that adapts the internal generator to the desired output format.

1.  It will first call the `_crawler(rootUrl)` generator to get an async iterator.
2.  **If `stream: false` is requested:**
    *   It will `for await...of` loop over the iterator, concatenating all the yielded chunks into a single `content` string.
    *   It will wait for the final `KnowledgeGraph` to be built.
    *   It will return a `Promise` that resolves with the complete `{ content, graph }` object.
3.  **If streaming is requested (default):**
    *   It will wrap the async iterator in a `new ReadableStream({...})`.
    *   The stream's `pull` method will simply call `iterator.next()` and enqueue the result, seamlessly bridging the generator's output to the stream consumer.
    *   This provides the consumer with the full power of the Web Streams API, including backpressure, piping (`.pipeTo()`), and cancellation.

### 4. Caching & State Management

The `KnowledgeGraph` remains a critical internal component.

*   It will still be built in memory during the crawl, in parallel with the streaming output.
*   It is essential for the cache-checking logic (using `ETag` and `Last-Modified` headers) to prevent re-fetching unchanged content.
*   At the end of a successful crawl, the complete graph will be passed to the `CacheProvider` to be saved, just as it is now.

### 5. Test Cases & Validation Strategy

The existing test suite will be refactored and extended to validate both modes of the new API.

*   **Streaming Tests (Node.js & Browser):**
    *   A test utility (`streamToString`) will be created to consume a `ReadableStream` and buffer its result for assertion.
    *   Tests will call `resolver.resolve(url)`, consume the stream with the utility, and then assert that the final concatenated string is correct.
    *   This validates the default, universal streaming path.

*   **Promise-Mode Tests (Node.js & Browser):**
    *   New tests will be added that call `resolver.resolve(url, { stream: false })`.
    *   These tests will `await` the returned promise.
    *   They will assert that the resolved object is correctly structured (`{ content, graph }`) and that its payload is accurate.
    *   This validates the opt-in buffered mode.

### 6. Dependencies

This refactor requires **no new external dependencies**. The Web Streams API and async generators are standard, built-in features of modern JavaScript environments.
