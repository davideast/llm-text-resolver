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

  if (!outputFile) {
    console.error('Error: Please provide an output file path as the second argument.');
    process.exit(1);
  }

  console.log(`Resolving content from: ${url}`);

  try {
    const resolver = new Resolver();
    const { content } = await resolver.resolve(url);
    
    const outputPath = path.resolve(process.cwd(), outputFile);
    await fs.writeFile(outputPath, content);

    console.log(`✅ Success! Content saved to: ${outputPath}`);

  } catch (error) {
    console.error('An error occurred during resolution:');
    console.error(error);
    process.exit(1);
  }
}

main();
