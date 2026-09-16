const htmlEntities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => htmlEntities[character])
}

function safeUrl(value: string): string | null {
  const url = value.trim()
  if (/^(https?:\/\/|mailto:|#)/i.test(url)) return url
  return null
}

function inlineMarkdown(value: string): string {
  const tokens: string[] = []
  const token = (html: string): string => {
    const id = `@@KW_MD_TOKEN_${tokens.length}@@`
    tokens.push(html)
    return id
  }

  let text = escapeHtml(value)
  text = text.replace(/`([^`\n]+)`/g, (_, code: string) => token(`<code>${code}</code>`))
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt: string) => escapeHtml(alt))
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label: string, rawUrl: string) => {
    const url = safeUrl(rawUrl)
    return url
      ? token(`<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${label}</a>`)
      : label
  })
  text = text.replace(/\*\*([^*\n]+)\*\*|__([^_\n]+)__/g, (_, strongA, strongB) =>
    token(`<strong>${strongA ?? strongB}</strong>`)
  )
  text = text.replace(/~~([^~\n]+)~~/g, (_, content: string) => token(`<del>${content}</del>`))
  text = text.replace(
    /(^|[\s(])\*([^*\n]+)\*(?=$|[\s).,!?:;])/g,
    (_, prefix: string, content: string) => `${prefix}${token(`<em>${content}</em>`)}`
  )
  text = text.replace(
    /(^|[\s(])_([^_\n]+)_(?=$|[\s).,!?:;])/g,
    (_, prefix: string, content: string) => `${prefix}${token(`<em>${content}</em>`)}`
  )
  text = text.replace(
    /(^|\s)(https?:\/\/[^\s<]+)/g,
    (_, prefix: string, rawUrl: string) =>
      `${prefix}${token(`<a href="${escapeHtml(rawUrl)}" target="_blank" rel="noreferrer">${rawUrl}</a>`)}`
  )

  return text.replace(/@@KW_MD_TOKEN_(\d+)@@/g, (_, index: string) => tokens[Number(index)])
}

function isTableSeparator(line: string): boolean {
  const cells = line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|')
  return cells.length > 0 && cells.every((cell) => /^\s*:?-{3,}:?\s*$/.test(cell))
}

function tableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())
}

/** 将 Agent 正文转换成安全的 HTML，覆盖常见的标题、列表、表格、引用和代码块。 */
export function renderMarkdown(source: string): string {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const output: string[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    if (!line.trim()) {
      index += 1
      continue
    }

    const fence = line.match(/^\s*```\s*([\w+-]*)\s*$/)
    if (fence) {
      const codeLines: string[] = []
      index += 1
      while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) {
        codeLines.push(lines[index])
        index += 1
      }
      if (index < lines.length) index += 1
      const language = fence[1] ? ` class="language-${escapeHtml(fence[1])}"` : ''
      output.push(
        `<pre class="md-code"><code${language}>${escapeHtml(codeLines.join('\n'))}</code></pre>`
      )
      continue
    }

    const heading = line.match(/^\s*(#{1,6})\s+(.+?)\s*#*\s*$/)
    if (heading) {
      const level = heading[1].length
      output.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`)
      index += 1
      continue
    }

    if (/^\s*(---+|\*\s*\*\s*\*|___+)\s*$/.test(line)) {
      output.push('<hr>')
      index += 1
      continue
    }

    if (line.includes('|') && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
      const headers = tableCells(line)
      const rows: string[][] = []
      index += 2
      while (index < lines.length && lines[index].includes('|') && lines[index].trim()) {
        rows.push(tableCells(lines[index]))
        index += 1
      }
      output.push(
        `<div class="md-table-wrap"><table><thead><tr>${headers
          .map((cell) => `<th>${inlineMarkdown(cell)}</th>`)
          .join('')}</tr></thead><tbody>${rows
          .map(
            (row) =>
              `<tr>${headers.map((_, cellIndex) => `<td>${inlineMarkdown(row[cellIndex] ?? '')}</td>`).join('')}</tr>`
          )
          .join('')}</tbody></table></div>`
      )
      continue
    }

    const quote = line.match(/^\s*>\s?(.*)$/)
    if (quote) {
      const quoteLines: string[] = []
      while (index < lines.length) {
        const current = lines[index].match(/^\s*>\s?(.*)$/)
        if (!current) break
        quoteLines.push(current[1])
        index += 1
      }
      output.push(`<blockquote>${inlineMarkdown(quoteLines.join('\n'))}</blockquote>`)
      continue
    }

    const unordered = line.match(/^\s*[-+*]\s+(.+)$/)
    const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/)
    if (unordered || ordered) {
      const orderedList = Boolean(ordered)
      const items: string[] = []
      while (index < lines.length) {
        const current = lines[index].match(
          orderedList ? /^\s*\d+[.)]\s+(.+)$/ : /^\s*[-+*]\s+(.+)$/
        )
        if (!current) break
        items.push(`<li>${inlineMarkdown(current[1])}</li>`)
        index += 1
      }
      output.push(`<${orderedList ? 'ol' : 'ul'}>${items.join('')}</${orderedList ? 'ol' : 'ul'}>`)
      continue
    }

    const paragraph: string[] = [line]
    index += 1
    while (index < lines.length && lines[index].trim()) {
      const next = lines[index]
      if (
        /^\s*```/.test(next) ||
        /^\s*#{1,6}\s+/.test(next) ||
        /^\s*>\s?/.test(next) ||
        /^\s*[-+*]\s+/.test(next) ||
        /^\s*\d+[.)]\s+/.test(next)
      ) {
        break
      }
      paragraph.push(next)
      index += 1
    }
    output.push(`<p>${inlineMarkdown(paragraph.join('\n'))}</p>`)
  }

  return output.join('')
}
