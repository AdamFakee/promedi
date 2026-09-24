import type { TransportConfig } from '../transport/transport.interface'

export type DeviceStatus = 'idle' | 'connecting' | 'connected' | 'measuring' | 'completed' | 'error'

export interface IMeasurementDevice<TResult = unknown, TStartInput = void> {
  readonly id: string
  connect(config?: TransportConfig): Promise<void>
  disconnect?(): Promise<void>
  startMeasurement(input?: TStartInput): Promise<void>
  onStatusChange?(callback: (status: DeviceStatus) => void): () => void
  getResult(): Promise<TResult>
  reset(): Promise<void>
}
