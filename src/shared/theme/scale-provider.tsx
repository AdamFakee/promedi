/**
 * src/shared/theme/scale-provider.tsx
 * ---------------------------------------------------------------
 * Provider tính K lúc runtime và bơm token CSS variables cho NativeWind.
 * ---------------------------------------------------------------
 */

import React, { createContext, useContext, useMemo, useEffect } from 'react'
import { View, useWindowDimensions } from 'react-native'
import { vars } from 'nativewind'

import { themeVars } from './design-tokens'
import {
  computeScale,
  auditTouchTarget,
  describeScale,
  touchFloorDp,
  type ScaleInput,
  type ScaleResult,
} from './scale'

const TOUCH_BASE_DP = 54

export type ProvisionedDisplay = ScaleInput & { modelName?: string }

const ScaleContext = createContext<ScaleResult | null>(null)

export function useScale(): ScaleResult {
  const ctx = useContext(ScaleContext)
  if (!ctx) {
    throw new Error('useScale phải được sử dụng bên trong <ScaleProvider>')
  }
  return ctx
}

export function ScaleProvider({
  display,
  children,
}: {
  display?: ProvisionedDisplay
  children: React.ReactNode
}) {
  const windowDims = useWindowDimensions()

  const scale = useMemo(() => {
    return computeScale(display, display?.modelName, {
      width: windowDims.width,
      height: windowDims.height,
    })
  }, [display, windowDims.width, windowDims.height])

  useEffect(() => {
    if (__DEV__) {
      console.log('[scale]', describeScale(scale))
      auditTouchTarget(TOUCH_BASE_DP, scale)
    }
  }, [scale])

  const style = useMemo(() => {
    const v = themeVars(scale.k, scale.kAttract)
    v['--sp-touch'] = `${Math.round(touchFloorDp(TOUCH_BASE_DP, scale))}px`
    return vars(v)
  }, [scale])

  return (
    <ScaleContext.Provider value={scale}>
      <View style={[{ flex: 1 }, style]}>{children}</View>
    </ScaleContext.Provider>
  )
}
