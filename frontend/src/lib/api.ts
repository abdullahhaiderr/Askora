export interface FAQ {
  id: string;
  question: string;
  answer: string;
  alternatives: string[];
  category: string;
}
export interface ChatResponse {
  question: string;
  answer: string;
  faq_id: string | null;
  category: string | null;
  relevance: number | null;
  status: 'matched' | 'no_match';
  fallback: boolean;
  suggestions: string[];
}
export interface FAQCollection { faqs: FAQ[]; count: number }
const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await fetch(`${base}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers }, signal: options?.signal }); }
  catch { throw new ApiError('Unable to reach Askora. Check that the API server is running and try again.', 0); }
  if (!response.ok) {
    const data = await response.json().catch(() => ({})) as { detail?: string | { msg?: string }[] };
    const details = Array.isArray(data.detail) ? data.detail.map(x => x.msg).join(', ') : data.detail;
    throw new ApiError(details || `Request failed (${response.status})`, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
export const api = {
  chat: (question: string) => request<ChatResponse>('/api/chat', { method: 'POST', body: JSON.stringify({ question }) }),
  faqs: (query = '', category = '') => request<FAQCollection>(`/api/faqs?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}`),
  add: (faq: FAQ, key: string) => request<FAQ>('/api/faqs', { method: 'POST', headers: { 'X-Admin-Key': key }, body: JSON.stringify(faq) }),
  edit: (faq: FAQ, key: string) => request<FAQ>(`/api/faqs/${encodeURIComponent(faq.id)}`, { method: 'PUT', headers: { 'X-Admin-Key': key }, body: JSON.stringify(faq) }),
  remove: (id: string, key: string) => request<void>(`/api/faqs/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { 'X-Admin-Key': key } }),
};
