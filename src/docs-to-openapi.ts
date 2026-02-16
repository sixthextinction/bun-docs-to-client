// @ts-ignore - turndown types
import TurndownService from 'turndown';
import SwaggerParser from '@apidevtools/swagger-parser';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { cacheSpec, getProxyOptions } from './fetch.js';

interface Endpoint {
  path: string;
  method: string;
  queryParams?: string[];
  pathParams?: string[];
  description?: string;
}

interface ApiResponse {
  status: number;
  data: any;
  headers: Record<string, string>;
}

async function extractEndpointsWithLLM(markdown: string, inputUrl: string): Promise<Endpoint[]> {
  const baseUrl = extractBaseUrl(markdown, inputUrl);
  
  // Truncate markdown if too long (keep first 8000 chars to avoid token limits)
  // const truncatedMarkdown = markdown.length > 8000 
  //   ? markdown.substring(0, 8000) + '\n\n[... truncated ...]'
  //   : markdown;
  
  const prompt = `You are an API documentation parser. Extract all API endpoints from the following markdown documentation.

Base URL: ${baseUrl}

Documentation:
${markdown}

Extract all API endpoints mentioned in the documentation. For each endpoint, identify:
1. The path (normalize path parameters like /people/1/ to /people/{id}/)
2. HTTP method (GET, POST, PUT, DELETE, etc.)
3. Query parameters (if any)
4. Path parameters (if any, like {id}, {category}, etc.)
5. Brief description if available

Return ONLY a JSON array of endpoints in this exact format:
[
  {
    "path": "/jokes/random",
    "method": "GET",
    "queryParams": ["category"],
    "pathParams": [],
    "description": "Get a random joke"
  },
  {
    "path": "/people/{id}",
    "method": "GET",
    "queryParams": [],
    "pathParams": ["id"],
    "description": "Get a specific person"
  }
]

Only include actual API endpoints. Exclude:
- Image URLs (/img/, .png, .jpg, etc.)
- Static assets (/css/, /js/, etc.)
- OAuth endpoints (/oauth/, /connect/)
- External links (different domains)
- Social media links (/twitter/, /github/, etc.)
- Very long paths that look like base64 data

Return ONLY the JSON array, no other text.`;

  try {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || 'hf.co/unsloth/Qwen3-4B-Instruct-2507-GGUF:Q4_K_M';
    
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        stream: false,
        format: 'json',
        options: {
          temperature: 0.1, // Low temperature for more deterministic output
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    const content = data.message?.content || data.response || '';
    
    // Save LLM response to debug file
    try {
      const debugDir = join(process.cwd(), 'debug');
      await mkdir(debugDir, { recursive: true });
      
      const urlObj = new URL(inputUrl);
      const debugFilename = `${urlObj.hostname.replace(/\./g, '_')}_${Date.now()}.md`;
      const debugPath = join(debugDir, debugFilename);
      
      // @ts-ignore - Bun global
      await Bun.write(debugPath, content);
      console.log(`   💾 Saved LLM response to ./debug/${debugFilename}`);
    } catch (debugError) {
      // Don't fail if debug save fails
      console.warn(`   ⚠️  Failed to save debug file: ${debugError instanceof Error ? debugError.message : String(debugError)}`);
    }
    
    // Parse JSON from response (might be wrapped in markdown code blocks)
    let jsonStr = content.trim();
    
    // Remove markdown code blocks if present
    jsonStr = jsonStr.replace(/^```json\n?/i, '').replace(/^```\n?/, '').replace(/\n?```$/i, '');
    jsonStr = jsonStr.trim();
    
    // Try to extract JSON array if wrapped in other text
    const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    
    const endpoints = JSON.parse(jsonStr) as Endpoint[];
    
    // Validate and normalize endpoints
    return endpoints
      .filter(e => e.path && e.method)
      .map(e => ({
        ...e,
        path: normalizePath(e.path),
        method: e.method.toUpperCase(),
        queryParams: e.queryParams?.filter(p => p) || undefined,
        pathParams: e.pathParams?.filter(p => p) || undefined,
      }));
  } catch (error) {
    console.warn(`   ⚠️  LLM extraction failed: ${error instanceof Error ? error.message : String(error)}`);
    console.warn('   Falling back to regex-based extraction...');
    // Fallback to regex-based extraction
    return extractEndpoints(markdown, inputUrl);
  }
}

function extractBaseUrl(markdown: string, inputUrl: string): string {
  // Try to find base URL from API examples (look for URLs in code blocks)
  const urlPattern = /https?:\/\/[^\s`)\]}]+/g;
  const urlMatches = markdown.match(urlPattern) || [];
  
  // Find first URL that looks like an API endpoint
  for (const urlMatch of urlMatches) {
    try {
      const cleanedUrl = urlMatch.replace(/[)\]}]+$/, '');
      const urlObj = new URL(cleanedUrl);
      const path = urlObj.pathname;
      
      // Prefer URLs that look like API endpoints
      if (isApiEndpoint(path) || path.match(/^\/api\//) || path.match(/^\/[\w-]+\/(random|categories|search)/i)) {
        return `${urlObj.protocol}//${urlObj.host}`;
      }
    } catch {
      // Invalid URL, skip
    }
  }
  
  // Fallback: use first valid URL
  if (urlMatches.length > 0 && urlMatches[0]) {
    try {
      const cleanedUrl = urlMatches[0].replace(/[)\]}]+$/, '');
      const urlObj = new URL(cleanedUrl);
      return `${urlObj.protocol}//${urlObj.host}`;
    } catch {
      // Fall through
    }
  }
  
  // Final fallback: infer from input URL
  try {
    const urlObj = new URL(inputUrl);
    return `${urlObj.protocol}//${urlObj.host}`;
  } catch {
    return 'https://api.example.com';
  }
}

function normalizePath(path: string): string {
  // Replace numeric IDs with {id}
  let normalized = path.replace(/\/\d+\//g, '/{id}/').replace(/\/\d+$/g, '/{id}');
  
  // Replace :id with {id}
  normalized = normalized.replace(/\/:(\w+)\//g, '/{$1}/').replace(/\/:(\w+)$/g, '/{$1}');
  
  // Ensure trailing slash consistency (remove for now, can adjust)
  normalized = normalized.replace(/\/$/, '') || '/';
  
  return normalized;
}

function isApiEndpoint(path: string): boolean {
  // Filter out obvious non-API paths
  const excludePatterns = [
    /^\/img\//,           // Images
    /^\/cdn\//,           // CDN assets
    /\.(png|jpg|jpeg|gif|svg|ico|css|js)$/i, // File extensions
    /^\/oauth\//,         // OAuth endpoints
    /^\/connect\//,      // OAuth connect
    /^\/l\//,             // Link shorteners
    /^\/[A-Za-z0-9+/]{50,}/, // Base64-like long strings (likely images)
    /^\/signup/,          // Auth pages
    /^\/analytics/,       // Analytics
    /^\/privacy/,         // Privacy pages
    /^\/status/,          // Status pages
    /^\/twitter/,         // External links
    /^\/github/,          // External links
    /^\/slack/,           // External links
    /^\/m\./,             // Messenger links
    /^\/www\./,           // External www links
    /^\/aws/,             // External links
    /^\/$/,               // Root path
    /^\/\/+/,             // Double slashes
  ];
  
  // Check exclude patterns
  for (const pattern of excludePatterns) {
    if (pattern.test(path)) {
      return false;
    }
  }
  
  // Paths that are too long are likely not API endpoints
  if (path.length > 200) {
    return false;
  }
  
  // Prefer paths that look like API endpoints
  // Common patterns: /api/, /v1/, /v2/, resource names like /jokes/, /users/, etc.
  const apiPatterns = [
    /^\/api\//,
    /^\/v\d+\//,
    /^\/[\w-]+\/(random|categories|search|list|get|create|update|delete)/i,
    /^\/[\w-]+\/\d+/,  // Resource with ID
    /^\/[\w-]+\/\{id\}/, // Resource with {id}
    /^\/[\w-]+\?/,     // Resource with query params
  ];
  
  // If it matches API patterns, include it
  for (const pattern of apiPatterns) {
    if (pattern.test(path)) {
      return true;
    }
  }
  
  // Also include simple resource paths like /jokes/, /users/, etc.
  // But exclude if it's too short or looks like a file
  if (path.match(/^\/[\w-]+\/?$/) && path.length > 2 && path.length < 50) {
    return true;
  }
  
  return false;
}

export async function docsToOpenAPI(input: string): Promise<any> {
  console.log('📄 Converting HTML docs to OpenAPI spec...');
  
  // 1. Fetch HTML (with proxy if configured)
  const proxyOptions = getProxyOptions();
  const html = await fetch(input, proxyOptions as any).then(r => r.text());
  
  // 2. Convert to markdown
  const turndownService = new TurndownService();
  const markdown = turndownService.turndown(html);
  
  // 3. Extract endpoints using LLM
  const endpoints = await extractEndpointsWithLLM(markdown, input);
  console.log(`   Found ${endpoints.length} endpoints`);
  
  // 4. Extract base URL
  const baseUrl = extractBaseUrl(markdown, input);
  console.log(`   Base URL: ${baseUrl}`);
  
  // 5. Test API & build schemas
  const openApiSpec = await exploreAndBuildSpec(endpoints, baseUrl);
  
  // 6. Save to ./specs/
  await cacheSpec(openApiSpec, input);
  
  // 7. Validate & return
  return await SwaggerParser.validate(openApiSpec);
}

function extractEndpoints(markdown: string, inputUrl: string): Endpoint[] {
  const endpoints: Endpoint[] = [];
  const seen = new Set<string>();
  
  // Extract base URL first
  const baseUrl = extractBaseUrl(markdown, inputUrl);
  const baseUrlObj = new URL(baseUrl);
  
  // Extract full URLs from code blocks - improved regex to handle markdown links
  // Match URLs but stop at common markdown delimiters: ), ], }, space, newline, backtick
  const urlPattern = /https?:\/\/[^\s`)\]}]+/g;
  const urlMatches = markdown.match(urlPattern) || [];
  
  for (const urlMatch of urlMatches) {
    try {
      // Clean up URL (remove trailing punctuation from markdown)
      const cleanedUrl = urlMatch.replace(/[)\]}]+$/, '');
      const urlObj = new URL(cleanedUrl);
      
      // Only process URLs from the same domain
      if (urlObj.origin === baseUrlObj.origin) {
        const path = urlObj.pathname;
        
        // Filter out non-API endpoints
        if (isApiEndpoint(path)) {
          const queryParams = Array.from(urlObj.searchParams.keys());
          
          // Normalize path parameters: /people/1/ -> /people/{id}/
          const normalizedPath = normalizePath(path);
          const key = `${normalizedPath}:GET`;
          
          if (!seen.has(key)) {
            seen.add(key);
            endpoints.push({
              path: normalizedPath,
              method: 'GET',
              queryParams: queryParams.length > 0 ? queryParams : undefined,
            });
          }
        }
      }
    } catch {
      // Invalid URL, skip
    }
  }
  
  // Also extract endpoint patterns from code blocks and lists
  const pathPattern = /`(\/[\w\/{}:?=&]+)`/g;
  let match;
  while ((match = pathPattern.exec(markdown)) !== null) {
    const path = match[1].split('?')[0]; // Remove query string for path matching
    // Only process paths that look like API endpoints
    if (isApiEndpoint(path)) {
      const normalizedPath = normalizePath(path);
      const key = `${normalizedPath}:GET`;
      
      if (!seen.has(key)) {
        seen.add(key);
        endpoints.push({
          path: normalizedPath,
          method: 'GET',
        });
      }
    }
  }
  
  return endpoints;
}

function buildGetPathItem(opts: {
  summary: string;
  schemaName: string;
  isArray: boolean;
  parameters?: Array<{ name: string; in: 'path' | 'query'; required?: boolean }>;
}): Record<string, any> {
  const schemaRef = `#/components/schemas/${opts.schemaName}`;
  const schema = opts.isArray
    ? { type: 'array' as const, items: { $ref: schemaRef } }
    : { $ref: schemaRef };
  const parameters = opts.parameters?.map(p => ({
    name: p.name,
    in: p.in,
    ...(p.required && { required: true }),
    schema: { type: 'string' as const }
  }));
  return {
    get: {
      summary: opts.summary,
      ...(parameters?.length ? { parameters } : {}),
      responses: {
        '200': {
          description: 'Success',
          content: { 'application/json': { schema } }
        }
      }
    }
  };
}

async function exploreAndBuildSpec(endpoints: Endpoint[], baseUrl: string): Promise<any> {
  const paths: Record<string, any> = {};
  const schemas: Record<string, any> = {};
  
  const listEndpoints = endpoints.filter(e => 
    !e.path.includes('{id}') && !e.path.includes('{category}') && !e.path.includes('{query}')
  );
  const detailEndpoints = endpoints.filter(e => e.path.includes('{id}'));
  const queryEndpoints = endpoints.filter(e => e.path.includes('{query}') || e.path.includes('{category}'));
  
  for (const endpoint of listEndpoints) {
    try {
      const response = await testEndpoint(baseUrl, endpoint);
      if (response.status !== 200) continue;
      
      const schemaName = inferSchemaName(endpoint.path);
      const schema = inferSchema(response.data, schemaName);
      if (schema) schemas[schemaName] = schema;
      
      const ids = extractIds(response.data);
      const params = endpoint.queryParams?.map(p => ({ name: p, in: 'query' as const }));
      
      paths[endpoint.path] = buildGetPathItem({
        summary: `Get ${schemaName}`,
        schemaName,
        isArray: Array.isArray(response.data),
        parameters: params
      });
      
      for (const detailEndpoint of detailEndpoints) {
        const detailBasePath = detailEndpoint.path.replace(/\/\{id\}\/?/g, '');
        if (detailBasePath !== endpoint.path && !detailEndpoint.path.startsWith(endpoint.path + '/')) continue;
        
        for (const id of ids.slice(0, 2)) {
          const testPath = detailEndpoint.path.replace('{id}', id);
          const detailResponse = await testEndpoint(baseUrl, { ...detailEndpoint, path: testPath });
          if (detailResponse.status !== 200) continue;
          
          const detailSchemaName = inferSchemaName(detailEndpoint.path);
          const detailSchema = inferSchema(detailResponse.data, detailSchemaName);
          if (detailSchema) schemas[detailSchemaName] = detailSchema;
          
          const pathParams = detailEndpoint.pathParams?.map(p => ({ name: p, in: 'path' as const, required: true }))
            ?? [{ name: 'id', in: 'path' as const, required: true }];
          
          paths[detailEndpoint.path] = buildGetPathItem({
            summary: `Get ${detailSchemaName} by ID`,
            schemaName: detailSchemaName,
            isArray: false,
            parameters: pathParams
          });
          break;
        }
      }
    } catch (error) {
      console.warn(`   ⚠️  Failed to test ${endpoint.path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  for (const endpoint of queryEndpoints) {
    try {
      let testPath = endpoint.path;
      if (endpoint.path.includes('{category}')) {
        const categoriesEndpoint = listEndpoints.find(e => e.path.includes('categor'));
        const catData = categoriesEndpoint ? (await testEndpoint(baseUrl, categoriesEndpoint)).data : null;
        testPath = endpoint.path.replace('{category}', 
          Array.isArray(catData) && catData[0] ? catData[0] : 'dev');
      }
      if (endpoint.path.includes('{query}')) testPath = endpoint.path.replace('{query}', 'test');
      
      const response = await testEndpoint(baseUrl, { ...endpoint, path: testPath });
      if (response.status !== 200) continue;
      
      const schemaName = inferSchemaName(endpoint.path);
      const schema = inferSchema(response.data, schemaName);
      if (schema) schemas[schemaName] = schema;
      
      const params = endpoint.path.includes('{query}')
        ? [{ name: 'query', in: 'query' as const, required: true }]
        : endpoint.path.includes('{category}')
          ? [{ name: 'category', in: 'query' as const, required: true }]
          : undefined;
      
      paths[endpoint.path] = buildGetPathItem({
        summary: `Search ${schemaName}`,
        schemaName,
        isArray: Array.isArray(response.data),
        parameters: params
      });
    } catch (error) {
      console.warn(`   ⚠️  Failed to test ${endpoint.path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  for (const detailEndpoint of detailEndpoints) {
    if (paths[detailEndpoint.path]) continue;
    try {
      const testPath = detailEndpoint.path.replace('{id}', '1');
      const detailResponse = await testEndpoint(baseUrl, { ...detailEndpoint, path: testPath });
      if (detailResponse.status !== 200) continue;
      
      const detailSchemaName = inferSchemaName(detailEndpoint.path);
      const detailSchema = inferSchema(detailResponse.data, detailSchemaName);
      if (detailSchema) schemas[detailSchemaName] = detailSchema;
      
      const pathParams = detailEndpoint.pathParams?.map(p => ({ name: p, in: 'path' as const, required: true }))
        ?? [{ name: 'id', in: 'path' as const, required: true }];
      
      paths[detailEndpoint.path] = buildGetPathItem({
        summary: `Get ${detailSchemaName} by ID`,
        schemaName: detailSchemaName,
        isArray: false,
        parameters: pathParams
      });
    } catch (error) {
      console.warn(`   ⚠️  Failed to test detail endpoint ${detailEndpoint.path}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Build OpenAPI spec
  const spec: any = {
    openapi: '3.0.0',
    info: {
      title: 'API Client',
      version: '1.0.0',
      description: 'Generated from HTML documentation'
    },
    servers: [{
      url: baseUrl
    }],
    paths,
    components: {
      schemas: schemas
    }
  };
  
  return spec;
}

async function testEndpoint(baseUrl: string, endpoint: Endpoint): Promise<ApiResponse> {
  const url = `${baseUrl}${endpoint.path}`;
  const proxyOptions = getProxyOptions();
  const response = await fetch(url, {
    method: endpoint.method,
    headers: {
      'Accept': 'application/json'
    },
    ...proxyOptions,
  } as any);
  
  const data = await response.json().catch(() => ({}));
  
  return {
    status: response.status,
    data,
    headers: Object.fromEntries(response.headers.entries())
  };
}

function inferSchemaName(path: string): string {
  // Extract resource name from path: /api/people -> People
  const parts = path.split('/').filter(p => p && !p.startsWith('{'));
  const resource = parts[parts.length - 1] || 'Resource';
  return resource.charAt(0).toUpperCase() + resource.slice(1).replace(/s$/, '');
}

function inferSchema(data: any, name: string): any {
  if (!data || typeof data !== 'object') {
    return { type: typeof data };
  }
  
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return { type: 'array', items: { type: 'object' } };
    }
    return { type: 'array', items: inferSchema(data[0], name) };
  }
  
  const schema: any = {
    type: 'object',
    properties: {}
  };
  
  for (const [key, value] of Object.entries(data)) {
    if (value === null) {
      schema.properties[key] = { type: 'string', nullable: true };
    } else if (typeof value === 'string') {
      schema.properties[key] = { type: 'string' };
    } else if (typeof value === 'number') {
      schema.properties[key] = { type: Number.isInteger(value) ? 'integer' : 'number' };
    } else if (typeof value === 'boolean') {
      schema.properties[key] = { type: 'boolean' };
    } else if (Array.isArray(value)) {
      schema.properties[key] = { type: 'array', items: value.length > 0 ? inferSchema(value[0], name) : { type: 'string' } };
    } else if (typeof value === 'object') {
      schema.properties[key] = inferSchema(value, name);
    }
  }
  
  return schema;
}

function extractIds(data: any): string[] {
  const ids: string[] = [];
  
  if (Array.isArray(data)) {
    for (const item of data.slice(0, 5)) {
      if (item?.id) ids.push(String(item.id));
      if (item?.url) {
        const match = item.url.match(/\/(\d+)\/?$/);
        if (match) ids.push(match[1]);
      }
    }
  } else if (data?.results && Array.isArray(data.results)) {
    return extractIds(data.results);
  }
  
  return ids;
}
