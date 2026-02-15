import { mkdir, readFile, writeFile, access } from 'fs/promises';
import { join } from 'path';

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

export function urlToFilename(url: string): string {
  try {
    const urlObj = new URL(url);
    // Convert domain to filename: cataas.com -> cataas_com.json
    const domain = urlObj.hostname.replace(/\./g, '_');
    return `${domain}.json`;
  } catch {
    // Fallback if URL parsing fails
    const sanitized = url.replace(/[^a-zA-Z0-9]/g, '_');
    return `${sanitized}.json`;
  }
}

export function extractSiteName(input: string): string {
  // If it's a URL, extract domain
  if (isUrl(input)) {
    try {
      const urlObj = new URL(input);
      return urlObj.hostname.replace(/\./g, '_');
    } catch {
      const sanitized = input.replace(/[^a-zA-Z0-9]/g, '_');
      return sanitized;
    }
  }
  
  // If it's a file path, extract from filename
  const pathParts = input.split(/[/\\]/);
  const filename = pathParts[pathParts.length - 1];
  // Remove .json extension if present
  return filename.replace(/\.json$/, '').replace(/\./g, '_');
}

export async function fetchOpenAPI(input: string): Promise<any> {
  // Handle file paths
  if (!isUrl(input)) {
    // Bun-specific API (commented out for portability - replaced with Node.js equivalents)
    // const file = Bun.file(input);
    // if (!await file.exists()) {
    //   throw new Error(`File not found: ${input}`);
    // }
    // return await file.json();
    
    // Node.js equivalent for portability
    try {
      await access(input);
    } catch {
      throw new Error(`File not found: ${input}`);
    }
    const content = await readFile(input, 'utf-8');
    return JSON.parse(content);
  }
  
  // Handle URLs - fetch and cache
  const response = await fetch(input, {
    headers: {
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
  }
  
  const spec = await response.json();
  
  // Cache the spec locally
  const specsDir = join(process.cwd(), 'specs');
  await mkdir(specsDir, { recursive: true });
  
  const filename = urlToFilename(input);
  const cachePath = join(specsDir, filename);
  // Bun-specific API (commented out for portability - replaced with Node.js equivalents)
  // await Bun.write(cachePath, JSON.stringify(spec, null, 2));
  
  // Node.js equivalent for portability
  await writeFile(cachePath, JSON.stringify(spec, null, 2), 'utf-8');
  console.log(`💾 Cached spec to ./specs/${filename}`);
  
  return spec;
}
