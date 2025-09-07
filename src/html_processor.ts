import * as cheerio from 'cheerio';
import { URL } from 'url';

// Use a Set for efficient tag lookups
const ALLOWED_TAGS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'a',
  'ul', 'ol', 'li',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'strong', 'em', 'b', 'i', 'u', 'code', 'pre', 'blockquote'
]);

// Use a Map for tag-specific attribute allowlists
const ALLOWED_ATTRS = new Map<string, Set<string>>([
  ['a', new Set(['href'])]
]);

export class HtmlProcessor {
  process(options: { html: string; baseUrl: string }): { title: string; links: string[]; cleanContent: string } {
    const { html, baseUrl } = options;
    const $ = cheerio.load(html);

    const title = $('title').first().text().trim();

    // 1. Unwrap non-content block tags, but keep their content
    $('nav, aside, header, footer, form, main, article').each((i, el) => {
      $(el).replaceWith($(el).contents());
    });

    // 2. Aggressively remove non-content tags and their children completely
    $('script, style, iframe, noscript, template, slot, meta, link').remove();

    // 2. Sanitize remaining tags and attributes based on an allowlist
    $('body *').each((index, element) => {
      const el = $(element);
      const tagName = el.prop('tagName')?.toLowerCase();

      if (!tagName || !ALLOWED_TAGS.has(tagName)) {
        el.replaceWith(el.contents());
        return;
      }

      const attrs = { ...el.attr() };
      const allowedAttrsForTag = ALLOWED_ATTRS.get(tagName);

      for (const attrName in attrs) {
        if (!allowedAttrsForTag || !allowedAttrsForTag.has(attrName)) {
          el.removeAttr(attrName);
        }
      }
    });

    // 3. Sanitize links after other attributes are stripped
    $('a').each((index, element) => {
      const el = $(element);
      const href = el.attr('href');
      if (href) {
        const trimmedHref = href.trim();
        const lowerHref = trimmedHref.toLowerCase();
        if (lowerHref.startsWith('javascript:') || trimmedHref.startsWith('#')) {
          el.replaceWith(el.contents());
        }
      }
    });

    // 4. Extract valid links after sanitization
    const links: string[] = [];
    $('a[href]').each((i, link) => {
      const href = $(link).attr('href');
      if (href) {
        try {
          const absoluteUrl = new URL(href, baseUrl).href;
          links.push(absoluteUrl);
        } catch (error) {
          // Ignore invalid URLs
        }
      }
    });

    // 5. Extract the final clean content from the sanitized body
    // Add spaces around block-level elements to prevent words from mashing together
    $('p, h1, h2, h3, h4, h5, h6, li, pre, blockquote, th, td').each((i, el) => {
      $(el).prepend(' ').append(' ');
    });
    const cleanContent = $('body').text().replace(/\s\s+/g, ' ').trim();

    return { title, links, cleanContent };
  }
}