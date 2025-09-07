import * as cheerio from 'cheerio';
import { URL } from 'url';

type SanitizeAction = 'keep' | 'unwrap' | 'remove';

// A unified map to define the action for each tag.
// This is the core of the allowlist strategy.
const SANITIZATION_MAP = new Map<string, SanitizeAction>([
  // Keep: Core content tags
  ['h1', 'keep'], ['h2', 'keep'], ['h3', 'keep'], ['h4', 'keep'], ['h5', 'keep'], ['h6', 'keep'],
  ['p', 'keep'], ['a', 'keep'],
  ['ul', 'keep'], ['ol', 'keep'], ['li', 'keep'],
  ['table', 'keep'], ['thead', 'keep'], ['tbody', 'keep'], ['tr', 'keep'], ['th', 'keep'], ['td', 'keep'],
  ['strong', 'keep'], ['em', 'keep'], ['b', 'keep'], ['i', 'keep'], ['u', 'keep'],
  ['code', 'keep'], ['pre', 'keep'], ['blockquote', 'keep'],

  // Unwrap: Structural tags whose content should be preserved
  ['div', 'unwrap'], ['span', 'unwrap'],
  ['main', 'unwrap'], ['article', 'unwrap'],
  ['header', 'unwrap'], ['footer', 'unwrap'],
  ['nav', 'unwrap'], ['aside', 'unwrap'],
  ['section', 'unwrap'],

  // Remove: Tags that provide no content and should be completely eliminated
  ['script', 'remove'], ['style', 'remove'], ['iframe', 'remove'],
  ['noscript', 'remove'], ['template', 'remove'], ['slot', 'remove'],
  ['meta', 'remove'], ['link', 'remove'],
  ['canvas', 'remove'], ['svg', 'remove'], ['map', 'remove'], ['area', 'remove'],
  ['audio', 'remove'], ['video', 'remove'], ['embed', 'remove'], ['object', 'remove'],
  ['form', 'remove'], ['input', 'remove'], ['textarea', 'remove'], ['select', 'remove'], ['option', 'remove'], ['button', 'remove']
]);

// A map for tag-specific attribute allowlists
const ALLOWED_ATTRS = new Map<string, Set<string>>([
  ['a', new Set(['href'])]
]);

export class HtmlProcessor {
  process(options: { html: string; baseUrl: string }): { title: string; links: string[]; cleanContent: string } {
    const { html, baseUrl } = options;
    const $ = cheerio.load(html);

    const title = $('title').first().text().trim();

    // 1. Perform the single, unified sanitization pass
    $('body *').each((index, element) => {
      const el = $(element);
      const tagName = el.prop('tagName')?.toLowerCase();

      // Default to 'unwrap' for any unknown tags to be safe
      const action = tagName ? SANITIZATION_MAP.get(tagName) || 'unwrap' : 'unwrap';

      switch (action) {
        case 'keep':
          // Sanitize attributes for tags we are keeping
          const attrs = { ...el.attr() };
          const allowedAttrsForTag = ALLOWED_ATTRS.get(tagName!);
          for (const attrName in attrs) {
            if (!allowedAttrsForTag || !allowedAttrsForTag.has(attrName)) {
              el.removeAttr(attrName);
            }
          }
          break;
        case 'unwrap':
          el.replaceWith(el.contents());
          break;
        case 'remove':
          el.remove();
          break;
      }
    });

    // 2. Sanitize links after the main pass
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

    // 3. Extract valid links
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

    // 4. Extract the final clean content
    // Add spaces around block-level elements to prevent words from mashing together
    $('p, h1, h2, h3, h4, h5, h6, li, pre, blockquote, th, td').each((i, el) => {
      $(el).prepend(' ').append(' ');
    });
    const cleanContent = $('body').text().replace(/\s\s+/g, ' ').trim();

    return { title, links, cleanContent };
  }
}
