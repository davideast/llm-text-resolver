import * as cheerio from 'cheerio';
import { URL } from 'url';

export class HtmlProcessor {
  process(html: string, baseUrl: string) {
    const $ = cheerio.load(html);
    $('script, style, iframe').remove();

    const title = $('title').text();

    const links: string[] = [];
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (href) {
        try {
          const absoluteUrl = new URL(href, baseUrl).href;
          links.push(absoluteUrl);
        } catch (e) {
          // Ignore invalid URLs
        }
      }
    });

    let cleanContent = '';
    if ($('main').length) {
      cleanContent = $('main').text();
    } else if ($('article').length) {
      cleanContent = $('article').text();
    } else {
      $('script, style').remove();
      cleanContent = $('body').text();
    }

    return { title, links, cleanContent: cleanContent.trim() };
  }
}