/**
 * Markdown-lite for assistant answers (TODO.ai-platform/01): the answer
 * text is model output, so the renderer is escape-first — every input
 * character is HTML-escaped BEFORE any markup substitution runs, and the
 * only tags emitted are the fixed set below. No raw-HTML passthrough
 * exists at all, so no payload in an answer can execute.
 *
 * Supported: paragraphs, **bold**, *italic*, `code`, fenced ``` blocks,
 * - / * / 1. lists, ### headings, and [text](https://…) links (http/https
 * only, always rel="noopener" target="_blank"). The answer contract's
 * typed unit blocks ([[u:…]] refs) are NOT expanded here — the citation
 * cards carry the sources; the full renderer lives on ai.oimlsmart.org.
 */

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function renderInline(escaped: string): string {
  // `code` first so its contents skip the emphasis/link substitutions
  const codes: string[] = []
  let out = escaped.replace(/`([^`\n]+)`/g, (_m, code) => {
    codes.push(String(code))
    return `${codes.length - 1}`
  })
  out = out
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)/g, (_m, text, href) => {
      const safeHref = String(href).replace(/&quot;/g, '%22')
      return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${text}</a>`
    })
  return out.replace(/(\d+)/g, (m, i) => (codes[Number(i)] !== undefined ? `<code>${codes[Number(i)]}</code>` : m))
}

export function renderMarkdownLite(src: string): string {
  const escaped = escapeHtml(src)
  const blocks: string[] = []
  // fenced code blocks first — their contents render verbatim
  const withoutFences = escaped.replace(/```[a-z]*\n([\s\S]*?)```/g, (_m, code) => {
    blocks.push(`<pre><code>${String(code).replace(/\n$/, '')}</code></pre>`)
    return `\n\n${blocks.length - 1}\n\n`
  })

  const lines = withoutFences.split('\n')
  const html: string[] = []
  let list: 'ul' | 'ol' | null = null
  let para: string[] = []

  const flushPara = () => {
    if (para.length) {
      html.push(`<p>${renderInline(para.join(' '))}</p>`)
      para = []
    }
  }
  const flushList = () => {
    if (list) {
      html.push(`</${list}>`)
      list = null
    }
  }

  for (const line of lines) {
    const trimmed = line.trim()
    const fenceRef = trimmed.match(/^(\d+)$/)
    if (fenceRef && blocks[Number(fenceRef[1])] !== undefined) {
      flushPara()
      flushList()
      html.push(blocks[Number(fenceRef[1])])
      continue
    }
    if (!trimmed) {
      flushPara()
      flushList()
      continue
    }
    const heading = trimmed.match(/^(#{1,4})\s+(.*)$/)
    if (heading) {
      flushPara()
      flushList()
      html.push(`<p class="ai-md-heading">${renderInline(heading[2] ?? '')}</p>`)
      continue
    }
    const ul = trimmed.match(/^[-*]\s+(.*)$/)
    const ol = trimmed.match(/^\d+[.)]\s+(.*)$/)
    if (ul || ol) {
      flushPara()
      const kind = ul ? 'ul' : 'ol'
      if (list !== kind) {
        flushList()
        html.push(`<${kind}>`)
        list = kind
      }
      html.push(`<li>${renderInline((ul?.[1] ?? ol?.[1]) || '')}</li>`)
      continue
    }
    flushList()
    para.push(trimmed)
  }
  flushPara()
  flushList()
  return html.join('\n')
}
