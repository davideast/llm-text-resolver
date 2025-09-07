#!/usr/bin/env node
import { Resolver } from './resolver.js';
import fs from 'node:fs/promises';
import path from 'node:path';

async function main() {
  const url = process.argv[2];
  const outputFile = process.argv[3];

  if (!url) {
    console.error('Error: Please provide a URL as the first argument.');
    process.exit(1);
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
