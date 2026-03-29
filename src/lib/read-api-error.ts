/**
 * Lê mensagem de erro de respostas JSON ou texto (413 HTML, etc.).
 */
export async function readApiErrorMessage(res: Response): Promise<string> {
  const raw = await res.text();
  try {
    const j = JSON.parse(raw) as { error?: unknown; message?: unknown };
    if (typeof j.error === 'string' && j.error.trim()) return j.error;
    if (typeof j.message === 'string' && j.message.trim()) return j.message;
  } catch {
    /* não é JSON */
  }
  const t = raw.trim().slice(0, 800);
  if (t) {
    if (res.status === 413 || /413|Request Entity Too Large|entity too large/i.test(t)) {
      return 'Arquivo demasiado grande para o proxy (nginx). O limite no servidor foi aumentado; se persistir, contacte o suporte.';
    }
    return t;
  }
  if (res.status === 413) {
    return 'Arquivo muito grande (413). O proxy pode estar a limitar o body — verifique client_max_body_size no nginx.';
  }
  if (res.status === 401) return 'Sessão expirada ou não autenticado. Entre novamente.';
  if (res.status === 403) return 'Sem permissão para esta operação.';
  return `Erro HTTP ${res.status}`;
}
