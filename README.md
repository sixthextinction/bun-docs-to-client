# docs-to-client

Generate a typed TypeScript client from OpenAPI specs or HTML documentation.

## Usage

```bash
bunx docs-to-client <url-or-file>
```

Or:

```bash
bun run index.ts <url-or-file>
```

**Examples:**
```bash
# From URL to a OpenAPI JSON
bunx docs-to-client https://petstore3.swagger.io/api/v3/openapi.json
# or from disk
bunx docs-to-client ./specs/openapi.json

# From HTML documentation URL (auto-parses & generates OpenAPI spec)
bunx docs-to-client https://swapi.dev/api

# Skip generation of test for generated API client
bunx docs-to-client ./specs/openapi.json --no-tests
```

## Standalone Executable

Build a single binary (no Bun required at runtime):

```bash
bun run build
./bin/dtoc.exe <url-or-file>
```

The default build targets Windows x64. For other platforms, override the target:

```bash
# Linux x64
bun build --compile --target=bun-linux-x64 ./index.ts --outfile ./bin/dtoc

# macOS (Apple Silicon)
bun build --compile --target=bun-darwin-arm64 ./index.ts --outfile ./bin/dtoc

# macOS (Intel)
bun build --compile --target=bun-darwin-x64 ./index.ts --outfile ./bin/dtoc
```

## What it does

1. **Accepts OpenAPI JSON or HTML docs** - Automatically detects and converts HTML docs to OpenAPI using LLM
2. **Generates TypeScript client** - Creates typed client code in `./generated/[site-name]/`:
   - `client.ts` - ApiClient class with methods for each endpoint
   - `types.ts` - TypeScript interfaces from schemas
   - `index.ts` - Exports
   - `client.test.ts` - Test suite (optional; use `--no-tests` to skip)

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

```

## Development

```bash
# Install dependencies
bun install

# Run directly
bun run index.ts <url-or-file>

# Build executable
bun run build
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
