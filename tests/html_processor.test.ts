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

  it('should correctly resolve and extract valid links while discarding invalid ones', () => {
    const html = `
      <a href="http://example.com/absolute">Absolute</a>
      <a href="/relative">Relative</a>
      <a href="page.html">Page</a>
      <a href="javascript:alert('bad')">Invalid JS Link</a>
      <a href="#">Anchor Link</a>
    `;
    const { links, cleanContent } = processor.process({ html, baseUrl: BASE_URL });
    expect(links).toEqual([
      'http://example.com/absolute',
      'http://example.com/relative',
      'http://example.com/page.html',
    ]);
    // Check that the text from invalid links is preserved
    expect(cleanContent).toContain('Invalid JS Link');
    expect(cleanContent).toContain('Anchor Link');
  });

  it('should unwrap non-allowed tags like <div> and <span>, preserving content', () => {
    const html = '<body><div><p>Content inside a div.</p></div><span> More text.</span></body>';
    const { cleanContent } = processor.process({ html, baseUrl: BASE_URL });
    expect(cleanContent).toBe('Content inside a div. More text.');
  });

  it('should strip all attributes except for those on the allowlist', () => {
    const html = '<p style="color: red;" class="text">Styled</p><a href="/safe" onclick="alert(1)">Link</a>';
    const { cleanContent, links } = processor.process({ html, baseUrl: BASE_URL });
    expect(cleanContent).toBe('Styled Link');
    expect(links).toEqual(['http://example.com/safe']);
  });

  it('should handle complex nested structures and produce clean text', () => {
    const html = `
      <body>
        <header><h1>Site Title</h1><nav><ul><li>Home</li></ul></nav></header>
        <main>
          <h2>Article Title</h2>
          <div>
            <p>This is the <strong>first</strong> paragraph.</p>
            <span>And this is <em>more</em> text.</span>
          </div>
        </main>
      </body>
    `;
    const { cleanContent } = processor.process({ html, baseUrl: BASE_URL });
    // Note: header and nav are block elements, so cheerio might add whitespace
    expect(cleanContent.replace(/\s+/g, ' ')).toBe('Site Title Home Article Title This is the first paragraph. And this is more text.');
  });

  it('should remove script, style, and other disruptive tags completely', () => {
    const html = `
      <iframe src="tracker.html"></iframe>
      <style>.red { color: red; }</style>
      <script>alert('hello');</script>
      <p>This is the real content.</p>
      <form><input type="text" /></form>
    `;
    const { cleanContent } = processor.process({ html, baseUrl: BASE_URL });
    expect(cleanContent).toBe('This is the real content.');
  });
});
