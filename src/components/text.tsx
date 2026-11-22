import type { ReactNode } from 'react'
import { amount, type AmountOptions } from '../lib/format'
import { usePrivacy } from '../lib/privacy'
import type { Part } from '../lib/report/insights'

/** An amount of money, masked when the privacy switch is on. */
export function Money({ value, strong, ...options }: { value: number; strong?: boolean } & Omit<AmountOptions, 'hidden'>) {
  const hidden = usePrivacy()
  const text = amount(value, { ...options, hidden })
  return strong ? <strong className="num-inline">{text}</strong> : <span className="num-inline">{text}</span>
}

/** A computed sentence. */
export function Rich({ parts }: { parts: Part[] }) {
  return (
    <>
      {parts.map((p, i) =>
        typeof p === 'string' ? (
          <span key={i}>{p}</span>
        ) : p.kind === 'strong' ? (
          <strong key={i}>{p.text}</strong>
        ) : (
          <Money key={i} value={p.value} strong={p.strong} signed={p.signed} />
        ),
      )}
    </>
  )
}

export function Section({
  id,
  eyebrow,
  title,
  lead,
  note,
  children,
  className = '',
}: {
  id: string
  eyebrow: string
  title?: ReactNode
  lead?: ReactNode
  note?: string
  children?: ReactNode
  className?: string
}) {
  return (
    <section id={id} className={`sec ${className}`} aria-labelledby={`${id}-title`}>
      <p className="eyebrow" id={title ? undefined : `${id}-title`}>
        {eyebrow}
      </p>
      {title && (
        <h2 className="title" id={`${id}-title`}>
          {title}
        </h2>
      )}
      {lead && <p className="lead">{lead}</p>}
      {children}
      {note && (
        <p className="claude-note">
          <span className="claude-label">Claude</span>
          {note}
        </p>
      )}
    </section>
  )
}
