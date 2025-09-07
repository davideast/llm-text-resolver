#!/usr/bin/env node
import { Resolver } from './resolver.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const HELP_MESSAGE = `
llm-text-resolver

Aggregates web content into a consolidated, LLM-ready context.

USAGE:
  llm-text-resolver <url> [output_file] [options]

ARGUMENTS:
  <url>             The root URL to start crawling from.
  [output_file]     (Optional) The path to save the aggregated content.
                    If omitted, the content will be printed to standard output.

OPTIONS:
  -h, --help        Show this help message.
  -d, --depth <number> The maximum depth to crawl. Defaults to 2.

EXAMPLES:
  # Crawl a website and print the content to the console
  llm-text-resolver https://example.com

  # Crawl a website with a depth of 3 and save to a file
  llm-text-resolver https://example.com ./output.txt --depth 3
`;

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h') || args[0] === 'help' || args.length === 0) {
    console.log(HELP_MESSAGE);
    process.exit(0);
  }

  let url: string | undefined;
  let outputFile: string | undefined;
  let depth: number | undefined;

  // Basic argument parsing
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--depth' || arg === '-d') {
      const depthValue = parseInt(args[i + 1], 10);
      if (!isNaN(depthValue)) {
        depth = depthValue;
        i++; // Skip the value
      }
    } else if (!url) {
      url = arg;
    } else if (!outputFile) {
      outputFile = arg;
    }
  }

  if (!url) {
    console.error('Error: URL is a required argument.');
    console.log(HELP_MESSAGE);
    process.exit(1);
  }

  try {
    const resolver = new Resolver({ depth });
    const { content } = await resolver.resolve(url);

    if (outputFile) {
      const outputPath = path.resolve(process.cwd(), outputFile);
      await fs.writeFile(outputPath, content);
      console.log(`✅ Success! Content saved to: ${outputPath}`);
    } else {
      process.stdout.write(content);
    }

  } catch (error) {
    console.error('An error occurred during resolution:');
    console.error(error);
    process.exit(1);
  }
}

main();
