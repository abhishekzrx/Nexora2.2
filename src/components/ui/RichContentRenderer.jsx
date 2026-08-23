/**
 * RichContentRenderer.jsx
 * High-fidelity, safe markdown & rich content renderer for study notes.
 * Supports headings, bold, italic, underline, strike, lists, callout boxes,
 * tables, code blocks, images with captions, and links.
 */
import { useMemo } from 'react'
import AppIcon from './AppIcon'

/**
 * Parses inline formatting: bold, italic, underline, strike, code, links, images
 */
function renderInline(text = '') {
  if (!text) return null

  // Tokenize string for inline elements
  // 1. Links: [text](url)
  // 2. Images: ![alt](url)
  // 3. Bold-Italic: ***text***
  // 4. Bold: **text** or __text__
  // 5. Italic: *text* or _text_
  // 6. Underline: <u>text</u>
  // 7. Strikethrough: ~~text~~
  // 8. Inline Code: `code`
  // 9. Highlight: ==text== or <mark>text</mark>

  const parts = []
  let remaining = text
  let keyIdx = 0

  while (remaining.length > 0) {
    // Check for inline image ![alt](url)
    const imgMatch = remaining.match(/^!\[([^\]]*)\]\(([^)]+)\)/)
    if (imgMatch) {
      parts.push(
        <span key={`img-${keyIdx++}`} className="rich-inline-img-wrap">
          <img
            src={imgMatch[2]}
            alt={imgMatch[1] || 'Note illustration'}
            className="rich-inline-img"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          {imgMatch[1] && <span className="rich-img-caption">{imgMatch[1]}</span>}
        </span>
      )
      remaining = remaining.slice(imgMatch[0].length)
      continue
    }

    // Check for link [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/)
    if (linkMatch) {
      parts.push(
        <a
          key={`link-${keyIdx++}`}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="rich-link"
        >
          {linkMatch[1]}
        </a>
      )
      remaining = remaining.slice(linkMatch[0].length)
      continue
    }

    // Check for bold-italic ***text***
    const biMatch = remaining.match(/^\*\*\*([^*]+)\*\*\*/)
    if (biMatch) {
      parts.push(<strong key={`bi-${keyIdx++}`}><em>{biMatch[1]}</em></strong>)
      remaining = remaining.slice(biMatch[0].length)
      continue
    }

    // Check for bold **text** or __text__
    const boldMatch = remaining.match(/^(\*\*|__)(.*?)\1/)
    if (boldMatch) {
      parts.push(<strong key={`b-${keyIdx++}`}>{boldMatch[2]}</strong>)
      remaining = remaining.slice(boldMatch[0].length)
      continue
    }

    // Check for italic *text* or _text_
    const italicMatch = remaining.match(/^(\*|_)(.*?)\1/)
    if (italicMatch && !italicMatch[2].startsWith(' ')) {
      parts.push(<em key={`i-${keyIdx++}`}>{italicMatch[2]}</em>)
      remaining = remaining.slice(italicMatch[0].length)
      continue
    }

    // Check for underline <u>text</u>
    const uMatch = remaining.match(/^<u>(.*?)<\/u>/i)
    if (uMatch) {
      parts.push(<u key={`u-${keyIdx++}`}>{uMatch[1]}</u>)
      remaining = remaining.slice(uMatch[0].length)
      continue
    }

    // Check for strikethrough ~~text~~
    const strikeMatch = remaining.match(/^~~(.*?)~~/)
    if (strikeMatch) {
      parts.push(<del key={`s-${keyIdx++}`}>{strikeMatch[1]}</del>)
      remaining = remaining.slice(strikeMatch[0].length)
      continue
    }

    // Check for inline code `text`
    const codeMatch = remaining.match(/^`([^`]+)`/)
    if (codeMatch) {
      parts.push(<code key={`code-${keyIdx++}`} className="rich-inline-code">{codeMatch[1]}</code>)
      remaining = remaining.slice(codeMatch[0].length)
      continue
    }

    // Check for highlight ==text== or <mark>text</mark>
    const markMatch = remaining.match(/^(?:==(.*?)==|<mark>(.*?)<\/mark>)/i)
    if (markMatch) {
      parts.push(<mark key={`mark-${keyIdx++}`} className="rich-highlight">{markMatch[1] || markMatch[2]}</mark>)
      remaining = remaining.slice(markMatch[0].length)
      continue
    }

    // Check for raw HTML tags like <br/>
    if (remaining.startsWith('<br>') || remaining.startsWith('<br/>') || remaining.startsWith('<br />')) {
      parts.push(<br key={`br-${keyIdx++}`} />)
      remaining = remaining.replace(/^<br\s*\/?>/i, '')
      continue
    }

    // Normal character accumulation
    const nextSpecial = remaining.search(/(\[!|\[|\*\*|__|\*|_|<u>|~~|`|==|<mark>|<br)/i)
    if (nextSpecial === -1) {
      parts.push(remaining)
      break
    } else if (nextSpecial === 0) {
      // Fallback single character advance
      parts.push(remaining[0])
      remaining = remaining.slice(1)
    } else {
      parts.push(remaining.slice(0, nextSpecial))
      remaining = remaining.slice(nextSpecial)
    }
  }

  return parts
}

/**
 * Parses block elements: Headings, Callout Boxes, Blockquotes, Lists, Tables, Code blocks, Images, Paragraphs
 */
function parseBlocks(markdown = '') {
  if (!markdown || typeof markdown !== 'string') return []

  const rawLines = markdown.split('\n')
  const blocks = []
  let i = 0

  while (i < rawLines.length) {
    const line = rawLines[i]
    const trimmed = line.trim()

    // 1. Empty line
    if (!trimmed) {
      i++
      continue
    }

    // 2. Fenced Code Block (```language ... ```)
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim() || 'text'
      const codeLines = []
      i++
      while (i < rawLines.length && !rawLines[i].trim().startsWith('```')) {
        codeLines.push(rawLines[i])
        i++
      }
      i++ // Skip closing ```
      blocks.push({
        type: 'code-block',
        lang,
        code: codeLines.join('\n'),
      })
      continue
    }

    // 3. Standalone Image Block: ![alt](url)
    const standaloneImgMatch = trimmed.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    if (standaloneImgMatch) {
      blocks.push({
        type: 'image',
        alt: standaloneImgMatch[1] || 'Note illustration',
        src: standaloneImgMatch[2],
      })
      i++
      continue
    }

    // 4. Callout / Alert Box (> [!NOTE], > [!IMPORTANT], > [!TIP], > [!WARNING], > [!KEY_CONCEPT])
    const calloutHeaderMatch = trimmed.match(/^>\s*\[!(NOTE|IMPORTANT|TIP|WARNING|CAUTION|KEY_CONCEPT|SUMMARY)\]\s*(.*)$/i)
    if (calloutHeaderMatch) {
      const variant = calloutHeaderMatch[1].toLowerCase()
      const title = calloutHeaderMatch[2].trim()
      const quoteLines = []
      i++
      while (i < rawLines.length && rawLines[i].trim().startsWith('>')) {
        quoteLines.push(rawLines[i].trim().replace(/^>\s?/, ''))
        i++
      }
      blocks.push({
        type: 'callout',
        variant,
        title,
        content: quoteLines.join('\n'),
      })
      continue
    }

    // 5. Standard Blockquote (> text)
    if (trimmed.startsWith('>')) {
      const quoteLines = [trimmed.replace(/^>\s?/, '')]
      i++
      while (i < rawLines.length && rawLines[i].trim().startsWith('>')) {
        quoteLines.push(rawLines[i].trim().replace(/^>\s?/, ''))
        i++
      }
      blocks.push({
        type: 'blockquote',
        text: quoteLines.join(' '),
      })
      continue
    }

    // 6. Headings (# H1, ## H2, ### H3, #### H4)
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      blocks.push({
        type: 'heading',
        level,
        text: headingMatch[2].trim(),
      })
      i++
      continue
    }

    // 7. Horizontal Rule (---, ***, ___)
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'divider' })
      i++
      continue
    }

    // 8. Markdown Table (| Header 1 | Header 2 |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && i + 1 < rawLines.length && rawLines[i + 1].includes('|-')) {
      const headers = trimmed
        .slice(1, -1)
        .split('|')
        .map((h) => h.trim())
      i += 2 // Skip header and separator |---|---|
      const rows = []
      while (i < rawLines.length && rawLines[i].trim().startsWith('|') && rawLines[i].trim().endsWith('|')) {
        const cells = rawLines[i]
          .trim()
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim())
        rows.push(cells)
        i++
      }
      blocks.push({
        type: 'table',
        headers,
        rows,
      })
      continue
    }

    // 9. Unordered List (- item, * item, • item)
    if (/^[\*\-\•]\s+/.test(trimmed)) {
      const items = []
      while (i < rawLines.length && /^[\*\-\•]\s+/.test(rawLines[i].trim())) {
        items.push(rawLines[i].trim().replace(/^[\*\-\•]\s+/, ''))
        i++
      }
      blocks.push({
        type: 'bullet-list',
        items,
      })
      continue
    }

    // 10. Ordered List (1. item, 2. item)
    if (/^\d+\.\s+/.test(trimmed)) {
      const items = []
      while (i < rawLines.length && /^\d+\.\s+/.test(rawLines[i].trim())) {
        items.push(rawLines[i].trim().replace(/^\d+\.\s+/, ''))
        i++
      }
      blocks.push({
        type: 'numbered-list',
        items,
      })
      continue
    }

    // 11. Normal Paragraph (accumulates consecutive non-empty lines)
    const paragraphLines = [trimmed]
    i++
    while (
      i < rawLines.length &&
      rawLines[i].trim() &&
      !rawLines[i].trim().startsWith('#') &&
      !rawLines[i].trim().startsWith('```') &&
      !rawLines[i].trim().startsWith('>') &&
      !rawLines[i].trim().startsWith('|') &&
      !/^[\*\-\•]\s+/.test(rawLines[i].trim()) &&
      !/^\d+\.\s+/.test(rawLines[i].trim()) &&
      !/^!\[/.test(rawLines[i].trim())
    ) {
      paragraphLines.push(rawLines[i].trim())
      i++
    }

    blocks.push({
      type: 'paragraph',
      text: paragraphLines.join(' '),
    })
  }

  return blocks
}

/**
 * Main RichContentRenderer Component
 */
export default function RichContentRenderer({ content = '', className = '' }) {
  const blocks = useMemo(() => parseBlocks(content), [content])

  if (!content || !String(content).trim()) {
    return (
      <div className={`rich-content-empty ${className}`}>
        <p>No content to display.</p>
      </div>
    )
  }

  return (
    <article className={`rich-notes-article ${className}`}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'heading': {
            if (block.level === 1) return <h1 key={idx} className="rich-h1">{renderInline(block.text)}</h1>
            if (block.level === 2) return <h2 key={idx} className="rich-h2">{renderInline(block.text)}</h2>
            if (block.level === 3) return <h3 key={idx} className="rich-h3">{renderInline(block.text)}</h3>
            return <h4 key={idx} className="rich-h4">{renderInline(block.text)}</h4>
          }

          case 'paragraph': {
            return (
              <p key={idx} className="rich-p">
                {renderInline(block.text)}
              </p>
            )
          }

          case 'bullet-list': {
            return (
              <ul key={idx} className="rich-ul">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="rich-li">
                    {renderInline(item)}
                  </li>
                ))}
              </ul>
            )
          }

          case 'numbered-list': {
            return (
              <ol key={idx} className="rich-ol">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="rich-li">
                    {renderInline(item)}
                  </li>
                ))}
              </ol>
            )
          }

          case 'callout': {
            const variantIcons = {
              note: 'lightbulb',
              important: 'warning',
              tip: 'star',
              warning: 'warning',
              caution: 'warning',
              key_concept: 'bookmark',
              summary: 'document',
            }
            const variantLabels = {
              note: 'Note',
              important: 'Important',
              tip: 'Pro Tip',
              warning: 'Warning',
              caution: 'Caution',
              key_concept: 'Key Concept',
              summary: 'Summary',
            }

            const iconName = variantIcons[block.variant] || 'lightbulb'
            const label = block.title || variantLabels[block.variant] || 'Note'

            return (
              <div key={idx} className={`rich-callout callout-${block.variant}`}>
                <div className="rich-callout-header">
                  <span className="rich-callout-icon">
                    <AppIcon name={iconName} size={16} />
                  </span>
                  <strong className="rich-callout-title">{label}</strong>
                </div>
                <div className="rich-callout-body">
                  {block.content.split('\n').map((l, cIdx) => (
                    <p key={cIdx}>{renderInline(l)}</p>
                  ))}
                </div>
              </div>
            )
          }

          case 'blockquote': {
            return (
              <blockquote key={idx} className="rich-blockquote">
                <div className="rich-quote-bar" />
                <div className="rich-quote-text">{renderInline(block.text)}</div>
              </blockquote>
            )
          }

          case 'code-block': {
            return (
              <div key={idx} className="rich-code-card">
                {block.lang && <div className="rich-code-header">{block.lang}</div>}
                <pre className="rich-pre">
                  <code>{block.code}</code>
                </pre>
              </div>
            )
          }

          case 'image': {
            return (
              <figure key={idx} className="rich-figure">
                <div className="rich-img-frame">
                  <img
                    src={block.src}
                    alt={block.alt}
                    className="rich-img-media"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.alt = '⚠️ Image failed to load'
                      e.currentTarget.style.opacity = '0.5'
                    }}
                  />
                </div>
                {block.alt && <figcaption className="rich-figcaption">{block.alt}</figcaption>}
              </figure>
            )
          }

          case 'table': {
            return (
              <div key={idx} className="rich-table-wrapper">
                <table className="rich-table">
                  <thead>
                    <tr>
                      {block.headers.map((h, hIdx) => (
                        <th key={hIdx}>{renderInline(h)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx}>{renderInline(cell)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }

          case 'divider': {
            return <hr key={idx} className="rich-hr" />
          }

          default:
            return null
        }
      })}
    </article>
  )
}
