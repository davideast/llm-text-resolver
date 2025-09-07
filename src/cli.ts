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

  # Crawl a website with a depth of 1 (only the root page)
  llm-text-resolver https://example.com --depth 1
`;

async function main() {
  let args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h') || args[0] === 'help' || args.length === 0) {
    console.log(HELP_MESSAGE);
    process.exit(0);
  }

  let depth: number | undefined;

  // Find and extract the depth value
  const depthIndex = args.findIndex(arg => arg === '--depth' || arg === '-d');
  if (depthIndex > -1) {
    const depthValue = parseInt(args[depthIndex + 1], 10);
    if (!isNaN(depthValue)) {
      depth = depthValue;
      // Remove the flag and its value from the args array
      args.splice(depthIndex, 2);
    }
  }

  const url = args[0];
  const outputFile = args[1];

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