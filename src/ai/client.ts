/**
 * The AI service client (TODO.ai-platform/01) — the ONE implementation of
 * the ai.oimlsmart.org browser surface, consumed by the AiBubble
 * component. The contract is the rag repo's worker_public
 * (docs/API.md there): POST /api/ask (SSE: citations → token* → done),
 * the /api/conversations CRUD (members), /auth/me, and the bubble bridge
 * sign-in (/auth/login?mode=bubble&origin=… → confirm → postMessage).
 *
 * Auth: the service session rides as `Authorization: Bearer <token>` —
 * the SameSite=Lax cookie never crosses origins and the estate bans
 * shared-domain cookies (the identity guide's SSO doctrine). Anonymous
 * callers send no token and get the public/anonymous tier.
 *
 * TODO.ai-platform/02: the ask body carries the declared context (the
 * panel's opt-in chips — see ./context.ts) and every response echoes
 * `context_applied`, which the panel records on the answer message so
 * the honest context line survives a resume.
 */

import type { AiAskContext, AiContextApplied } from './context'

export interface AiCitation {
  doc_id?: string
  docidentifier?: string
  edition?: string
  language?: string
  clause_anchor?: string
  clause_title?: string
  status?: string
  superseded_by?: string
  corpus?: string
  url?: string
  snippet?: string
  score?: number
}

export interface AiMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: AiCitation[] | null
  model?: string
  followUps?: string[]
  /** the context the service APPLIED to this answer (the honest context
   *  line's source); undefined on messages recorded before the chips */
  contextApplied?: AiContextApplied | null
  /** a chip was declared but the answer carried no echo (the service
   *  predates contexts) — the line says so rather than claiming it */
  contextUnapplied?: boolean
  at: number
}

export interface AiConversationMeta {
  id: string
  title: string
  updatedAt: number
  messageCount: number
}

export interface AiSession {
  token: string
  name: string | null
  expiresAt: number
}

export interface AiQuota {
  used: number
  limit: number
}

export interface AskEvents {
  onCitations?: (citations: AiCitation[], quota?: AiQuota, contextApplied?: AiContextApplied) => void
  onToken?: (token: string) => void
  onDone?: (info: { queryHash: string | null; followUps: string[]; model?: string; contextApplied?: AiContextApplied }) => void
}

export type AskResult =
  | { ok: true }
  | { ok: false; message: string; quotaExceeded?: boolean; authExpired?: boolean }

const JSON_HEADERS = { 'content-type': 'application/json' }

function authHeaders(token: string | null): Record<string, string> {
  return token ? { authorization: `Bearer ${token}` } : {}
}

/** Validate the service's context_applied echo — bounded, shape-checked,
 *  never trusted blindly (the honest context line renders from THIS). */
function asApplied(v: unknown): AiContextApplied | undefined {
  if (!v || typeof v !== 'object') return undefined
  const k = (v as { kind?: unknown }).kind
  if (k !== 'page' && k !== 'entity' && k !== 'document' && k !== 'none') return undefined
  const label = typeof (v as { label?: unknown }).label === 'string' ? ((v as { label: string }).label).slice(0, 120) : undefined
  const scoped = (v as { scoped_to?: unknown }).scoped_to
  const note = (v as { note?: unknown }).note
  return {
    kind: k,
    ...(label ? { label } : {}),
    scoped_to: typeof scoped === 'string' ? scoped.slice(0, 80) : null,
    ...(note === 'document-not-in-corpus' || note === 'question-document-wins' ? { note } : {}),
  }
}

/** POST /api/ask with stream:true; the service may answer with SSE or a
 *  plain JSON body (the cached path), both are handled. */
export async function ask(
  apiBase: string,
  token: string | null,
  body: { query: string; history?: { role: string; content: string }[]; conversation_id?: string; lang?: string; context?: AiAskContext },
  ev: AskEvents,
  signal?: AbortSignal,
): Promise<AskResult> {
  let res: Response
  try {
    res = await fetch(`${apiBase}/api/ask`, {
      method: 'POST',
      headers: { ...JSON_HEADERS, ...authHeaders(token) },
      body: JSON.stringify({ query: body.query, history: body.history, conversation_id: body.conversation_id, lang: body.lang, context: body.context, stream: true }),
      signal,
    })
  } catch (e: unknown) {
    if ((e as { name?: string })?.name === 'AbortError') throw e
    return { ok: false, message: 'The assistant is unreachable — check the connection and retry.' }
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    const code = data?.error?.code
    const message = data?.error?.message || `The assistant request failed (${res.status}).`
    return { ok: false, message, quotaExceeded: code === 'quota_exceeded', authExpired: res.status === 401 }
  }

  const ct = res.headers.get('content-type') ?? ''
  if (ct.includes('application/json')) {
    const data = await res.json().catch(() => null)
    const applied = asApplied(data?.context_applied)
    if (Array.isArray(data?.citations)) ev.onCitations?.(data.citations, data.quota, applied)
    if (typeof data?.answer === 'string') ev.onToken?.(data.answer)
    ev.onDone?.({
      queryHash: typeof data?.query_hash === 'string' ? data.query_hash : null,
      followUps: Array.isArray(data?.follow_ups) ? data.follow_ups.filter((s: unknown) => typeof s === 'string') : [],
      model: typeof data?.model === 'string' ? data.model : undefined,
      contextApplied: applied,
    })
    return { ok: true }
  }

  const reader = res.body?.getReader()
  if (!reader) return { ok: false, message: 'The assistant answered in an unreadable form.' }
  const decoder = new TextDecoder()
  let buf = ''
  let streamApplied: AiContextApplied | undefined
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const parts = buf.split('\n\n')
    buf = parts.pop() ?? ''
    for (const part of parts) {
      const line = part.trim()
      if (!line.startsWith('data:')) continue
      let evt: Record<string, unknown>
      try {
        evt = JSON.parse(line.slice(5).trim())
      } catch {
        continue
      }
      if (evt.type === 'citations') {
        streamApplied = asApplied(evt.context_applied) ?? streamApplied
        ev.onCitations?.(Array.isArray(evt.citations) ? (evt.citations as AiCitation[]) : [], evt.quota as AiQuota | undefined, streamApplied)
      } else if (evt.type === 'token') {
        if (typeof evt.v === 'string') ev.onToken?.(evt.v)
      } else if (evt.type === 'done') {
        ev.onDone?.({
          queryHash: typeof evt.query_hash === 'string' ? evt.query_hash : null,
          followUps: Array.isArray(evt.follow_ups) ? (evt.follow_ups as unknown[]).filter((s): s is string => typeof s === 'string') : [],
          model: typeof evt.model === 'string' ? evt.model : undefined,
          contextApplied: asApplied(evt.context_applied) ?? streamApplied,
        })
      } else if (evt.type === 'error') {
        return { ok: false, message: typeof evt.message === 'string' ? evt.message : 'The answer stream failed.' }
      }
    }
  }
  return { ok: true }
}

// ── Conversations (members; the service answers 401 for anonymous) ──

export async function listConversations(apiBase: string, token: string): Promise<AiConversationMeta[] | null> {
  try {
    const res = await fetch(`${apiBase}/api/conversations`, { headers: authHeaders(token) })
    if (!res.ok) return null
    const data = await res.json().catch(() => null)
    if (!Array.isArray(data?.conversations)) return []
    return data.conversations.map((c: Record<string, unknown>) => ({
      id: String(c.id),
      title: typeof c.title === 'string' && c.title ? c.title : 'Untitled conversation',
      updatedAt: Date.parse(String(c.updated_at ?? '')) || 0,
      messageCount: Number(c.messages ?? 0) || 0,
    }))
  } catch {
    return null
  }
}

export async function createConversation(apiBase: string, token: string, title: string): Promise<string | null> {
  try {
    const res = await fetch(`${apiBase}/api/conversations`, {
      method: 'POST',
      headers: { ...JSON_HEADERS, ...authHeaders(token) },
      body: JSON.stringify({ title: title.slice(0, 120) }),
    })
    if (!res.ok) return null
    const data = await res.json().catch(() => null)
    return typeof data?.id === 'string' ? data.id : null
  } catch {
    return null
  }
}

export async function getConversation(apiBase: string, token: string, id: string): Promise<{ title: string; messages: AiMessage[] } | null> {
  try {
    const res = await fetch(`${apiBase}/api/conversations/${encodeURIComponent(id)}`, { headers: authHeaders(token) })
    if (!res.ok) return null
    const data = await res.json().catch(() => null)
    if (!data?.conversation) return null
    const messages: AiMessage[] = (Array.isArray(data.messages) ? data.messages : [])
      .filter((m: Record<string, unknown>) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .map((m: Record<string, unknown>) => ({
        id: String(m.id ?? crypto.randomUUID()),
        role: m.role as 'user' | 'assistant',
        content: m.content as string,
        citations: Array.isArray(m.citations) ? (m.citations as AiCitation[]) : null,
        model: typeof m.model === 'string' ? m.model : undefined,
        contextApplied: asApplied(m.context_applied) ?? null,
        at: Date.parse(String(m.at ?? '')) || 0,
      }))
    return { title: typeof data.conversation.title === 'string' ? data.conversation.title : 'Untitled conversation', messages }
  } catch {
    return null
  }
}

export async function appendMessage(
  apiBase: string,
  token: string,
  conversationId: string,
  msg: { role: 'user' | 'assistant'; content: string; citations?: AiCitation[] | null; model?: string; contextApplied?: AiContextApplied | null },
): Promise<boolean> {
  try {
    const res = await fetch(`${apiBase}/api/conversations/${encodeURIComponent(conversationId)}/messages`, {
      method: 'POST',
      headers: { ...JSON_HEADERS, ...authHeaders(token) },
      body: JSON.stringify({ role: msg.role, content: msg.content, citations: msg.citations ?? undefined, model: msg.model, context_applied: msg.contextApplied ?? undefined }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function deleteConversation(apiBase: string, token: string, id: string): Promise<boolean> {
  try {
    const res = await fetch(`${apiBase}/api/conversations/${encodeURIComponent(id)}`, { method: 'DELETE', headers: authHeaders(token) })
    return res.ok
  } catch {
    return false
  }
}

// ── The sign-in bridge ──

export interface MeResponse {
  authenticated: boolean
  name: string | null
  email: string | null
  tier: 'member' | 'anon'
}

export async function fetchMe(apiBase: string, token: string): Promise<MeResponse | null> {
  try {
    const res = await fetch(`${apiBase}/auth/me`, { headers: authHeaders(token) })
    if (!res.ok) return null
    const data = await res.json().catch(() => null)
    if (!data || typeof data.authenticated !== 'boolean') return null
    return data as MeResponse
  } catch {
    return null
  }
}

/** Open the service's bubble sign-in popup and wait for the confirm
 *  page's postMessage. Resolves null when the popup is closed without
 *  completing. The listener validates the message origin EXACTLY against
 *  the service origin and the payload shape before accepting. */
export function openBubbleSignIn(apiBase: string): Promise<AiSession | null> {
  return new Promise((resolve) => {
    const origin = window.location.origin
    const url = `${apiBase}/auth/login?mode=bubble&origin=${encodeURIComponent(origin)}`
    const popup = window.open(url, 'oimlsmart-ai-signin', 'width=540,height=680')
    if (!popup) {
      resolve(null)
      return
    }
    let settled = false
    const finish = (session: AiSession | null) => {
      if (settled) return
      settled = true
      window.removeEventListener('message', onMessage)
      clearInterval(closedPoll)
      resolve(session)
    }
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== apiBase) return
      const d = e.data
      if (!d || d.type !== 'oimlsmart-ai-session' || typeof d.token !== 'string') return
      finish({ token: d.token, name: typeof d.name === 'string' ? d.name : null, expiresAt: Number(d.expiresAt) || 0 })
    }
    const closedPoll = window.setInterval(() => {
      if (popup.closed) finish(null)
    }, 500)
    window.addEventListener('message', onMessage)
  })
}

const SESSION_STORAGE_KEY = 'oimlsmart-ai:session'

/** The session token persists per-tab (sessionStorage) — survives
 *  reloads, dies with the tab, never touches localStorage. */
export function loadStoredSession(apiBase: string): AiSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed?.apiBase !== apiBase || typeof parsed?.token !== 'string') return null
    if (typeof parsed.expiresAt === 'number' && parsed.expiresAt < Date.now() + 60_000) return null
    return { token: parsed.token, name: typeof parsed.name === 'string' ? parsed.name : null, expiresAt: Number(parsed.expiresAt) || 0 }
  } catch {
    return null
  }
}

export function storeSession(apiBase: string, session: AiSession): void {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ apiBase, ...session }))
  } catch {
    /* storage full or denied — the session lives in memory only */
  }
}

export function clearStoredSession(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

// ── Anonymous local conversations (on this device only) ──

const LOCAL_STORAGE_KEY = 'oimlsmart-ai:local-conversations'
const LOCAL_MAX_CONVERSATIONS = 20
const LOCAL_MAX_MESSAGES = 100

export interface LocalConversation {
  id: string
  title: string
  updatedAt: number
  messages: AiMessage[]
}

export function loadLocalConversations(): LocalConversation[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((c) => c && typeof c.id === 'string' && Array.isArray(c.messages)) : []
  } catch {
    return []
  }
}

export function saveLocalConversations(list: LocalConversation[]): void {
  try {
    const trimmed = list
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, LOCAL_MAX_CONVERSATIONS)
      .map((c) => ({ ...c, messages: c.messages.slice(-LOCAL_MAX_MESSAGES) }))
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    /* storage full or denied — local history simply won't persist */
  }
}
