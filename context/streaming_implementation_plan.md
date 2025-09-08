# Streaming Implementation Plan

This document outlines the step-by-step plan to refactor the `Resolver` class to support streaming output, based on the designs in `streaming_architecture.md` and `tdd.md`. The primary goal is to introduce a streaming-first API while maintaining 100% backward compatibility with the existing promise-based method.

### Phase 1: Create a New Git Branch

Isolate all work on a new feature branch to follow the project's Git strategy.

1.  **Create Branch:**
    ```bash
    git checkout -b feat/streaming-resolver
    ```

### Phase 2: Refactor Core Logic into an Async Generator

The first step is to decouple the core crawling logic from the result aggregation. We will move the existing `while` loop into a private `async*` generator method.

1.  **Create `_resolveGenerator`:**
    *   In `src/resolver.ts`, create a new private method: `private async* _resolveGenerator(rootUrl: string): AsyncGenerator<{node: GraphNode, newGraph: KnowledgeGraph}>`.
    *   Move the entire crawling logic (the `while` loop, queue, and visited set) from the public `resolve` method into this new generator.
2.  **Yield Processed Nodes:**
    *   Inside the `while` loop, immediately after a node is successfully fetched and processed, `yield` the `node` object. This makes the processed data available to the consumer instantly.
    *   The generator will also continue to build the `newGraph` object internally.
3.  **Return the Final Graph:**
    *   After the `while` loop completes, the generator will `return newGraph`. This allows the final, complete graph to be accessed once the iteration is finished.
4.  **Cache Management:**
    *   The logic for loading the old graph from cache will remain at the beginning of the generator.
    *   The logic for saving the new graph to the cache will be handled by the consumer of the generator (the public `resolve` method) after the generator is fully consumed.

### Phase 3: Adapt the Public `resolve` Method

The public `resolve` method will become a dispatcher, directing to either a streaming or a buffered response based on user options.

1.  **Update Method Signature:**
    *   Modify the `resolve` method signature to support overloads for both streaming and promise-based returns, as defined in `streaming_architecture.md`.
    *   It will accept an optional `options` object with a `stream: boolean` property, which defaults to `false`.

2.  **Implement Streaming Path (Opt-in):**
    *   If `stream` is `true`, the method will:
        *   Create a `ReadableStream` that wraps the `_resolveGenerator`.
        *   The stream's `pull` controller will call the generator's `next()` method.
        *   For each yielded `node`, it will enqueue the `node.cleanContent` into the stream.
        *   When the generator is done, it will save the final graph to the cache and then close the stream.
        *   Return the `ReadableStream<string>`.

3.  **Implement Buffered Path (Default):**
    *   If `stream` is `false` (or options are omitted), the method will:
        *   Create an empty `content` string and get an iterator from `_resolveGenerator`.
        *   Use a `for await...of` loop to iterate through all yielded nodes from the generator, concatenating each `node.cleanContent` into the `content` string.
        *   After the loop, retrieve the final `graph` from the generator's return value.
        *   Save the final graph to the cache.
        *   Return a `Promise` that resolves with the original `{ content, graph }` object.

### Phase 4: Update and Extend the Test Suite

We will follow the TDD plan to validate both the new streaming functionality and the legacy promise-based mode.

1.  **Create New Test File:**
    *   Create `tests/resolver.streaming.test.ts` to keep the new tests organized.
2.  **Write Streaming Tests:**
    *   Write a test that calls `resolve(url)` with no options.
    *   Create a helper function to consume the entire stream into a single string.
    *   Assert that the concatenated string from the stream matches the expected output.
3.  **Write Backward Compatibility Tests:**
    *   Write a test that calls `resolve(url, { stream: false })`.
    *   `await` the promise and assert that the structure and content of the returned `{ content, graph }` object are correct.
4.  **Test Edge Cases:**
    *   Validate that a crawl with a `404` error partway through still streams the content of the successful pages correctly before closing.
    *   Ensure that resolving a URL that immediately fails results in a properly rejected promise (for buffered mode) or an errored stream (for streaming mode).
