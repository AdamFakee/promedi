/**
 * Interface contract cho phân lớp Transport cách ly logic socket TCP khỏi Protocol và Business logic.
 * @module src/core/hardware/inbody/transport/transport.interface.ts
 */

/** Cấu hình kết nối thiết bị */
export interface TransportConfig {
  /** Địa chỉ IP của máy InBody (Ví dụ: '192.168.1.50') */
  host: string
  /** Cổng kết nối TCP (Mặc định Port 2004) */
  port: number
  /** Thời gian chờ kết nối tối đa (ms), mặc định 5000ms */
  connectTimeoutMs?: number
}

/** Lớp ngoại lệ chuyên biệt cho Transport */
export class TransportError extends Error {
  constructor(
    message: string,
    public readonly code: 'CONNECT_FAILED' | 'WRITE_FAILED' | 'SOCKET_ERROR' | 'TIMEOUT',
  ) {
    super(message)
    this.name = 'TransportError'
  }
}

/**
 * Port contract cho mọi phương thức truyền dữ liệu (TCP Socket, Serial Port, Bluetooth).
 */
export interface DeviceTransport {
  /** Mở kết nối tới thiết bị */
  connect(config: TransportConfig): Promise<void>
  /** Đóng kết nối */
  disconnect(): Promise<void>
  /** Gửi mảng byte thô xuống thiết bị */
  write(data: Uint8Array): Promise<void>
  /** Lắng nghe dữ liệu byte nhận được từ thiết bị */
  onData(callback: (chunk: Uint8Array) => void): () => void
  /** Lắng nghe lỗi socket/kết nối */
  onError(callback: (err: TransportError) => void): () => void
  /** Lắng nghe sự kiện ngắt kết nối */
  onClose(callback: () => void): () => void
  /** Kiểm tra trạng thái kết nối */
  isConnected(): boolean
}
