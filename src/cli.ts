#!/usr/bin/env node
import { Resolver } from './resolver.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const HELP_MESSAGE = `
llm-txt-resolver

Aggregates web content into a consolidated, LLM-ready context.

USAGE:
  llm-txt-resolver <url> [output_file]

ARGUMENTS:
  <url>             The root URL to start crawling from.
  [output_file]     (Optional) The path to save the aggregated content.
                    If omitted, the content will be printed to standard output.

OPTIONS:
  -h, --help        Show this help message.

EXAMPLES:
  # Crawl a website and print the content to the console
  llm-txt-resolver https://example.com

  # Crawl a website and save the content to a file
  llm-txt-resolver https://example.com ./output.txt
`;

async function main() {
  const args = process.argv.slice(2);
  const url = args[0];
  const outputFile = args[1];

  if (args.includes('--help') || args.includes('-h') || url === 'help' || !url) {
    console.log(HELP_MESSAGE);
    process.exit(0);
  }

  try {
    const resolver = new Resolver();
    const { content } = await resolver.resolve(url);

    if (outputFile) {
      const outputPath = path.resolve(process.cwd(), outputFile);
      await fs.writeFile(outputPath, content);
      // Use console.log for the final success message to stderr
      console.log(`✅ Success! Content saved to: ${outputPath}`);
    } else {
      // Use process.stdout.write for the primary output
      process.stdout.write(content);
    }

  } catch (error) {
    console.error('An error occurred during resolution:');
    console.error(error);
    process.exit(1);
  }
}

main();