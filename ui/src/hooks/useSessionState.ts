import { useState, useEffect, useRef } from 'react'

export function useSessionState<T>(
  key: string,
  initial: T,
): [T, React.Dispatch<React.SetStateAction<T>>, () => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(key)
      return stored !== null ? (JSON.parse(stored) as T) : initial
    } catch {
      return initial
    }
  })

  const isFirst = useRef(true)

  useEffect(() => {
    if (isFirst.current) { isFirst.current = false; return }
    try { sessionStorage.setItem(key, JSON.stringify(state)) } catch {}
  }, [key, state])

  function clear() {
    try { sessionStorage.removeItem(key) } catch {}
    setState(initial)
  }

  return [state, setState, clear]
}
