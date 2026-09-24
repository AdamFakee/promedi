/**
 * Client Public API chính điều khiển thiết bị InBody 260S ở tầng ứng dụng.
 * @module src/core/hardware/inbody/client/inbody-client.ts
 */

import { FrameCodec } from '../protocol/frame-codec'
import {
  buildStatusCommand,
  buildInfoCommand,
  buildLockCommand,
  buildResultCommand,
  buildSkipCommand,
  buildSetTimeCommand,
} from '../protocol/commands'
import { mapResultFields } from '../protocol/result-mapper'
import type { DeviceTransport, TransportConfig } from '../../transport'

import type { PatientInfo, InBodyResult, InBodyStatus } from '../types/inbody.types'

export class InBodyClient {
  private codec = new FrameCodec()
  private isProcessing = false

  constructor(private transport: DeviceTransport) {}

  /** Kết nối tới thiết bị qua Transport */
  async connect(config: TransportConfig): Promise<void> {
    return this.transport.connect(config)
  }

  /** Ngắt kết nối và dọn dẹp codec */
  async disconnect(): Promise<void> {
    this.codec.reset()
    return this.transport.disconnect()
  }

  /** Gửi lệnh Khóa / Mở khóa màn hình InBody */
  async lock(flag: '0' | '1' | '2'): Promise<void> {
    await this.sendAndWaitAck(buildLockCommand(this.codec, flag))
  }

  /** Nạp thông tin cá nhân khách hàng xuống thiết bị */
  async sendInfo(info: PatientInfo): Promise<void> {
    await this.sendAndWaitAck(buildInfoCommand(this.codec, info))
  }

  /** Bỏ qua trang thông báo lỗi trên thiết bị */
  async skip(): Promise<void> {
    await this.sendAndWaitAck(buildSkipCommand(this.codec))
  }

  /** Đồng bộ thời gian hệ thống cho InBody */
  async setTime(date: Date = new Date()): Promise<void> {
    await this.sendAndWaitAck(buildSetTimeCommand(this.codec, date))
  }

  /**
   * Hỏi trạng thái thiết bị 1 lần (dùng cho Polling Actor).
   */
  async pollStatusOnce(): Promise<InBodyStatus> {
    const frame = await this.sendAndWaitFrame(buildStatusCommand(this.codec), 800)
    const code = frame.fields[0] ?? ''
    const errorCode = frame.fields[1]
    return { code, errorCode }
  }

  /**
   * Rút mảng dữ liệu kết quả đo BIA và parse sang InBodyResult.
   */
  async requestResult(): Promise<InBodyResult> {
    const frame = await this.sendAndWaitFrame(buildResultCommand(this.codec), 2500)
    return mapResultFields(frame.fields)
  }

  /** Kiểm tra kết nối */
  isConnected(): boolean {
    return this.transport.isConnected()
  }

  /**
   * Hàm cốt lõi gửi mảng byte và chờ phản hồi khung ETX từ InBody.
   * Áp dụng cờ Mutex `isProcessing` đảm bảo giao tiếp Half-Duplex an toàn.
   */
  private sendAndWaitFrame(
    payload: Uint8Array,
    timeoutMs = 800,
  ): Promise<{ command: number; fields: string[] }> {
    return new Promise((resolve, reject) => {
      if (this.isProcessing) {
        reject(new Error('Thiết bị đang bận xử lý câu lệnh trước đó (Half-Duplex Mutex Lock)'))
        return
      }

      this.isProcessing = true

      const timer = setTimeout(() => {
        cleanup()
        this.isProcessing = false
        reject(new Error(`Timeout (${timeoutMs}ms) không nhận được byte ETX từ InBody`))
      }, timeoutMs)

      const unsubscribe = this.transport.onData((chunk: Uint8Array) => {
        const frames = this.codec.feed(chunk)
        if (frames.length > 0) {
          cleanup()
          this.isProcessing = false
          resolve(frames[0])
        }
      })

      const cleanup = () => {
        clearTimeout(timer)
        unsubscribe()
      }

      this.transport.write(payload).catch((err) => {
        cleanup()
        this.isProcessing = false
        reject(err)
      })
    })
  }

  private async sendAndWaitAck(payload: Uint8Array): Promise<void> {
    await this.sendAndWaitFrame(payload)
  }
}
