import { useEffect, useState } from "react"

/** Counts down once a second from `seconds`; `restart()` starts it again. */
export function useCountdown(seconds: number) {
  const [endsAt, setEndsAt] = useState(() => Date.now() + seconds * 1000)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (now >= endsAt) return
    const t = setTimeout(() => setNow(Date.now()), 1000)
    return () => clearTimeout(t)
  }, [now, endsAt])
  return {
    secondsLeft: Math.max(0, Math.ceil((endsAt - now) / 1000)),
    restart: () => {
      const t = Date.now()
      setEndsAt(t + seconds * 1000)
      setNow(t)
    },
  }
}
