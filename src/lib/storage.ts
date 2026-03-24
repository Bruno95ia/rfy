import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Obtém o corpo (string) de um objeto no bucket uploads
 */
export async function getObjectBody(storagePath: string): Promise<string> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from('uploads')
    .download(storagePath);

  if (error) throw new Error(`Storage error: ${error.message}`);
  if (!data) throw new Error('Arquivo vazio');

  return await data.text();
}

/** Corpo binário (Excel ou texto) do bucket uploads. */
export async function getObjectBuffer(storagePath: string): Promise<Buffer> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from('uploads').download(storagePath);

  if (error) throw new Error(`Storage error: ${error.message}`);
  if (!data) throw new Error('Arquivo vazio');

  const ab = await data.arrayBuffer();
  return Buffer.from(ab);
}

/** Arquivos do repositório Conhecimento (bucket `knowledge`). */
export async function getKnowledgeBuffer(storagePath: string): Promise<Buffer> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from('knowledge').download(storagePath);

  if (error) throw new Error(`Storage error: ${error.message}`);
  if (!data) throw new Error('Arquivo vazio');

  const ab = await data.arrayBuffer();
  return Buffer.from(ab);
}
