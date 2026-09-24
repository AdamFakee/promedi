/**
 * Định nghĩa các Interface, Type và Custom Error dùng chung cho tầng Hardware Transport Layer.
 *
 * @module src/core/hardware/transport/transport.interface.ts
 */

/**
 * Contract chung cho mọi trình vận chuyển dữ liệu phần cứng (USB Serial, TCP Socket, Bluetooth...).
 * Tầng Protocol và Client API chỉ phụ thuộc interface này mà không biết chi tiết transport thật bên dưới.
 */
export interface DeviceTransport {
  /** Mở kết nối bất đồng bộ */
  connect(config: TransportConfig): Promise<void>
  /** Ngắt kết nối và giải phóng tài nguyên */
  disconnect(): Promise<void>
  /** Ghi mảng byte nhị phân thô xuống thiết bị */
  write(data: Uint8Array): Promise<void>
  /** Lắng nghe mảng byte dữ liệu mới nhận từ thiết bị */
  onData(callback: (chunk: Uint8Array) => void): () => void
  /** Lắng nghe lỗi giao tiếp phần cứng */
  onError(callback: (err: TransportError) => void): () => void
  /** Lắng nghe sự kiện kết nối bị đóng/ngắt cáp vật lý */
  onClose(callback: () => void): () => void
  /** Trả về trạng thái đang kết nối hay không */
  isConnected(): boolean
}

/**
 * Union type chứa cấu hình khởi tạo kết nối phần cứng.
 * - 'tcp': Cấu hình cho TCP Socket (host, port).
 * - 'usb-serial': Cấu hình cho USB Serial (portId, deviceKey, baudRate).
 */
export type TransportConfig =
  | { type?: 'tcp'; host: string; port: number; connectTimeoutMs?: number }
  | {
      type: 'usb-serial'
      portId: string
      deviceKey: string
      baudRate: number
      connectTimeoutMs?: number
    }

/**
 * Custom Error chuyên dụng cho tầng Transport.
 * Phân loại chi tiết mã lỗi để hỗ trợ State Machine xử lý khôi phục phù hợp.
 */
export class TransportError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'CONNECT_FAILED' // Lỗi kết nối thất bại
      | 'WRITE_FAILED' // Lỗi ghi byte thất bại
      | 'SOCKET_ERROR' // Lỗi phát sinh từ socket/stream
      | 'PERMISSION_DENIED' // Người dùng từ chối cấp quyền USB
      | 'DEVICE_DETACHED' // Dây cáp USB bị rút đột ngột
      | 'DEVICE_NOT_FOUND', // Không tìm thấy thiết bị USB khớp với deviceKey
  ) {
    super(message)
    this.name = 'TransportError'
  }
}
