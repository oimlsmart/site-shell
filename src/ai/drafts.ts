/**
 * The draft acts (TODO.ai-platform/04) — the act-with-confirmation wave's
 * panel half. The AI service PREPARES an act; the panel renders the
 * draft card; the commit is always the user's own authority, through
 * the platform's own write path. The AI never holds a write credential
 * and neither does the panel: the draft rides the DOM event seam to the
 * host, never a write API.
 *
 * Two acts (the wire shape is the rag repo's contract, docs/API.md
 * §2.1.3 there; the types below are the panel-side mirror):
 *
 *   - `application_prefill` (the pilot, /04): the card opens the draft
 *     in the HOST's real form — the commit is the user's own click
 *     there. Record-class by doctrine.
 *   - `api_call` (/09): the assistant proposes one preference-family
 *     operation. The panel pre-flights it to the host on arrival — an
 *     active standing grant executes inline (the card never renders);
 *     otherwise the card renders marked with the HOST's declared act
 *     class and the user's tap re-dispatches with `confirmed: true`.
 *     Record-class targets are refused outright.
 *
 * The seam, one tiny surface (the mirror of src/ai/context.ts):
 *
 *   - The panel dispatches `oimlsmart:ai-draft` with the draft payload
 *     (the prefill on the card tap; the api_call on arrival and again,
 *     confirmed, on the card's own tap).
 *   - A host that understands drafts (the SMART platform's ai-drafts
 *     module) validates the payload, acts within its own gates, and
 *     answers with `oimlsmart:ai-draft-ack`. A refusal answers
 *     { accepted: false, reason } and the panel says so honestly; a
 *     host that never answers (a property without the draft seam)
 *     times out to the same honest note.
 */

/** The pilot act's fields — the application prefill. Every field is a
 *  value the USER stated in the conversation (the service's
 *  traceability guard dropped everything else); the instrument model's
 *  derivations never ride the draft (the real form derives them on
 *  open). */
export interface AiDraftFields {
  /** the Recommendation, as the publication URN (urn:oiml:pub:r:60:2021) */
  standard_doc: string
  standard_label?: string
  family_designation?: string
  group_label?: string
  model_designation?: string
  description?: string
  samples?: { serial: string; condition?: string }[]
  scheme?: 'A' | 'B'
}

export interface AiDraftDrop {
  field: string
  value: string
  reason: string
}

export interface AiDraft {
  kind: 'draft'
  act: 'application_prefill'
  version: 1
  title: string
  prepared_at: string
  /** ALWAYS true — the draft is an input to the real form, never a
   *  channel; the user's own click is the only commit. */
  requires_confirmation: true
  fields: AiDraftFields
  dropped?: AiDraftDrop[]
  notes?: string[]
}

// ── the api_call act (TODO.ai-platform/09) ────────────────────────────

/** The methods an api_call draft may name. The execution targets are
 *  the mutating operations; 'GET' rides for the one declared mutating
 *  read (the email mute probe — the taxonomy's named exception). */
export type AiApiCallMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'GET'

export interface AiApiCall {
  method: AiApiCallMethod
  /** a same-origin platform path (/api/…) — the host re-resolves it
   *  against its own assembled specification; nothing else executes */
  path: string
  body?: unknown
}

/** The api_call draft (TODO.ai-platform/09): the assistant proposes one
 *  platform operation out of the preference family — the standing
 *  grant's closed world. The panel PRE-FLIGHTS it to the host on
 *  arrival: an active grant executes inline and the card never renders;
 *  otherwise the card renders and the user's tap re-dispatches the same
 *  draft with `confirmed: true`. A record-class target is refused by
 *  the host outright — record acts commit through the platform's own
 *  surfaces, never through this seam. */
export interface AiApiCallDraft {
  kind: 'draft'
  act: 'api_call'
  version: 1
  title: string
  prepared_at: string
  requires_confirmation: true
  call: AiApiCall
  /** set by the PANEL on the user's confirm tap — never by the service */
  confirmed?: boolean
  notes?: string[]
}

export type AnyAiDraft = AiDraft | AiApiCallDraft

export const AI_DRAFT_EVENT = 'oimlsmart:ai-draft'
export const AI_DRAFT_ACK_EVENT = 'oimlsmart:ai-draft-ack'

export interface AiDraftAck {
  accepted: boolean
  reason?: string
  /** api_call acts: the host executed the operation (an accepted
   *  prefill instead waits on the user's own form commit); via names
   *  the authority that signed the execution. */
  executed?: boolean
  via?: 'grant' | 'confirmation'
  /** the HOST's declared act class for the target — the card's marker
   *  reads this, never the service's say-so */
  act_class?: 'record' | 'preference'
}

const str = (v: unknown, max: number): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined

/** Validate a draft arriving from the service — bounded, shape-checked,
 *  never trusted blindly (the card renders from THIS, and the host
 *  re-validates before the form sees it). Garbage degrades to null. */
export function asDraft(v: unknown): AiDraft | null {
  if (!v || typeof v !== 'object') return null
  const d = v as Record<string, unknown>
  if (d.kind !== 'draft' || d.act !== 'application_prefill' || d.version !== 1) return null
  if (d.requires_confirmation !== true) return null
  const title = str(d.title, 160)
  const preparedAt = str(d.prepared_at, 40)
  const f = d.fields as Record<string, unknown> | undefined
  const standardDoc = str(f?.standard_doc, 80)
  if (!title || !preparedAt || !f || !standardDoc) return null
  const fields: AiDraftFields = { standard_doc: standardDoc }
  const standardLabel = str(f.standard_label, 120)
  if (standardLabel) fields.standard_label = standardLabel
  for (const key of ['family_designation', 'group_label', 'model_designation', 'description'] as const) {
    const val = str(f[key], 300)
    if (val) fields[key] = val
  }
  if (f.scheme === 'A' || f.scheme === 'B') fields.scheme = f.scheme
  if (Array.isArray(f.samples)) {
    const samples = f.samples
      .slice(0, 12)
      .map((s) => {
        const serial = str((s as Record<string, unknown>)?.serial, 80)
        if (!serial) return null
        const condition = str((s as Record<string, unknown>)?.condition, 20)
        return condition ? { serial, condition } : { serial }
      })
      .filter((s): s is { serial: string; condition?: string } => s !== null)
    if (samples.length) fields.samples = samples
  }
  const dropped = Array.isArray(d.dropped)
    ? d.dropped
        .slice(0, 12)
        .map((x) => {
          const field = str((x as Record<string, unknown>)?.field, 60)
          const value = str((x as Record<string, unknown>)?.value, 120)
          const reason = str((x as Record<string, unknown>)?.reason, 120)
          return field && value && reason ? { field, value, reason } : null
        })
        .filter((x): x is AiDraftDrop => x !== null)
    : undefined
  const notes = Array.isArray(d.notes)
    ? d.notes.map((n) => str(n, 300)).filter((n): n is string => !!n).slice(0, 6)
    : undefined
  return {
    kind: 'draft',
    act: 'application_prefill',
    version: 1,
    title,
    prepared_at: preparedAt,
    requires_confirmation: true,
    fields,
    ...(dropped?.length ? { dropped } : {}),
    ...(notes?.length ? { notes } : {}),
  }
}

/** Validate an api_call draft arriving from the service — the same
 *  never-trusted posture as asDraft, with the call itself bounded: a
 *  method from the declared set, a same-origin /api/ path (no scheme,
 *  no host, no traversal), a body that serializes within bounds. The
 *  service never sets `confirmed` — a draft arriving confirmed is
 *  garbage (only the panel's own confirm tap sets it). */
export function asApiCallDraft(v: unknown): AiApiCallDraft | null {
  if (!v || typeof v !== 'object') return null
  const d = v as Record<string, unknown>
  if (d.kind !== 'draft' || d.act !== 'api_call' || d.version !== 1) return null
  if (d.requires_confirmation !== true) return null
  if (d.confirmed !== undefined) return null
  const title = str(d.title, 160)
  const preparedAt = str(d.prepared_at, 40)
  const c = d.call as Record<string, unknown> | undefined
  const method = str(c?.method, 8)?.toUpperCase() as AiApiCallMethod | undefined
  const path = typeof c?.path === 'string' ? c.path.trim() : ''
  if (!title || !preparedAt || !c || !method || !['POST', 'PUT', 'PATCH', 'DELETE', 'GET'].includes(method)) return null
  if (!path || path.length > 200 || !path.startsWith('/api/') || path.startsWith('/api//') || path.includes('..') || /[\s#]/.test(path)) return null
  let body: unknown
  if (c.body !== undefined) {
    try {
      if (JSON.stringify(c.body).length > 4096) return null
    } catch {
      return null
    }
    body = c.body
  }
  const notes = Array.isArray(d.notes)
    ? d.notes.map((n) => str(n, 300)).filter((n): n is string => !!n).slice(0, 6)
    : undefined
  return {
    kind: 'draft',
    act: 'api_call',
    version: 1,
    title,
    prepared_at: preparedAt,
    requires_confirmation: true,
    call: { method, path, ...(body !== undefined ? { body } : {}) },
    ...(notes?.length ? { notes } : {}),
  }
}

/** Either draft act — the panel's parse for a service draft payload. */
export function asAnyDraft(v: unknown): AnyAiDraft | null {
  return asDraft(v) ?? asApiCallDraft(v)
}

/** A one-line field summary for the card (the honest "what the draft
 *  carries"). Skips absent fields. */
export function draftFieldLines(draft: AiDraft): string[] {
  const f = draft.fields
  const lines: string[] = [`the Recommendation: ${f.standard_label ?? f.standard_doc}`]
  if (f.family_designation) lines.push(`the instrument family: ${f.family_designation}`)
  if (f.group_label) lines.push(`the instrument group: ${f.group_label}`)
  if (f.model_designation) lines.push(`the model designation: ${f.model_designation}`)
  if (f.description) lines.push(`the description: ${f.description}`)
  if (f.scheme) lines.push(`scheme ${f.scheme}`)
  if (f.samples?.length) lines.push(`${f.samples.length} sample${f.samples.length === 1 ? '' : 's'}: ${f.samples.map((s) => s.serial).join(', ')}`)
  return lines
}

/** The api_call card's summary lines: the operation itself, honestly —
 *  the class marker comes from the host's ack, never from the draft. */
export function apiCallLines(draft: AiApiCallDraft): string[] {
  return [`${draft.call.method} ${draft.call.path}`]
}

/**
 * Hand the draft to the host: dispatch the event, wait for the host's
 * ack (bounded). Resolves the ack; a host without the draft seam
 * answers nothing and the caller gets the timeout refusal — the card
 * says so honestly rather than pretending a hand-off.
 */
export function dispatchAiDraft(draft: AnyAiDraft, timeoutMs = 4000): Promise<AiDraftAck> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve({ accepted: false, reason: 'no-window' })
      return
    }
    let settled = false
    const finish = (ack: AiDraftAck) => {
      if (settled) return
      settled = true
      window.removeEventListener(AI_DRAFT_ACK_EVENT, onAck)
      clearTimeout(timer)
      resolve(ack)
    }
    const onAck = (e: Event) => {
      const detail = (e as CustomEvent).detail
      finish({
        accepted: detail?.accepted === true,
        ...(typeof detail?.reason === 'string' ? { reason: detail.reason.slice(0, 200) } : {}),
        ...(detail?.executed === true ? { executed: true } : {}),
        ...(detail?.via === 'grant' || detail?.via === 'confirmation' ? { via: detail.via } : {}),
        ...(detail?.act_class === 'record' || detail?.act_class === 'preference' ? { act_class: detail.act_class } : {}),
      })
    }
    const timer = setTimeout(() => finish({ accepted: false, reason: 'no-host' }), timeoutMs)
    window.addEventListener(AI_DRAFT_ACK_EVENT, onAck)
    window.dispatchEvent(new CustomEvent(AI_DRAFT_EVENT, { detail: draft }))
  })
}
