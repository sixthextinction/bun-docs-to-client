import SwaggerParser from '@apidevtools/swagger-parser';
import { fetchOpenAPI } from './fetch.js';

const OPENAPI_ROOT_PROPERTIES = new Set([
  'openapi', 'swagger', 'info', 'servers', 'paths', 'components',
  'security', 'tags', 'externalDocs'
]);

function cleanSpec(spec: any): any {
  // Remove non-standard root properties
  const cleaned: any = {};
  for (const [key, value] of Object.entries(spec)) {
    if (OPENAPI_ROOT_PROPERTIES.has(key)) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export async function parseOpenAPI(url: string): Promise<any> {
  // Fetch the spec
  const spec = await fetchOpenAPI(url);
  
  // Clean non-standard properties
  const cleaned = cleanSpec(spec);
  
  // Validate and dereference using swagger-parser
  const parsed = await SwaggerParser.validate(cleaned);
  
  return parsed;
}
