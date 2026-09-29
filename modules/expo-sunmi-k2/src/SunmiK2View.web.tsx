import * as React from 'react'

import type { SunmiK2ViewProps } from './SunmiK2.types'

export default function SunmiK2View(props: SunmiK2ViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad?.({ nativeEvent: { url: props.url } })}
      />
    </div>
  )
}
