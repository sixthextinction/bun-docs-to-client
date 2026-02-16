import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

interface ClientCode {
  client: string;
  types: string;
  index: string;
  tests: string;
}

export async function emitFiles(code: ClientCode, siteName: string): Promise<void> {
  const outputDir = join(process.cwd(), 'generated', siteName);
  
  await mkdir(outputDir, { recursive: true });
  
  await writeFile(join(outputDir, 'client.ts'), code.client, 'utf-8');
  await writeFile(join(outputDir, 'types.ts'), code.types, 'utf-8');
  await writeFile(join(outputDir, 'index.ts'), code.index, 'utf-8');
  if (code.tests) {
    await writeFile(join(outputDir, 'client.test.ts'), code.tests, 'utf-8');
  }
}
