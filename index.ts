import { normalizeUrl, isUrl, extractSiteName } from './src/fetch.js';
import { parseOpenAPI } from './src/parse.js';
import { generateClient } from './src/generate.js';
import { emitFiles } from './src/emit.js';

async function main() {
  const input = process.argv[2];
  
  if (!input) {
    console.error('Usage: bunx docs-to-cli <url-or-file>');
    console.error('Example: bunx docs-to-cli https://api.example.com/docs');
    console.error('Example: bunx docs-to-cli ./specs/openapi.json');
    process.exit(1);
  }

  try {
    if (isUrl(input)) {
      // If it's a URL, fetch the spec
      console.log(`1. Fetching OpenAPI spec from ${input}...`);
    } else {
      // If it's a file path, just read the file
      console.log(`1. Reading OpenAPI spec from ${input}...`);
    }
    const specPath = normalizeUrl(input);
    const spec = await parseOpenAPI(specPath);
    
    const siteName = extractSiteName(input);
    
    console.log(`2.✅ Parsed OpenAPI ${spec.openapi || spec.swagger} spec`);
    console.log(`3. Generating client code...`);
    
    const clientCode = await generateClient(spec, input);
    
    console.log(`4. Writing files...`);
    await emitFiles(clientCode, siteName);
    
    console.log(`5. Done! Client generated in ./generated/${siteName}/`);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
