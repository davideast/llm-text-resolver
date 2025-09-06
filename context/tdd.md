Of course. Here is the complete testing plan for the `llm-txt-resolver` library, incorporating the decisions to use native `fetch` and a heuristic-based content extraction model.

***

## `llm-txt-resolver` - Complete Testing Plan

### 1. Introduction & Strategy

This document outlines the test cases required to validate the functionality, robustness, and efficiency of the `llm-txt-resolver` library. The strategy follows a Test-Driven Development (TDD) approach, starting with unit tests for isolated components and building up to full integration and edge-case tests.

* **Testing Framework:** vitest
* **HTTP Mocking:** `superagent`

---

### 2. Unit Tests

These tests verify that each individual component works correctly in isolation.

#### 2.1 Internal `httpClient` (Wrapper for `fetch`)

* **Given:** A URL that returns a valid JSON response.
* **When:** The `httpClient` is called.
* **Then:** It should return the parsed JSON object.

* **Given:** A URL that returns a `404 Not Found` error.
* **When:** The `httpClient` is called.
* **Then:** It must throw a custom `HttpError`, and the promise should reject.

* **Given:** A request that is configured to time out.
* **When:** The `httpClient` is called.
* **Then:** It must throw an error related to the `AbortSignal`.

#### 2.2 `HtmlProcessor`

* **Given:** An HTML string with a `<title>` tag.
* **When:** The processor is run.
* **Then:** It correctly extracts the title text.

* **Given:** An HTML string with absolute, relative, and root-relative links.
* **When:** The processor is run.
* **Then:** It correctly resolves and returns an array of absolute URLs.

* **Given:** HTML containing a `<main>` tag.
* **When:** The processor extracts content.
* **Then:** The `cleanContent` must only contain text from within the `<main>` element.

* **Given:** HTML with no `<main>` but an `<article>` tag.
* **When:** The processor extracts content.
* **Then:** The `cleanContent` must only contain text from within the `<article>` element.

* **Given:** HTML with no priority containers.
* **When:** The processor extracts content.
* **Then:** The `cleanContent` must be the text from the entire `<body>`.

#### 2.3 `MarkdownProcessor`

* **Given:** A Markdown string.
* **When:** The processor is run.
* **Then:** It correctly extracts all `[text](link)` style links.
* **Then:** It correctly identifies the first H1 (`# Title`) as the document title.

#### 2.4 `KnowledgeGraph` Class

* **Given:** A pre-populated `KnowledgeGraph` instance.
* **When:** The `.getFlattenedContent()` method is called.
* **Then:** It must return a single string with the content of all nodes concatenated in the correct Breadth-First Search (BFS) order.

---

### 3. Integration Tests (`Resolver` Class)

These tests validate the end-to-end functionality, using `nock` to mock the network.

#### 3.1 Core Functionality

* **Given:** A single mock HTML page.
* **When:** `resolver.resolve()` is called.
* **Then:** The returned `graph` contains one node and the `content` is correct.

* **Given:** A site structure (A -> B, A -> C) and a `Resolver` with `depth: 2`.
* **When:** `resolver.resolve()` is called on page A.
* **Then:** The final `graph` contains three nodes, and the `content` is a combination of all three.

* **Given:** A deep path (A -> B -> C) and a `Resolver` with `depth: 1`.
* **When:** `resolver.resolve()` is called on page A.
* **Then:** The `graph` contains nodes for A and B only, and no request is ever made for page C.

#### 3.2 Caching Logic

* **Given:** A `Resolver` configured with a cache.
* **When:** `resolve()` is run twice, with the server returning `304 Not Modified` on the second run.
* **Then:** The second run must only make `HEAD` requests (not `GET`) and produce identical output.

* **Given:** A `Resolver` configured with a cache.
* **When:** `resolve()` is run twice, but one file has changed (server returns `200 OK` for it).
* **Then:** The second run must make a `HEAD` request for all files but a `GET` request for only the changed file.

---

### 4. Edge Case & Error Handling Tests

These tests ensure the library is robust against failures and tricky scenarios.

* **Given:** A circular link structure (A -> B -> A).
* **When:** `resolver.resolve()` is called.
* **Then:** The process must complete successfully without an infinite loop.

* **Given:** A page that links to a URL that returns a `404` error.
* **When:** `resolver.resolve()` is called.
* **Then:** The process completes, and the corresponding `GraphNode` is marked with `status: 'error'`.

* **Given:** The initial root URL returns a `404` error.
* **When:** `resolver.resolve()` is called.
* **Then:** The promise must reject with a clear error message.