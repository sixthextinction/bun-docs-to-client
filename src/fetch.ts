import { mkdir } from 'fs/promises';
import { join } from 'path';

let proxyStatusLogged = false;

/**
 * Get proxy configuration from environment variables (currently only hardcoded Bright Data format)
 * Returns fetch options with proxy if configured, empty object otherwise
 * Logs proxy status on first call
 */
export function getProxyOptions(): Record<string, any> {
  const customerId = process.env.BRIGHT_DATA_CUSTOMER_ID;
  const zone = process.env.BRIGHT_DATA_ZONE;
  const password = process.env.BRIGHT_DATA_PASSWORD;
  
  if (customerId && zone && password) {
    if (!proxyStatusLogged) {
      console.log('Proxy config found! Using proxy to fetch docs site.');
      proxyStatusLogged = true;
    }
    const proxy = `http://brd-customer-${customerId}-zone-${zone}:${password}@brd.superproxy.io:33335`;
    return {
      proxy,
      tls: {
        rejectUnauthorized: false, // Required for Bright Data proxy
      },
    };
  }
  
  if (!proxyStatusLogged) {
    console.log('No proxy config found, using direct connection');
    proxyStatusLogged = true;
  }
  
  return {};
}

export function isUrl(input: string): boolean {
  return input.startsWith('http://') || input.startsWith('https://');
}

export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  
  // If it's a file path, return as-is (don't modify)
  if (!isUrl(trimmed)) {
    return trimmed;
  }
  
  // If already ends with .json, return as-is
  if (trimmed.endsWith('.json')) {
    return trimmed;
  }
  
  // Remove trailing slash if present
  const cleaned = trimmed.replace(/\/$/, '');
  
  // Append .json
  return `${cleaned}.json`;
}

/** Unified: site identifier for output dirs and spec filenames */
export function toSiteId(input: string): string {
  if (isUrl(input)) {
    try {
      return new URL(input).hostname.replace(/\./g, '_');
    } catch {
      return input.replace(/[^a-zA-Z0-9]/g, '_');
    }
  }
  const pathParts = input.split(/[/\\]/);
  const filename = pathParts[pathParts.length - 1] || 'spec';
  return filename.replace(/\.json$/, '').replace(/\./g, '_');
}

export function toSpecFilename(input: string): string {
  return `${toSiteId(input)}.json`;
}

export async function detectContentType(url: string): Promise<'html' | 'json'> {
  try {
    const proxyOptions = getProxyOptions();
    const response = await fetch(url, { 
      method: 'HEAD',
      ...proxyOptions,
    } as any);
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('html')) {
      return 'html';
    }
    if (contentType.includes('json')) {
      return 'json';
    }
    
    // Fallback: try GET and check first bytes
    const fullResponse = await fetch(url, proxyOptions as any);
    const text = await fullResponse.text();
    const trimmed = text.trim();
    
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return 'json';
    }
    
    return 'html';
  } catch {
    // Default to HTML if detection fails
    return 'html';
  }
}

export async function fetchOpenAPI(input: string): Promise<any> {
  // Handle file paths
  if (!isUrl(input)) {
    const file = Bun.file(input);
    if (!await file.exists()) {
      throw new Error(`File not found: ${input}`);
    }
    return await file.json();
  }
  
  // Handle URLs - fetch and cache
  const proxyOptions = getProxyOptions();
  const response = await fetch(input, {
    headers: {
      'Accept': 'application/json',
    },
    ...proxyOptions,
  } as any);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
  }
  
  const spec = await response.json();
  await cacheSpec(spec, input);
  return spec;
}

export async function cacheSpec(spec: any, input: string): Promise<void> {
  const specsDir = join(process.cwd(), 'specs');
  await mkdir(specsDir, { recursive: true });
  const filename = toSpecFilename(input);
  const cachePath = join(specsDir, filename);
  await Bun.write(cachePath, JSON.stringify(spec, null, 2));
  console.log(`Cached spec to ./specs/${filename}`);
}
