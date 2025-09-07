import { describe, it, expect } from 'vitest';
import { HtmlProcessor } from '../src/html_processor.js';

describe('HtmlProcessor', () => {
  const processor = new HtmlProcessor();
  const BASE_URL = 'http://example.com';

  it('should extract the title from the <head> tag', () => {
    const html = '<html><head><title>Test Title</title></head><body>Content</body></html>';
    const { title } = processor.process({ html, baseUrl: BASE_URL });
    expect(title).toBe('Test Title');
  });

  it('should correctly resolve valid links and convert them to Markdown', () => {
    const html = `
      <a href="/page">Page</a>
      <a href="javascript:alert('bad')">Invalid JS Link</a>
      <a href="#">Anchor Link</a>
    `;
    const { links, cleanContent } = processor.process({ html, baseUrl: BASE_URL });
    expect(links).toEqual(['http://example.com/page']);
    expect(cleanContent).toBe('[Page](/page) Invalid JS Link Anchor Link');
  });

  it('should unwrap structural tags and convert their content to Markdown', () => {
    const html = '<body><main><h1>Title</h1><div><p>Content.</p></div></main></body>';
    const { cleanContent } = processor.process({ html, baseUrl: BASE_URL });
    expect(cleanContent).toBe('# Title\n\nContent.');
  });

  it('should completely remove non-content tags', () => {
    const html = `
      <p>Real content.</p>
      <script>alert('hello');</script>
      <style>.red { color: red; }</style>
    `;
    const { cleanContent } = processor.process({ html, baseUrl: BASE_URL });
    expect(cleanContent).toBe('Real content.');
  });

  it('should strip non-allowed attributes and convert to Markdown', () => {
    const html = '<p style="color: red;" class="text">Styled</p><a href="/safe" onclick="alert(1)">Link</a>';
    const { cleanContent, links } = processor.process({ html, baseUrl: BASE_URL });
    expect(cleanContent.replace(/\s+/g, ' ')).toBe('Styled [Link](/safe)');
    expect(links).toEqual(['http://example.com/safe']);
  });

  it('should handle complex nested structures and produce clean Markdown', () => {
    const html = `
      <body>
        <header><h1>Site Title</h1><nav><ul><li>Home</li></ul></nav></header>
        <article>
          <h2>Article Title</h2>
          <p>This is the <strong>first</strong> paragraph with <em>more</em> text.</p>
        </article>
      </body>
    `;
    const { cleanContent } = processor.process({ html, baseUrl: BASE_URL });
    const expected = `# Site Title

* Home

## Article Title

This is the **first** paragraph with *more* text.`;
    expect(cleanContent.replace(/\s+/g, ' ')).toBe(expected.replace(/\s+/g, ' '));
  });
});
