import { requireNativeView } from 'expo'
import * as React from 'react'

import type { SunmiK2ViewProps } from './SunmiK2.types'

const NativeView: React.ComponentType<SunmiK2ViewProps> = requireNativeView('SunmiK2')

export default function SunmiK2View(props: SunmiK2ViewProps) {
  return <NativeView {...props} />
}
