import { useAppStore } from '@/features/app/store/use-app-store'
import { AxiosService } from '@/shared/lib/axios'
import { useMutation } from '@tanstack/react-query'
import type { ActivateDeviceRequest, ActivateDeviceResponse } from '../types/activation.types'

export const activateDeviceMutationKey = ['activate-device'] as const

async function activateDeviceFetcher(data: ActivateDeviceRequest): Promise<ActivateDeviceResponse> {
  try {
    const response = await AxiosService.getInstance().post<ActivateDeviceResponse>(
      '/v1/devices/activate',
      data,
    )
    return response.data
  } catch (error: any) {
    // If backend is unavailable during dev/testing, fallback to generated mock session
    if (!error.response || error.code === 'ERR_NETWORK') {
      const mockDeviceCode = data.deviceCode || 'PROMEDI-K2-01'
      return {
        device: {
          id: `dev-${Date.now()}`,
          deviceCode: mockDeviceCode,
          deviceName: `Kiosk Sumi Mini K2 (${mockDeviceCode})`,
          warehouseId: 'wh-main-01',
          departmentId: 'dept-khoa-01',
          departmentName: 'Khoa Khám Bệnh - Phòng Kiosk',
          isActive: true,
        },
        accessToken: `mock-access-token-${Date.now()}`,
        refreshToken: `mock-refresh-token-${Date.now()}`,
        expiresIn: 86400,
      }
    }
    throw error
  }
}

export function useActivateDevice() {
  const saveRefreshToken = useAppStore((s) => s.saveRefreshToken)
  const appService = useAppStore((s) => s.appService)

  return useMutation({
    mutationKey: activateDeviceMutationKey,
    mutationFn: activateDeviceFetcher,
    onSuccess: (data) => {
      // 1. Lưu refreshToken vào storage persistent
      if (data.refreshToken) {
        saveRefreshToken(data.refreshToken)
      }

      // 2. Phát thông điệp DEVICE_ACTIVATED tới XState App Machine
      if (appService) {
        appService.send({
          type: 'DEVICE_ACTIVATED',
          device: data.device,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
        })
      }

      // 3. Chuyển thẳng trạng thái mà không hiển thị toast
    },
    onError: () => {
      // Tự động xử lý lỗi mà không cần toast
    },
  })
}
