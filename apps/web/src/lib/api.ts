// Em produção a API é servida pelo mesmo host do front, então o caminho
// relativo é o padrão seguro: se VITE_API_URL faltar no build, o app continua
// funcionando em vez de apontar para localhost.
const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

// A validação do Nest devolve message como lista ("campo X inválido", ...).
function errorMessage(body: { message?: string | string[] } | null, fallback: string): string {
  const message = body?.message;
  return Array.isArray(message) ? message.join(' ') : (message ?? fallback);
}

const authHeader = (): Record<string, string> => {
  const token = localStorage.getItem('crealio.token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      // Com FormData o navegador monta o Content-Type com o boundary do multipart.
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...authHeader(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(errorMessage(body, response.statusText), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path: string) => request<void>(path, { method: 'DELETE' }),
  upload: <T>(path: string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    return request<T>(path, { method: 'POST', body: form })
  },

  // XMLHttpRequest e não fetch: é o único jeito de acompanhar o progresso do
  // envio, e um modelo 3D pode ter até 200MB.
  uploadWithProgress: <T>(path: string, file: File, onProgress: (percent: number) => void) =>
    new Promise<T>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_URL}${path}`);
      for (const [name, value] of Object.entries(authHeader())) xhr.setRequestHeader(name, value);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
      };
      xhr.onload = () => {
        const body = (() => {
          try {
            return JSON.parse(xhr.responseText);
          } catch {
            return null;
          }
        })();
        if (xhr.status >= 200 && xhr.status < 300) resolve(body as T);
        else if (xhr.status === 413) reject(new ApiError('Arquivo maior que o permitido (200MB).', 413));
        else reject(new ApiError(errorMessage(body, 'Não foi possível enviar o arquivo.'), xhr.status));
      };
      xhr.onerror = () => reject(new ApiError('Falha de conexão ao enviar o arquivo.', 0));
      const form = new FormData();
      form.append('file', file);
      xhr.send(form);
    }),

  // Download autenticado: um <a href> não manda o token, então o arquivo vem
  // por fetch e é salvo com o nome original.
  download: async (path: string, fileName: string) => {
    const response = await fetch(`${API_URL}${path}`, { headers: authHeader() });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new ApiError(errorMessage(body, 'Não foi possível baixar o arquivo.'), response.status);
    }
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
