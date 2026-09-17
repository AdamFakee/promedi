import { useLocalSearchParams } from 'expo-router'
import type { RouteParamsMap } from '../constants/routes.const'

/**
 * Custom hook to get type-safe route parameters based on RouteParamsMap.
 * Automatically parses JSON stringified params (objects & arrays).
 * @param _route Key from RouteParamsMap to enforce typing
 */
export function useAppParams<K extends keyof RouteParamsMap>(_route?: K): RouteParamsMap[K] {
  const rawParams = useLocalSearchParams()

  const parsedParams: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(rawParams)) {
    if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
      try {
        parsedParams[key] = JSON.parse(value)
      } catch {
        parsedParams[key] = value
      }
    } else {
      parsedParams[key] = value
    }
  }

  return parsedParams as unknown as RouteParamsMap[K]
}
