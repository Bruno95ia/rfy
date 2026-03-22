import { readFile } from 'fs/promises';
import { join } from 'path';
import { NextResponse } from 'next/server';

/**
 * Next.js App Router não expõe ficheiros `.html` em `/public` como estáticos (404).
 * Este handler serve o mockup com o mesmo conteúdo do ficheiro em public/.
 */
export async function GET() {
  const path = join(process.cwd(), 'public', 'mockup-rfy-ui-v2.html');
  const html = await readFile(path, 'utf-8');
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
}
