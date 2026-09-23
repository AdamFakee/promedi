/**
 * Implementation của DeviceTransport cho kết nối TCP/IP Socket.
 * Hỗ trợ react-native-tcp-socket với fallback an toàn cho Simulator/Web.
 * @module src/core/hardware/inbody/transport/tcp-transport.ts
 */

import TcpSocket from 'react-native-tcp-socket'
import type { DeviceTransport, TransportConfig } from './transport.interface'
import { TransportError } from './transport.interface'

export class TcpTransport implements DeviceTransport {
  private socket: any = null
  private connected = false
  private dataListeners = new Set<(chunk: Uint8Array) => void>()
  private errorListeners = new Set<(err: TransportError) => void>()
  private closeListeners = new Set<() => void>()

  async connect(config: TransportConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeoutMs = config.connectTimeoutMs ?? 5000

      const timer = setTimeout(() => {
        this.destroySocket()
        const error = new TransportError(
          'Kết nối TCP tới InBody quá thời gian (Timeout)',
          'TIMEOUT',
        )
        this.notifyError(error)
        reject(error)
      }, timeoutMs)

      try {
        this.socket = TcpSocket.createConnection({ host: config.host, port: config.port }, () => {
          clearTimeout(timer)
          this.connected = true
          resolve()
        })

        // Lắng nghe dữ liệu byte từ Socket với encoding latin1 (nhị phân transparent)
        this.socket.on('data', (data: string | Buffer | Uint8Array) => {
          let bytes: Uint8Array
          if (data instanceof Uint8Array) {
            bytes = data
          } else if (typeof data === 'string') {
            const buf = Buffer.from(data, 'latin1')
            bytes = new Uint8Array(buf)
          } else {
            bytes = new Uint8Array(data)
          }
          this.dataListeners.forEach((cb) => cb(bytes))
        })

        this.socket.on('error', (err: any) => {
          clearTimeout(timer)
          const error = new TransportError(err?.message ?? 'Lỗi kết nối TCP Socket', 'SOCKET_ERROR')
          this.notifyError(error)
          reject(error)
        })

        this.socket.on('close', () => {
          this.connected = false
          this.closeListeners.forEach((cb) => cb())
        })
      } catch (err: any) {
        clearTimeout(timer)
        const error = new TransportError(
          err?.message ?? 'Không thể tạo TCP connection',
          'CONNECT_FAILED',
        )
        reject(error)
      }
    })
  }

  async disconnect(): Promise<void> {
    this.destroySocket()
    this.connected = false
  }

  async write(data: Uint8Array): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.connected) {
        const error = new TransportError('Socket chưa được kết nối', 'WRITE_FAILED')
        reject(error)
        return
      }

      try {
        // Chuyển mảng byte Uint8Array thành Buffer truyền qua socket dạng latin1
        const buffer = Buffer.from(data)
        this.socket.write(buffer, 'latin1' as any, (err?: Error) => {
          if (err) {
            const error = new TransportError(err.message, 'WRITE_FAILED')
            reject(error)
          } else {
            resolve()
          }
        })
      } catch (err: any) {
        reject(
          new TransportError(err?.message ?? 'Lỗi khi ghi dữ liệu xuống Socket', 'WRITE_FAILED'),
        )
      }
    })
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

  private notifyError(error: TransportError) {
    this.errorListeners.forEach((cb) => cb(error))
  }

  private destroySocket() {
    if (this.socket) {
      try {
        this.socket.destroy()
      } catch {
        // Ignore destroy error
      }
      this.socket = null
    }
  }
}
