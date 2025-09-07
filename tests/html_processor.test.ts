import { describe, it, expect } from 'vitest';
import { HtmlProcessor } from '../src/html_processor.js';

describe('HtmlProcessor', () => {
  const processor = new HtmlProcessor();

  it('should extract the title from an HTML string', () => {
    const html = '<html><head><title>Test Title</title></head><body></body></html>';
    const { title } = processor.process(html, 'http://example.com');
    expect(title).toBe('Test Title');
  });

  it('should extract all absolute, relative, and root-relative links', () => {
    const html = `
      <html>
        <body>
          <a href="http://example.com/absolute">Absolute</a>
          <a href="/relative">Relative</a>
          <a href="page.html">Root-relative</a>
        </body>
      </html>
    `;
    const { links } = processor.process(html, 'http://example.com');
    expect(links).toEqual([
      'http://example.com/absolute',
      'http://example.com/relative',
      'http://example.com/page.html',
    ]);
  });

  it('should extract content from the <main> tag if it exists', () => {
    const html = '<html><body><main>Main content</main><aside>Sidebar</aside></body></html>';
    const { cleanContent } = processor.process(html, 'http://example.com');
    expect(cleanContent).toBe('Main content');
  });

  it('should extract content from the <article> tag if <main> does not exist', () => {
    const html = '<html><body><article>Article content</article><footer>Footer</footer></body></html>';
    const { cleanContent } = processor.process(html, 'http://example.com');
    expect(cleanContent).toBe('Article content');
  });

  it('should extract content from the <body> if no priority containers exist', () => {
    const html = '<html><body>Body content<script>console.log("test")</script></body></html>';
    const { cleanContent } = processor.process(html, 'http://example.com');
    expect(cleanContent).toBe('Body content');
  });

  it('should remove script, style, and iframe tags', () => {
    const html = `
      <html>
        <body>
          <iframe src="tracker.html"></iframe>
          <style>.red { color: red; }</style>
          <script>alert('hello');</script>
          <p>This is the real content.</p>
        </body>
      </html>
    `;
    const { cleanContent } = processor.process(html, 'http://example.com');
    expect(cleanContent).toBe('This is the real content.');
  });
});