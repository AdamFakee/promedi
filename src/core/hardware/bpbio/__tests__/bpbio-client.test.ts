import { BpbioClient } from '../client/bpbio-client'
import type { DeviceTransport } from '../../transport/transport.interface'
import { SYN, SOH, STX, ETX } from '../protocol/constants'

class MockTransport implements DeviceTransport {
  private dataListener: ((chunk: Uint8Array) => void) | null = null
  public writtenData: Uint8Array[] = []
  public connected = false

  async connect(): Promise<void> {
    this.connected = true
  }

  async disconnect(): Promise<void> {
    this.connected = false
  }

  async write(data: Uint8Array): Promise<void> {
    this.writtenData.push(data)
  }

  onData(cb: (chunk: Uint8Array) => void) {
    this.dataListener = cb
    return () => {
      this.dataListener = null
    }
  }

  onError() {
    return () => {}
  }

  onClose() {
    return () => {}
  }

  isConnected() {
    return this.connected
  }

  simulateIncomingData(data: Uint8Array) {
    if (this.dataListener) this.dataListener(data)
  }
}

describe('BpbioClient', () => {
  let transport: MockTransport
  let client: BpbioClient

  beforeEach(() => {
    transport = new MockTransport()
    client = new BpbioClient(transport)
  })

  function buildTestFrame(identifier: string, value: number): Uint8Array {
    const valStr = String(value).padStart(3, '0')
    const bytes = [
      SYN,
      SYN,
      SOH,
      0x30,
      0x30,
      STX,
      0x30,
      identifier.charCodeAt(0),
      valStr.charCodeAt(0),
      valStr.charCodeAt(1),
      valStr.charCodeAt(2),
      0x30,
      0x30,
      0x30,
      ETX,
    ]
    const bcc = bytes.slice(5, 15).reduce((acc, b) => acc ^ b, 0)
    bytes.push(bcc)
    return new Uint8Array(bytes)
  }

  it('aggregates S, D, and P frames into a complete result', () => {
    expect(client.isResultComplete()).toBe(false)

    transport.simulateIncomingData(buildTestFrame('S', 122))
    expect(client.isResultComplete()).toBe(false)

    transport.simulateIncomingData(buildTestFrame('D', 81))
    expect(client.isResultComplete()).toBe(false)

    transport.simulateIncomingData(buildTestFrame('P', 75))
    expect(client.isResultComplete()).toBe(true)

    const result = client.consumeResult()
    expect(result).toEqual({ systolic: 122, diastolic: 81, pulse: 75 })
    expect(client.isResultComplete()).toBe(false)
  })

  it('resets pending data when a duplicate identifier arrives (new measurement cycle)', () => {
    transport.simulateIncomingData(buildTestFrame('S', 120))
    transport.simulateIncomingData(buildTestFrame('D', 80))

    // Duplicate S arriving -> indicates previous incomplete measurement was aborted
    transport.simulateIncomingData(buildTestFrame('S', 118))
    transport.simulateIncomingData(buildTestFrame('P', 70))

    // Result should not be complete yet because D was cleared upon receiving duplicate S
    expect(client.isResultComplete()).toBe(false)

    transport.simulateIncomingData(buildTestFrame('D', 78))
    expect(client.isResultComplete()).toBe(true)

    const result = client.consumeResult()
    expect(result).toEqual({ systolic: 118, diastolic: 78, pulse: 70 })
  })
})
