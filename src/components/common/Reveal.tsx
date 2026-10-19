import { useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from "react"

type RevealProps = {
  children: ReactNode
  as?: "div" | "section" | "li" | "article" | "span"
  /** Stagger offset in ms. */
  delay?: number
  /** Direction the element travels from. */
  from?: "up" | "left" | "right"
  /** Stretch to fill a grid cell (so the child can fill it too). */
  fill?: boolean
  className?: string
  id?: string
}

/**
 * Fades and slides its children in the first time they scroll into view.
 * Styles live in styles/motion.css and switch off under prefers-reduced-motion.
 */
export function Reveal({ children, as = "div", delay = 0, from = "up", fill, className, id }: RevealProps) {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const Tag = as as ElementType
  return (
    <Tag
      ref={ref}
      id={id}
      data-from={from}
      className={["reveal", fill ? "reveal--fill" : "", visible ? "is-visible" : "", className ?? ""].filter(Boolean).join(" ")}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  )
}
