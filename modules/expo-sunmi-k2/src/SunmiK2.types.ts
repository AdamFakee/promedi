import type { EventSubscription } from 'expo-modules-core'
import type { ViewProps } from 'react-native'

export interface NFCScanEvent {
  cardUid: string
  source: 'sunmi' | 'system'
}

export interface PrinterStatusEvent {
  status: 'ready' | 'busy' | 'paper_out' | 'error' | 'disconnected'
  message?: string
}

export interface PrintBitmapOptions {
  align?: 'left' | 'center' | 'right'
  binarizeValue?: number // 0 - 255 (default: 128)
  autoOut?: boolean
}

export interface PrinterStatusResult {
  connected: boolean
  paperPresent: boolean
  message: string
}

export type SunmiK2Events = {
  onNFCScanned: (event: NFCScanEvent) => void
  onPrinterStatusChanged: (event: PrinterStatusEvent) => void
}

export interface SunmiK2ViewProps extends ViewProps {
  url?: string
  onLoad?: (event: { nativeEvent: { url?: string } }) => void
}

export type NFCScanListener = (event: NFCScanEvent) => void
export type PrinterStatusListener = (event: PrinterStatusEvent) => void
export type SunmiSubscription = EventSubscription
