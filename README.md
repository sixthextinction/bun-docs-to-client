# What it is: 

A Bun CLI that generates a typed TypeScript client from an OpenAPI JSON spec.

# What it does:

1.  Takes a OpenAPI/Swagger spec -- given as a URL or local JSON (e.g., https://api.example.com/docs OR ./specs/docs.json)

2.  Fetches and validates the OpenAPI spec

3.  Generates TypeScript client files from it:

-   types.ts  — interfaces/types from components.schemas

-   client.ts — ApiClient class with typed methods for each endpoint

-   index.ts — exports

-   client.test.ts — **opinionated** test suite (see Testing section below)

5.  Writes files to ./generated/

# Example usage:

> bun  run  index.ts  https://petstore3.swagger.io/api/v3/openapi.json

# Output: 

A ready-to-use, typed Bun client you can import and use immediately.

# Server URL Handling

The generator uses a **hybrid strategy** to handle OpenAPI server URLs, which can sometimes be relative or missing:

## How we resolve server URLs:

1. **Absolute URL in spec** → Use it directly
   - Example: `"servers": [{"url": "https://api.example.com"}]` → Uses `https://api.example.com`

2. **Relative URL + Input is URL** → Resolve using input URL origin
   - Input: `https://petstore3.swagger.io/api/v3/openapi.json`
   - Spec: `"servers": [{"url": "/api/v3"}]`
   - Resolved: `https://petstore3.swagger.io/api/v3`
   - Uses `new URL(relativePath, inputOrigin)` for proper resolution

3. **Relative URL + Input is file** → Warn + placeholder
   - Input: `./specs/openapi.json`
   - Spec: `"servers": [{"url": "/api/v1"}]`
   - Result: Warning + uses `https://api.example.com` placeholder
   - **You must override** by passing `baseUrl` to the ApiClient constructor

4. **No server field + Input is URL** → Infer from input URL
   - Input: `https://api.example.com/docs.json`
   - No servers field in spec
   - Inferred: `https://api.example.com`
   - Warning shown to verify correctness

5. **No server field + Input is file** → Placeholder
   - Uses `https://api.example.com` placeholder
   - **You must override** by passing `baseUrl` to the ApiClient constructor

## Overriding the base URL:

If the auto-resolved URL is incorrect, override it when creating the client:

```typescript
import { ApiClient } from './generated/site_name/client.js';

const client = new ApiClient('https://correct-api-url.com');
```

# Testing

The generator automatically creates `client.test.ts` with an **opinionated** test suite. Here's what we test:

## What gets tested:

- ✅ **Client instantiation** - Verifies the client can be created
- ✅ **GET endpoints** (up to 10) - Tests endpoints that don't require path parameters
- ✅ **Array responses** - Verifies endpoints return arrays when expected
- ✅ **Object responses** - Verifies endpoints return objects when expected
- ✅ **Query parameters** - Tests pagination (limit/skip) when available

## What doesn't get tested:

- ❌ **POST/PUT/PATCH/DELETE** - These require real data and can have side effects
- ❌ **Endpoints with path parameters** - Requires real IDs/resources
- ❌ **Authentication** - No auth headers are added
- ❌ **Error cases** - Only tests happy paths

## Running tests:

```bash
bun test generated/[site-name]/client.test.ts
```

**Note:** Tests make real HTTP requests to the API. Ensure the API is accessible and you have network connectivity.