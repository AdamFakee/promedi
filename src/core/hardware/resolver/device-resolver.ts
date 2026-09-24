/**
 * Bộ điều phối tự động dò cổng và gán vai trò thiết bị (Device Resolver Core).
 *
 * Chức năng:
 * - Thực hiện quy trình Zero-Touch dải trạm Kiosk: Tự động phát hiện đâu là máy InBody 260S và đâu là máy BPBIO750.
 * - Luồng 2 bước:
 *   1. Fast-Path: Kiểm tra nhanh cache đã lưu trong BindingStore. Nếu dây cắm không đổi, hoàn thành chỉ trong vài MS.
 *   2. Probe Scan: Nếu cache lỏng/thiếu, duyệt lần lượt các candidate USB và mở cổng dưới namespace `probe:role` để thử giao thức.
 *
 * @module src/core/hardware/resolver/device-resolver.ts
 */

import { PROBES, type DeviceProbe } from './device-probes'
import type { DeviceRole, DeviceBinding, BindingStore } from './binding-store'

import type { UsbDeviceCandidate } from '../../../../modules/expo-usb-serial-bridge'
import { UsbSerialTransport } from '../transport/usb-serial-transport'

export class DeviceResolver {
  constructor(
    private listCandidateDevices: () => Promise<UsbDeviceCandidate[]>,
    private requestPermission: (deviceKey: string) => Promise<boolean>,
    private store: BindingStore,
  ) {}

  /**
   * Tự động dò tất cả các vai trò thiết bị ('inbody' | 'bpbio') và trả về Map liên kết.
   *
   * @return Promise<Map<DeviceRole, DeviceBinding>> Map kết quả ánh xạ từng vai trò với deviceKey tương ứng.
   */
  async resolveAll(): Promise<Map<DeviceRole, DeviceBinding>> {
    const result = new Map<DeviceRole, DeviceBinding>()
    const saved = await this.store.getAll()
    const liveCandidates = await this.listCandidateDevices()
    const liveKeys = new Set(liveCandidates.map((c) => c.deviceKey))

    // Bước 1: Fast-Path Verification — Kiểm tra nhanh danh sách binding đã lưu
    for (const binding of saved) {
      if (!liveKeys.has(binding.deviceKey)) continue
      if (await this.verifyBinding(binding)) {
        result.set(binding.role, { ...binding, lastVerifiedAt: Date.now() })
      }
    }

    // Nếu tất cả các vai trò đã được xác minh thành công -> Ghi storage và trả kết quả ngay
    const unresolvedRoles = PROBES.filter((p) => !result.has(p.role))
    if (unresolvedRoles.length === 0) {
      await this.store.saveAll([...result.values()])
      return result
    }

    // Bước 2: Fallback Probe Scan — Quét dò tìm tự động cho các vai trò chưa xác định
    const usedKeys = new Set([...result.values()].map((b) => b.deviceKey))
    const candidates = liveCandidates.filter((c) => !usedKeys.has(c.deviceKey))

    for (const probe of unresolvedRoles) {
      for (const candidate of candidates) {
        if (usedKeys.has(candidate.deviceKey)) continue

        // Xin quyền truy cập USB cho candidate này
        const granted = await this.requestPermission(candidate.deviceKey)
        if (!granted) continue

        // Thử mở cổng và gửi tín hiệu probe kiểm tra
        if (await this.tryProbe(candidate.deviceKey, probe)) {
          result.set(probe.role, {
            role: probe.role,
            deviceKey: candidate.deviceKey,
            resolvedAt: Date.now(),
            lastVerifiedAt: Date.now(),
          })
          usedKeys.add(candidate.deviceKey) // Đánh dấu USB này đã gán vai trò -> Không gán trùng
          break
        }
      }
    }

    // Lưu kết quả tự dò mới nhất vào bộ nhớ MMKV
    await this.store.saveAll([...result.values()])
    return result
  }

  /**
   * Xác minh 1 binding đã lưu có đúng thiết bị hay không bằng cách gọi lại probe.
   */
  private async verifyBinding(binding: DeviceBinding): Promise<boolean> {
    const probe = PROBES.find((p) => p.role === binding.role)
    if (!probe) return false
    return this.tryProbe(binding.deviceKey, probe)
  }

  /**
   * Thử mở cổng USB và gọi probe signature để bắt tay kiểm tra thiết bị.
   * Sử dụng portId dạng `probe:inbody` hoặc `probe:bpbio` để không ảnh hưởng đến các cổng đo thật đang hoạt động.
   */
  private async tryProbe(deviceKey: string, probe: DeviceProbe): Promise<boolean> {
    const transport = new UsbSerialTransport()
    const probePortId = `probe:${probe.role}`
    try {
      await transport.connect({
        type: 'usb-serial',
        portId: probePortId,
        deviceKey,
        baudRate: probe.baudRate,
        connectTimeoutMs: 800,
      })
      return await probe.probe(transport)
    } catch {
      return false
    } finally {
      await transport.disconnect()
    }
  }
}
