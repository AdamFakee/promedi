import { Href, useRouter } from 'expo-router'
import { useCallback } from 'react'
import { hrefToRoute, navigateToRoute, RouteName, RouteParamsMap } from '../constants/routes.const'

/**
 * Custom hook wrapping Expo Router with strongly-typed route helper methods.
 * Supports typed route names and query parameter maps.
 */
export function useAppNavigation() {
  const router = useRouter()

  const navigateTo = useCallback(
    <K extends RouteName>(
      name: K,
      ...args: RouteParamsMap[K] extends never ? [] : [RouteParamsMap[K]]
    ) => {
      navigateToRoute(router, name, ...args)
    },
    [router],
  )

  const pushHref = useCallback(
    (href: Href) => {
      router.push(href)
    },
    [router],
  )

  const replaceTo = useCallback(
    <K extends RouteName>(
      name: K,
      ...args: RouteParamsMap[K] extends never ? [] : [RouteParamsMap[K]]
    ) => {
      router.replace(hrefToRoute(name, ...args))
    },
    [router],
  )

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back()
    }
  }, [router])

  return {
    router,
    navigateTo,
    pushHref,
    replaceTo,
    goBack,
    hrefToRoute,
  }
}
