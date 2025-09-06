import { marked, Token, Tokens } from 'marked';
import { URL } from 'url';

export class MarkdownProcessor {
  process(markdown: string, baseUrl: string) {
    const tokens = marked.lexer(markdown);
    const title =
      tokens.find((token): token is Tokens.Heading => token.type === 'heading' && token.depth === 1)
        ?.text ?? null;

    const links: string[] = [];

    marked.walkTokens(tokens, (token) => {
      if (token.type === 'link') {
        try {
          const absoluteUrl = new URL(token.href, baseUrl).href;
          links.push(absoluteUrl);
        } catch (e) {
          // ignore
        }
      }
    });

    const unwantedTokens = new Set(['hr', 'html', 'table', 'space', 'image']);

    function getText(token: Token): string {
      if (unwantedTokens.has(token.type)) {
        return '';
      }
      if (token.type === 'heading' || token.type === 'paragraph') {
        return ('tokens' in token && token.tokens ? token.tokens.map(getText).join('') : '') + '\n\n';
      }
      if (token.type === 'link') {
        return 'tokens' in token && token.tokens ? token.tokens.map(getText).join('') : '';
      }
      if ('tokens' in token && token.tokens) {
        return token.tokens.map(getText).join('');
      }
      return token.raw;
    }

    const cleanContent = tokens.map(getText).join('').trim();

    return { title, links, cleanContent };
  }
}