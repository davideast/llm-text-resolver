import { describe, it, expect } from 'vitest';
import { MarkdownProcessor } from '../src/markdown_processor.js';

describe('MarkdownProcessor', () => {
  const processor = new MarkdownProcessor();

  it('should extract the title from a markdown string', () => {
    const markdown = '# Test Title';
    const { title } = processor.process({ markdown, baseUrl: 'http://example.com' });
    expect(title).toBe('Test Title');
  });

  it('should extract all links from a markdown string', () => {
    const markdown = `[Absolute](http://example.com/absolute)
[Relative](/relative)
[Root-relative](page.html)`;
    const { links } = processor.process({ markdown, baseUrl: 'http://example.com' });
    expect(links).toEqual([
      'http://example.com/absolute',
      'http://example.com/relative',
      'http://example.com/page.html',
    ]);
  });

  it('should strip markdown syntax for cleanContent', () => {
    const markdown = '# Title\n\nThis is a paragraph with a [link](http://example.com).';
    const { cleanContent } = processor.process({ markdown, baseUrl: 'http://example.com' });
    expect(cleanContent).toBe('Title\n\nThis is a paragraph with a link.');
  });

  it('should include code blocks in cleanContent', () => {
    const markdown = 'Here is some code:\n\n```javascript\nconst x = 1;\n```';
    const { cleanContent } = processor.process({ markdown, baseUrl: 'http://example.com' });
    expect(cleanContent).toContain('const x = 1;');
  });
});