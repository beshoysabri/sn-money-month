import { blocks } from '../lib/markdown'

/** Markdown blocks as plain, safe React elements; inline text stays literal. */
export function MarkdownView({ markdown }: { markdown: string }) {
  return (
    <div className="md-view">
      {blocks(markdown).map((b, i) => {
        switch (b.type) {
          case 'heading':
            return b.level <= 2 ? <h3 key={i}>{b.text}</h3> : <h4 key={i}>{b.text}</h4>
          case 'paragraph':
            return <p key={i}>{b.text}</p>
          case 'quote':
            return <blockquote key={i}>{b.text}</blockquote>
          case 'code':
            return <pre key={i}>{b.text}</pre>
          case 'list': {
            const items = b.items.map((item, j) => <li key={j}>{item}</li>)
            return b.ordered ? <ol key={i}>{items}</ol> : <ul key={i}>{items}</ul>
          }
          case 'table':
            return (
              <div key={i} className="scroll-x">
                <table className="data">
                  <thead>
                    <tr>
                      {b.header.map((h, j) => (
                        <th key={j}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, j) => (
                      <tr key={j}>
                        {row.map((cell, k) => (
                          <td key={k}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      })}
    </div>
  )
}
