import { normalizeUrl, isUrl, toSiteId, detectContentType } from './src/fetch.js';
import { parseOpenAPI } from './src/parse.js';
import { docsToOpenAPI } from './src/docs-to-openapi.js';
import { generateClient } from './src/generate.js';
import { emitFiles } from './src/emit.js';

async function main() {
  const args = process.argv.slice(2).filter(a => a !== '--no-tests');
  const input = args[0];
  
  if (!input) {
    console.error('Usage: bunx docs-to-client <url-or-file>');
    console.error('Example: bunx docs-to-client https://api.example.com/docs');
    console.error('Example: bunx docs-to-client ./specs/openapi.json');
    process.exit(1);
  }

  try {
    let spec: any;
    let specPath: string = input;
    
    if (isUrl(input)) {
      // Detect if it's HTML docs or OpenAPI JSON
      const contentType = await detectContentType(input);
      
      if (contentType === 'html') {
        // HTML docs path
        console.log(`1. Fetching HTML docs from ${input}...`);
        spec = await docsToOpenAPI(input);
      } else {
        // Existing OpenAPI JSON path
        console.log(`1. Fetching OpenAPI spec from ${input}...`);
        specPath = normalizeUrl(input);
        spec = await parseOpenAPI(specPath);
      }
    } else {
      // File path - check extension
      if (input.endsWith('.json')) {
        specPath = input;
        spec = await parseOpenAPI(specPath);
      } else {
        // Assume HTML docs file
        console.log(`1. Reading HTML docs from ${input}...`);
        spec = await docsToOpenAPI(input);
      }
    }
    
    const siteName = toSiteId(input);
    
    console.log(`2.✅ Parsed OpenAPI ${spec.openapi || spec.swagger} spec`);
    console.log(`3. Generating client code...`);
    
    const generateTests = !process.argv.includes('--no-tests');
    const clientCode = await generateClient(spec, input, { generateTests });
    
    console.log(`4. Writing files...`);
    await emitFiles(clientCode, siteName);
    
    console.log(`5. Done! Client generated in ./generated/${siteName}/`);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
