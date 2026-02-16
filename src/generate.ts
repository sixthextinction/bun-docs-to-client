interface ClientCode {
  client: string;
  types: string;
  index: string;
  tests: string;
}

export async function generateClient(spec: any, inputUrl?: string, options?: { generateTests?: boolean }): Promise<ClientCode> {
  const baseUrl = resolveBaseUrl(spec, inputUrl);
  const title = spec.info?.title || 'API';
  const types = generateTypes(spec);
  const client = generateClientClass(spec, baseUrl);
  const index = generateIndex(title);
  const tests = (options?.generateTests !== false) ? generateTests(spec) : '';
  
  return {
    client,
    types,
    index,
    tests,
  };
}

function generateTypes(spec: any): string {
  const schemas = spec.components?.schemas || {};
  const typeDefs: string[] = [];
  
  for (const [name, schema] of Object.entries(schemas)) {
    const typeDef = generateTypeDefinition(name, schema as any);
    typeDefs.push(typeDef);
  }
  
  return typeDefs.length > 0 
    ? typeDefs.join('\n\n')
    : '// No schemas defined in OpenAPI spec';
}

function generateTypeDefinition(name: string, schema: any): string {
  if (schema.type === 'object') {
    const props = schema.properties || {};
    const required = schema.required || [];
    
    const propDefs = Object.entries(props).map(([propName, propSchema]: [string, any]) => {
      const optional = !required.includes(propName) ? '?' : '';
      const type = mapSchemaType(propSchema);
      return `  ${propName}${optional}: ${type};`;
    });
    
    return `export interface ${name} {\n${propDefs.join('\n')}\n}`;
  }
  
  return `export type ${name} = ${mapSchemaType(schema)};`;
}

function mapSchemaType(schema: any): string {
  if (schema.type === 'string') return 'string';
  if (schema.type === 'number' || schema.type === 'integer') return 'number';
  if (schema.type === 'boolean') return 'boolean';
  if (schema.type === 'array') {
    const items = schema.items ? mapSchemaType(schema.items) : 'any';
    return `${items}[]`;
  }
  if (schema.type === 'object') return 'Record<string, any>';
  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop();
    return refName || 'any';
  }
  return 'any';
}

function generateClientClass(spec: any, baseUrl: string): string {
  const paths = spec.paths || {};
  const methods: string[] = [];
  
  for (const [path, pathItem] of Object.entries(paths)) {
    const pathObj = pathItem as any;
    
    for (const [method, operation] of Object.entries(pathObj)) {
      if (!['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
        continue;
      }
      
      const op = operation as any;
      const methodName = generateMethodName(path, method, op.operationId);
      const methodCode = generateMethod(methodName, method.toUpperCase(), path, op, baseUrl);
      methods.push(methodCode);
    }
  }
  
  return `export class ApiClient {
  private baseUrl: string;
  
  constructor(baseUrl: string = '${baseUrl}') {
    this.baseUrl = baseUrl.replace(/\\/$/, '');
  }
  
${methods.join('\n\n')}
}`;
}

function generateMethodName(path: string, method: string, operationId?: string): string {
  if (operationId) {
    return operationId.replace(/[^a-zA-Z0-9]/g, '_');
  }
  
  // Infer from path and method
  const parts = path.split('/').filter(Boolean);
  const methodPrefix = method.toLowerCase() === 'get' ? 'get' : 
                       method.toLowerCase() === 'post' ? 'create' :
                       method.toLowerCase() === 'put' ? 'update' :
                       method.toLowerCase() === 'patch' ? 'patch' : 'delete';
  
  // Extract resource name (second-to-last part if last is {id} or schema, otherwise last part)
  let resourceName = 'resource';
  let suffix = '';
  
  if (parts.length === 0) {
    resourceName = 'resource';
  } else {
    const lastPart = parts[parts.length - 1];
    const secondLastPart = parts.length > 1 ? parts[parts.length - 2] : null;
    
    // Check if last part is a path parameter like {id}
    if (lastPart && lastPart.startsWith('{') && lastPart.endsWith('}')) {
      // Path like /people/{id} -> getPeopleById
      resourceName = secondLastPart || 'resource';
      const paramName = lastPart.slice(1, -1); // Remove { }
      suffix = `By${capitalize(paramName)}`;
    } else if (lastPart === 'schema' || lastPart === 'Schema') {
      // Path like /people/schema -> getPeopleSchema
      resourceName = secondLastPart || 'resource';
      suffix = 'Schema';
    } else {
      // Regular path like /people -> getPeople
      resourceName = lastPart;
    }
  }
  
  // Clean resource name
  resourceName = resourceName.replace(/[^a-zA-Z0-9]/g, '');
  if (!resourceName) resourceName = 'resource';
  
  return `${methodPrefix}${capitalize(resourceName)}${suffix}`;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function generateMethod(methodName: string, httpMethod: string, path: string, operation: any, baseUrl: string): string {
  const params = operation.parameters || [];
  const hasBody = ['POST', 'PUT', 'PATCH'].includes(httpMethod);
  
  // Get response type
  const successResponse = operation.responses?.['200'] || operation.responses?.['201'] || operation.responses?.['default'];
  const responseSchema = successResponse?.content?.['application/json']?.schema;
  const responseType = responseSchema?.$ref?.split('/').pop() || 
                      (responseSchema?.type === 'array' && responseSchema?.items?.$ref?.split('/').pop() ? 
                        `${responseSchema.items.$ref.split('/').pop()}[]` : 'any');
  
  const paramDefs: string[] = [];
  const queryParams: string[] = [];
  const pathParams: string[] = [];
  
  params.forEach((param: any) => {
    if (param.in === 'path') {
      pathParams.push(param.name);
      const paramType = mapSchemaType(param.schema || { type: 'string' });
      paramDefs.push(`${param.name}: ${paramType}`);
    } else if (param.in === 'query') {
      queryParams.push(param.name);
      const paramType = mapSchemaType(param.schema || { type: 'string' });
      paramDefs.push(`${param.name}?: ${paramType}`);
    }
  });
  
  if (hasBody) {
    const bodySchema = operation.requestBody?.content?.['application/json']?.schema;
    const bodyType = bodySchema?.$ref?.split('/').pop() || 
                    (bodySchema?.type === 'object' ? 'Record<string, any>' : 'any');
    paramDefs.push(`body: ${bodyType}`);
  }
  
  const paramList = paramDefs.length > 0 ? `\n    ${paramDefs.join(',\n    ')}\n  ` : '';
  const methodSignature = `  async ${methodName}(${paramList}): Promise<${responseType}> {`;
  
  // Build URL with path parameter replacement
  const escapedPath = path.replace(/`/g, '\\`').replace(/\${/g, '\\${');
  let urlCode = `    let url = \`\${this.baseUrl}${escapedPath}\`;`;
  
  if (pathParams.length > 0) {
    pathParams.forEach(param => {
      urlCode += `\n    url = url.replace(/{${param}}/g, encodeURIComponent(String(${param})));`;
    });
  }
  
  if (queryParams.length > 0) {
    urlCode += `\n    const queryParams = new URLSearchParams();`;
    queryParams.forEach(param => {
      urlCode += `\n    if (${param} !== undefined) queryParams.append('${param}', String(${param}));`;
    });
    urlCode += `\n    const queryString = queryParams.toString();`;
    urlCode += `\n    if (queryString) url += \`?\${queryString}\`;`;
  }
  
  const fetchCode = hasBody
    ? `    const response = await fetch(url, {\n      method: '${httpMethod}',\n      headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify(body),\n    });`
    : `    const response = await fetch(url, {\n      method: '${httpMethod}',\n    });`;
  
  return `${methodSignature}
${urlCode}
${fetchCode}
    if (!response.ok) {
      throw new Error(\`API error: \${response.status} \${response.statusText}\`);
    }
    return await response.json();
  }`;
}

function isAbsoluteUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

function resolveBaseUrl(spec: any, inputUrl?: string): string {
  const serverUrl = spec.servers?.[0]?.url;
  const warn = (msg: string) => { console.warn(`⚠️  ${msg}`); console.warn('   Override by passing baseUrl to the ApiClient constructor'); };
  
  if (!serverUrl) {
    if (inputUrl && isAbsoluteUrl(inputUrl)) {
      try {
        const u = new URL(inputUrl);
        const resolved = `${u.protocol}//${u.host}`;
        warn(`No servers field, inferred: ${resolved}`);
        return resolved;
      } catch { /* fall through */ }
    }
    warn('No servers field, using https://api.example.com');
    return 'https://api.example.com';
  }
  
  if (isAbsoluteUrl(serverUrl)) return serverUrl;
  
  if (inputUrl && isAbsoluteUrl(inputUrl)) {
    try {
      const u = new URL(inputUrl);
      const resolved = new URL(serverUrl, `${u.protocol}//${u.host}`).toString().replace(/\/$/, '');
      warn(`Relative server URL resolved to: ${resolved}`);
      return resolved;
    } catch { /* fall through */ }
  }
  warn(`Relative server URL "${serverUrl}" unresolved, using https://api.example.com`);
  return 'https://api.example.com';
}

function generateIndex(title: string): string {
  return `export { ApiClient } from './client.js';
export * from './types.js';
`;
}

function generateTests(spec: any): string {
  const paths = spec.paths || {};
  const tests: string[] = [];
  
  tests.push(`import { test, expect } from 'bun:test';`);
  tests.push(`import { ApiClient } from './client.js';`);
  tests.push(``);
  tests.push(`const client = new ApiClient();`);
  tests.push(``);
  tests.push(`test('client instantiates correctly', () => {`);
  tests.push(`  expect(client).toBeInstanceOf(ApiClient);`);
  tests.push(`});`);
  tests.push(``);
  
  // Generate tests for GET endpoints (safest to test)
  const getEndpoints: Array<{methodName: string, path: string, operation: any}> = [];
  
  for (const [path, pathItem] of Object.entries(paths)) {
    const pathObj = pathItem as any;
    
    for (const [method, operation] of Object.entries(pathObj)) {
      if (method.toLowerCase() === 'get') {
        const op = operation as any;
        const methodName = generateMethodName(path, method, op.operationId);
        getEndpoints.push({ methodName, path, operation: op });
      }
    }
  }
  
  // Limit to first 10 GET endpoints to keep tests manageable
  const endpointsToTest = getEndpoints.slice(0, 10);
  
  for (const { methodName, path, operation } of endpointsToTest) {
    const params = operation.parameters || [];
    const pathParams = params.filter((p: any) => p.in === 'path');
    const queryParams = params.filter((p: any) => p.in === 'query');
    const responseSchema = operation.responses?.['200'] || operation.responses?.['201'] || operation.responses?.['default'];
    const responseType = responseSchema?.content?.['application/json']?.schema;
    const isArray = responseType?.type === 'array';
    const isObject = responseType?.type === 'object' || responseType?.$ref;
    
    // Skip if requires path params (hard to test without real IDs)
    if (pathParams.length > 0) {
      continue;
    }
    
    const testName = methodName.replace(/_/g, ' ');
    tests.push(`test('${testName} returns ${isArray ? 'array' : 'object'}', async () => {`);
    
    // Build method call with minimal params
    const callParams: string[] = [];
    if (queryParams.length > 0) {
      // Use first query param if it's a number (like limit)
      const limitParam = queryParams.find((p: any) => 
        p.name === 'limit' && (p.schema?.type === 'number' || p.schema?.type === 'integer')
      );
      if (limitParam) {
        callParams.push('5');
      }
    }
    
    const methodCall = callParams.length > 0 
      ? `await client.${methodName}(${callParams.join(', ')})`
      : `await client.${methodName}()`;
    
    tests.push(`  const result = ${methodCall};`);
    
    if (isArray) {
      tests.push(`  expect(Array.isArray(result)).toBe(true);`);
      if (callParams.length > 0) {
        tests.push(`  expect(result.length).toBeLessThanOrEqual(5);`);
      }
    } else {
      tests.push(`  expect(typeof result).toBe('object');`);
    }
    
    tests.push(`});`);
    tests.push(``);
  }
  
  // Test query params if we have endpoints with limit/skip
  const paginatedEndpoint = getEndpoints.find(e => {
    const params = e.operation.parameters || [];
    return params.some((p: any) => p.in === 'query' && (p.name === 'limit' || p.name === 'skip'));
  });
  
  if (paginatedEndpoint && paginatedEndpoint.methodName) {
    const methodName = paginatedEndpoint.methodName;
    tests.push(`test('${methodName} with skip works', async () => {`);
    tests.push(`  const first = await client.${methodName}(5, 0);`);
    tests.push(`  const second = await client.${methodName}(5, 5);`);
    tests.push(`  expect(first).not.toEqual(second);`);
    tests.push(`});`);
    tests.push(``);
  }
  
  return tests.join('\n');
}
