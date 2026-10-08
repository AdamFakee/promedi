import type { Href } from 'expo-router'

export const ROUTES = {
  // Auth & Root
  DEVICE_ACTIVATION: { path: () => '/(auth)/device-activation' as Href, params: {} as never },
  LOGIN: { path: () => '/(auth)/login' as Href, params: {} as never },
  HOME: { path: () => '/' as Href, params: {} as never },

  // ProMedi Kiosk V4.0 Screens
  KIOSK_ACTIVATION: { path: () => '/(auth)/device-activation' as Href, params: {} as never },
  KIOSK_IDLE: { path: () => '/(kiosk)/idle' as Href, params: {} as never },
  KIOSK_IDENTIFICATION: { path: () => '/(kiosk)/identification' as Href, params: {} as never },
  KIOSK_MEASURE_BP: { path: () => '/(kiosk)/measure-bp' as Href, params: {} as never },
  KIOSK_MEASURE_INBODY: { path: () => '/(kiosk)/measure-inbody' as Href, params: {} as never },
  KIOSK_SUMMARY: { path: () => '/(kiosk)/result-summary' as Href, params: {} as never },
  KIOSK_MEASURE: { path: () => '/(kiosk)/measure' as Href, params: {} as never },
  KIOSK_HARDWARE_ERROR: {
    path: () => '/(kiosk)/hardware-error' as Href,
    params: {} as { error: string; device: string },
  },
  KIOSK_HEIGHT_DEMO: { path: () => '/(kiosk)/height-demo' as Href, params: {} as never },
} as const

export type RouteName = keyof typeof ROUTES

export type RouteParamsMap = {
  [K in RouteName]: (typeof ROUTES)[K] extends { params: infer P } ? P : never
}

export type AppRoute = RouteName

/** Build typed href with query string from ROUTES params */
export function hrefToRoute<K extends RouteName>(
  name: K,
  ...args: RouteParamsMap[K] extends never ? [] : [RouteParamsMap[K]]
): Href {
  const routeConfig = ROUTES[name]
  const params = args[0] as Record<string, unknown> | undefined
  const pathname = (routeConfig.path as (p?: unknown) => Href)(params) as string
  if (!params) return pathname as Href

  const serializableParams: Record<string, string> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      serializableParams[key] = typeof value === 'object' ? JSON.stringify(value) : String(value)
    }
  }

  const qs = new URLSearchParams(serializableParams).toString()
  return (qs ? `${pathname}?${qs}` : pathname) as Href
}

type RouterPush = { push: (href: Href) => void }

export function navigateToRoute<K extends RouteName>(
  router: RouterPush,
  name: K,
  ...args: RouteParamsMap[K] extends never ? [] : [RouteParamsMap[K]]
) {
  router.push(hrefToRoute(name, ...args))
}
