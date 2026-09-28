/**
 * Client Public API điều khiển máy đo huyết áp BPBIO750 ở tầng ứng dụng.
 *
 * Chức năng:
 * - Gom 3 gói dữ liệu đơn lẻ: Tâm thu (`S`), Tâm trương (`D`), Nhịp tim (`P`) thành `BloodPressureResult` hoàn chỉnh.
 * - Xử lý an toàn khi người dùng hủy/đo lại giữa chừng: Tự động reset bộ đệm tạm `pending` nếu gặp gói `identifier` trùng lặp trong 1 chu kỳ đo.
 * - Expose các phương thức điều khiển: `requestResult()`, `stop()`, `lock()`, `unlock()`.
 *
 * @module src/core/hardware/bpbio/client/bpbio-client.ts
 */

import type { DeviceTransport, TransportConfig } from '../../transport/transport.interface'
import { buildBpbioCommandFrame } from '../protocol/commands'
import { COMMANDS } from '../protocol/constants'
import { BpbioFrameCodec, type BpbioDataFrame } from '../protocol/frame-codec'
import type { BloodPressureResult } from '../types/bpbio.types'

export class BpbioClient {
  /** Frame Codec riêng của BPBIO750, không dùng chung với InBody */
  private codec = new BpbioFrameCodec()
  /** Bộ đệm tạm lưu các gói S/D/P đã nhận được trong chu kỳ đo hiện tại */
  private pending: Partial<BloodPressureResult> = {}
  /** Tập hợp các callback lắng nghe gói dữ liệu mới */
  private onFrameCallbacks = new Set<(frame: BpbioDataFrame) => void>()
  /** Unsubscribe listener từ transport */
  private unsubscribeTransportData: (() => void) | null = null

  constructor(private transport: DeviceTransport) {
    // Đăng ký lắng nghe luồng byte từ Transport và đẩy vào FrameCodec
    this.unsubscribeTransportData = this.transport.onData((chunk) => {
      const frames = this.codec.feed(chunk)
      for (const frame of frames) {
        this.applyFrame(frame)
        this.onFrameCallbacks.forEach((cb) => cb(frame))
      }
    })
  }

  /**
   * Mở kết nối tới thiết bị BPBIO750 qua Transport.
   */
  async connect(config: TransportConfig): Promise<void> {
    return this.transport.connect(config)
  }

  /**
   * Ngắt kết nối và dọn dẹp bộ đệm tạm.
   */
  async disconnect(): Promise<void> {
    this.codec.reset()
    this.pending = {}
    if (this.unsubscribeTransportData) {
      this.unsubscribeTransportData()
      this.unsubscribeTransportData = null
    }
    return this.transport.disconnect()
  }

  /**
   * Cập nhật gói dữ liệu mới vào bộ đệm `pending`.
   * Tự động reset `pending` nếu nhận được định danh đã có sẵn (Dấu hiệu chu kỳ đo mới bắt đầu sau khi đo dở dang).
   */
  private applyFrame(frame: BpbioDataFrame): void {
    if (frame.identifier === 'S' && this.pending.systolic != null) this.pending = {}
    if (frame.identifier === 'D' && this.pending.diastolic != null) this.pending = {}
    if (frame.identifier === 'P' && this.pending.pulse != null) this.pending = {}

    if (frame.identifier === 'S') this.pending.systolic = frame.value
    if (frame.identifier === 'D') this.pending.diastolic = frame.value
    if (frame.identifier === 'P') this.pending.pulse = frame.value
  }

  /**
   * Đăng ký callback lắng nghe từng gói dữ liệu bóc tách được.
   */
  onFrame(cb: (frame: BpbioDataFrame) => void): () => void {
    this.onFrameCallbacks.add(cb)
    return () => {
      this.onFrameCallbacks.delete(cb)
    }
  }

  /**
   * Kiểm tra bộ đệm đã thu thập đủ cả 3 chỉ số hợp lệ (Tâm thu, Tâm trương, Nhịp tim) chưa.
   */
  isResultComplete(): boolean {
    return (
      this.pending.systolic != null && this.pending.diastolic != null && this.pending.pulse != null
    )
  }

  /**
   * Rút đối tượng kết quả `BloodPressureResult` đã gom đủ và xóa sạch bộ đệm tạm `pending`.
   */
  consumeResult(): BloodPressureResult {
    const result: BloodPressureResult = {
      systolic: this.pending.systolic ?? null,
      diastolic: this.pending.diastolic ?? null,
      pulse: this.pending.pulse ?? null,
    }
    this.pending = {}
    return result
  }

  /** Xóa bộ đệm tạm khi gặp lỗi */
  clearPending(): void {
    this.pending = {}
  }

  /** Gửi lệnh yêu cầu rút kết quả đo (Lệnh 0x43) */
  async requestResult(): Promise<void> {
    return this.transport.write(buildBpbioCommandFrame(COMMANDS.REQUEST_RESULT))
  }

  /** Gửi lệnh dừng đo khẩn cấp (Lệnh 0x46) */
  async stop(): Promise<void> {
    return this.transport.write(buildBpbioCommandFrame(COMMANDS.STOP))
  }

  /** Gửi lệnh khóa màn hình thiết bị (Lệnh 0x4C) */
  async lock(): Promise<void> {
    return this.transport.write(buildBpbioCommandFrame(COMMANDS.LOCK))
  }

  /** Gửi lệnh mở khóa màn hình thiết bị (Lệnh 0x72) */
  async unlock(): Promise<void> {
    return this.transport.write(buildBpbioCommandFrame(COMMANDS.UNLOCK))
  }
}
