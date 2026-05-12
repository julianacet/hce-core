import { useSearchParams } from 'react-router'

export function useTabParam<T extends string>(
  paramKey: string,
  defaultTab: T,
  valid: readonly T[],
): [T, (tab: T) => void] {
  const [params, setParams] = useSearchParams()
  const raw = params.get(paramKey)
  const tab = valid.includes(raw as T) ? (raw as T) : defaultTab

  function setTab(next: T) {
    setParams(
      prev => {
        const p = new URLSearchParams(prev)
        p.set(paramKey, next)
        return p
      },
      { replace: true },
    )
  }

  return [tab, setTab]
}
