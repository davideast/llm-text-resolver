import * as cheerio from 'cheerio';
import { URL } from 'url';

type SanitizeAction = 'keep' | 'unwrap' | 'remove';

const SANITIZATION_MAP = new Map<string, SanitizeAction>([
  ['h1', 'keep'], ['h2', 'keep'], ['h3', 'keep'], ['h4', 'keep'], ['h5', 'keep'], ['h6', 'keep'],
  ['p', 'keep'], ['a', 'keep'],
  ['ul', 'keep'], ['ol', 'keep'], ['li', 'keep'],
  ['table', 'keep'], ['thead', 'keep'], ['tbody', 'keep'], ['tr', 'keep'], ['th', 'keep'], ['td', 'keep'],
  ['strong', 'keep'], ['em', 'keep'], ['b', 'keep'], ['i', 'keep'], ['u', 'keep'],
  ['code', 'keep'], ['pre', 'keep'], ['blockquote', 'keep'],
  ['div', 'unwrap'], ['span', 'unwrap'],
  ['main', 'unwrap'], ['article', 'unwrap'],
  ['header', 'unwrap'], ['footer', 'unwrap'],
  ['nav', 'unwrap'], ['aside', 'unwrap'],
  ['section', 'unwrap'],
  ['script', 'remove'], ['style', 'remove'], ['iframe', 'remove'],
  ['noscript', 'remove'], ['template', 'remove'], ['slot', 'remove'],
  ['meta', 'remove'], ['link', 'remove'],
  ['canvas', 'remove'], ['svg', 'remove'], ['map', 'remove'], ['area', 'remove'],
  ['audio', 'remove'], ['video', 'remove'], ['embed', 'remove'], ['object', 'remove'],
  ['form', 'remove'], ['input', 'remove'], ['textarea', 'remove'], ['select', 'remove'], ['option', 'remove'], ['button', 'remove']
]);

const ALLOWED_ATTRS = new Map<string, Set<string>>([
  ['a', new Set(['href'])]
]);

export class HtmlProcessor {
  process(options: { html: string; baseUrl: string }): { title: string; links: string[]; cleanContent: string } {
    const { html, baseUrl } = options;
    const $ = cheerio.load(html);

    const title = $('title').first().text().trim();

    $('body *').each((index, element) => {
      const el = $(element);
      const tagName = el.prop('tagName')?.toLowerCase();
      const action = tagName ? SANITIZATION_MAP.get(tagName) || 'unwrap' : 'unwrap';

      switch (action) {
        case 'keep':
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

    const cleanContent = this.convertToMarkdown($('body'), $);

    return { title, links, cleanContent };
  }

  private convertToMarkdown(root: cheerio.Cheerio<cheerio.Element>, $: cheerio.CheerioAPI): string {
    let markdown = '';
    root.contents().each((index, node) => {
      markdown += this.elementToMarkdown($(node), $);
    });
    return markdown.replace(/\n{3,}/g, '\n\n').trim();
  }

  private elementToMarkdown($el: cheerio.Cheerio<cheerio.Element>, $: cheerio.CheerioAPI): string {
    if ($el[0].type === 'text') {
      return $el.text().replace(/\s+/g, ' ');
    }
    if ($el[0].type !== 'tag') {
      return '';
    }

    const tagName = $el.prop('tagName')?.toLowerCase();
    
    let content = '';
    $el.contents().each((index, child) => {
      content += this.elementToMarkdown($(child), $);
    });

    switch (tagName) {
      case 'h1': return `# ${content}\n\n`;
      case 'h2': return `## ${content}\n\n`;
      case 'h3': return `### ${content}\n\n`;
      case 'h4': return `#### ${content}\n\n`;
      case 'h5': return `##### ${content}\n\n`;
      case 'h6': return `###### ${content}\n\n`;
      case 'p': return `${content}\n\n`;
      case 'a': return `[${content}](${$el.attr('href') || ''})`;
      case 'li': return `* ${content.trim()}\n`;
      case 'ul': case 'ol': return `${content}\n`;
      case 'strong': case 'b': return `**${content}**`;
      case 'em': case 'i': return `*${content}*`;
      case 'code': return `\`${content}\``;
      case 'pre': return `\
\
${content}\n\
\
`;
      case 'blockquote': return `> ${content}\n\n`;
      default: return content;
    }
  }
}