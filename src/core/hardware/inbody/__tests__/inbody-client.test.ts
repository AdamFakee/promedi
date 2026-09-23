import { InBodyClient } from '../client/inbody-client'
import type {
  DeviceTransport,
  TransportConfig,
  TransportError,
} from '../transport/transport.interface'
import { STX, ETX, ESC } from '../protocol/constants'

/** Mock implementation của DeviceTransport cho Unit Test */
class MockTransport implements DeviceTransport {
  private connected = false
  private dataListeners = new Set<(chunk: Uint8Array) => void>()
  private errorListeners = new Set<(err: TransportError) => void>()
  private closeListeners = new Set<() => void>()

  /** Lưu vết byte thô đã ghi xuống transport */
  public lastWrittenData: Uint8Array | null = null

  async connect(_config: TransportConfig): Promise<void> {
    this.connected = true
  }

  async disconnect(): Promise<void> {
    this.connected = false
    this.closeListeners.forEach((cb) => cb())
  }

  async write(data: Uint8Array): Promise<void> {
    this.lastWrittenData = data
  }

  onData(cb: (chunk: Uint8Array) => void): () => void {
    this.dataListeners.add(cb)
    return () => this.dataListeners.delete(cb)
  }

  onError(cb: (err: TransportError) => void): () => void {
    this.errorListeners.add(cb)
    return () => this.errorListeners.delete(cb)
  }

  onClose(cb: () => void): () => void {
    this.closeListeners.add(cb)
    return () => this.closeListeners.delete(cb)
  }

  isConnected(): boolean {
    return this.connected
  }

  /** Giả lập InBody gửi dữ liệu phản hồi ngược lại Client */
  emitData(chunk: Uint8Array): void {
    this.dataListeners.forEach((cb) => cb(chunk))
  }
}

describe('InBodyClient', () => {
  let transport: MockTransport
  let client: InBodyClient

  beforeEach(() => {
    transport = new MockTransport()
    client = new InBodyClient(transport)
  })

  it('gửi lệnh STATUS và nhận kết quả phản hồi thành công', async () => {
    await client.connect({ host: '127.0.0.1', port: 2004 })

    const statusPromise = client.pollStatusOnce()

    // Giả lập InBody gửi phản hồi: STX (0x02), 0x63, '0' (0x30), ESC (0x1B), ETX (0x03)
    const responseBytes = new Uint8Array([STX, 0x63, 0x30, ESC, ETX])
    transport.emitData(responseBytes)

    const status = await statusPromise
    expect(status.code).toBe('0')
  })

  it('khóa Mutex Half-Duplex nếu gửi lệnh mới khi lệnh cũ chưa xử lý xong', async () => {
    await client.connect({ host: '127.0.0.1', port: 2004 })

    // Gửi lệnh 1 (chưa cho response trả về ngay)
    const promise1 = client.pollStatusOnce()

    // Gửi lệnh 2 song song ngay lập tức
    await expect(client.pollStatusOnce()).rejects.toThrow(/bận xử lý câu lệnh/)

    // Trả lời lệnh 1 để giải phóng Mutex
    transport.emitData(new Uint8Array([STX, 0x63, 0x30, ESC, ETX]))
    await promise1
  })

  it('ném lỗi Timeout nếu quá thời gian mà thiết bị không trả về ETX', async () => {
    await client.connect({ host: '127.0.0.1', port: 2004 })
    // Poll status với timeout cực ngắn 100ms trong test
    const pollPromise = client.pollStatusOnce()

    await expect(pollPromise).rejects.toThrow(/Timeout/)
  })
})
