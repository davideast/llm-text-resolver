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

  it('should correctly resolve valid links and preserve text from invalid ones', () => {
    const html = `
      <a href="/page">Page</a>
      <a href="javascript:alert('bad')">Invalid JS Link</a>
      <a href="#">Anchor Link</a>
    `;
    const { links, cleanContent } = processor.process({ html, baseUrl: BASE_URL });
    expect(links).toEqual(['http://example.com/page']);
    expect(cleanContent).toBe('Page Invalid JS Link Anchor Link');
  });

  it('should unwrap structural tags like <div>, <span>, and <main>', () => {
    const html = '<body><main><h1>Title</h1><div><p>Content.</p></div></main></body>';
    const { cleanContent } = processor.process({ html, baseUrl: BASE_URL });
    expect(cleanContent).toBe('Title Content.');
  });

  it('should completely remove tags like <script>, <style>, and <form>', () => {
    const html = `
      <p>Real content.</p>
      <script>alert('hello');</script>
      <style>.red { color: red; }</style>
      <form><input type="text" /></form>
    `;
    const { cleanContent } = processor.process({ html, baseUrl: BASE_URL });
    expect(cleanContent).toBe('Real content.');
  });

  it('should strip all attributes except for those on the allowlist', () => {
    const html = '<p style="color: red;" class="text">Styled</p><a href="/safe" onclick="alert(1)">Link</a>';
    const { cleanContent, links } = processor.process({ html, baseUrl: BASE_URL });
    expect(cleanContent).toBe('Styled Link');
    expect(links).toEqual(['http://example.com/safe']);
  });

  it('should handle complex nested structures and produce clean, readable text', () => {
    const html = `
      <body>
        <header><h1>Site Title</h1><nav><ul><li>Home</li></ul></nav></header>
        <article>
          <h2>Article Title</h2>
          <div>
            <p>This is the <strong>first</strong> paragraph.</p>
            <span>And this is <em>more</em> text.</span>
          </div>
        </article>
      </body>
    `;
    const { cleanContent } = processor.process({ html, baseUrl: BASE_URL });
    expect(cleanContent).toBe('Site Title Home Article Title This is the first paragraph. And this is more text.');
  });
});