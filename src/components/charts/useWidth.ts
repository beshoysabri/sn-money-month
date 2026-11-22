import { useEffect, useRef, useState } from 'react'

/** The element's width in pixels, kept current; charts draw at real size instead of stretching. */
export function useWidth<T extends HTMLElement>(fallback = 320) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(fallback)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (el.clientWidth) setWidth(el.clientWidth)
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width)
      if (w) setWidth(w)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}
