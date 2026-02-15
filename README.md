# docs-to-cli

Generate a typed TypeScript client from OpenAPI specs or HTML documentation.

## Installation

```bash
# Using Bun (recommended)
bunx docs-to-cli <url-or-file>

# Or build standalone executable
bun run build
./bin/dtoc.exe <url-or-file>
```

## Usage

```bash
bunx docs-to-cli <url-or-file>
```

**Examples:**
```bash
# From OpenAPI JSON
bunx docs-to-cli https://petstore3.swagger.io/api/v3/openapi.json
bunx docs-to-cli ./specs/openapi.json

# From HTML documentation (auto-converts to OpenAPI)
bunx docs-to-cli https://swapi.dev/api
bunx docs-to-cli ./docs.html
```

## What it does

1. **Accepts OpenAPI JSON or HTML docs** - Automatically detects and converts HTML docs to OpenAPI using LLM
2. **Generates TypeScript client** - Creates typed client code in `./generated/[site-name]/`:
   - `client.ts` - ApiClient class with methods for each endpoint
   - `types.ts` - TypeScript interfaces from schemas
   - `index.ts` - Exports
   - `client.test.ts` - Test suite

## Features

- ✅ **HTML docs → OpenAPI** - Uses Ollama LLM to extract endpoints from HTML documentation
- ✅ **Smart method naming** - Generates unique names like `getPeopleById()`, `getFilmsSchema()`
- ✅ **Path & query parameters** - Supports path params (`{id}`) and query params
- ✅ **Server URL resolution** - Handles relative URLs, missing servers, infers from input URL
- ✅ **Type-safe** - Full TypeScript types from OpenAPI schemas

## Generated Client Example

```typescript
import { ApiClient } from './generated/swapi_dev/client.js';

const client = new ApiClient('https://swapi.dev/api');

// List endpoints
const people = await client.getPeople();
const films = await client.getFilms();

// By ID endpoints
const person = await client.getPeopleById('1');
const film = await client.getFilmsById('1');

// Schema endpoints
const schema = await client.getPeopleSchema();
```

## Development

```bash
# Install dependencies
bun install

# Run directly
bun run index.ts <url-or-file>

# Build executable
bun run build

# Run tests
bun test
```

## Requirements

- **Bun** runtime (for development/building)
- **Ollama** (for HTML docs conversion) - Set `OLLAMA_URL` and `OLLAMA_MODEL` env vars if needed
  - Default: `http://localhost:11434`
  - Default model: `hf.co/unsloth/Qwen3-4B-Instruct-2507-GGUF:Q4_K_M`

## Server URL Handling

The generator resolves server URLs automatically:
- Absolute URLs → Used directly
- Relative URLs → Resolved from input URL origin
- Missing servers → Inferred from input URL or uses placeholder

Override if needed:
```typescript
const client = new ApiClient('https://correct-api-url.com');
```
