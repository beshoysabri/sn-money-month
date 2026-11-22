import { createContext, useContext } from 'react'

/** Whether amounts are hidden (the privacy switch). */
export const PrivacyContext = createContext(false)

export function usePrivacy(): boolean {
  return useContext(PrivacyContext)
}
