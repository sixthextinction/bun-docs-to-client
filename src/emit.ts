import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

interface ClientCode {
  client: string;
  types: string;
  zod?: string;
  index: string;
  tests: string;
}

export async function emitFiles(code: ClientCode, siteName: string): Promise<void> {
  const outputDir = join(process.cwd(), 'generated', siteName);
  
  // Create output directory
  await mkdir(outputDir, { recursive: true });
  
  // Write files
  await writeFile(join(outputDir, 'client.ts'), code.client, 'utf-8');
  await writeFile(join(outputDir, 'types.ts'), code.types, 'utf-8');
  await writeFile(join(outputDir, 'index.ts'), code.index, 'utf-8');
  await writeFile(join(outputDir, 'client.test.ts'), code.tests, 'utf-8');
  
  if (code.zod) {
    await writeFile(join(outputDir, 'zod.ts'), code.zod, 'utf-8');
  }
}
