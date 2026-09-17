import * as ImagePicker from 'expo-image-picker'
import { toast } from '@/shared/store/use-alert-store'

export interface PickedImageResult {
  uri: string
  width?: number
  height?: number
  fileSize?: number
  fileName?: string
}

export interface CameraPickOptions {
  quality?: number
  allowsEditing?: boolean
}

export interface GalleryPickOptions {
  quality?: number
  allowsMultipleSelection?: boolean
  selectionLimit?: number
}

/**
 * Reusable utility to request Camera permission & launch camera capture
 */
export async function pickImageFromCamera(
  options: CameraPickOptions = {},
): Promise<PickedImageResult | null> {
  try {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync()
    if (!permissionResult.granted) {
      toast.error('Ứng dụng cần quyền truy cập Camera để chụp ảnh', 'Chưa cấp quyền')
      return null
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: options.quality ?? 0.9,
      allowsEditing: options.allowsEditing ?? false,
    })

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0]
      return {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        fileSize: asset.fileSize,
        fileName: asset.fileName || undefined,
      }
    }
    return null
  } catch (err: any) {
    toast.error('Không thể mở máy ảnh: ' + (err?.message || 'Lỗi không xác định'))
    return null
  }
}

/**
 * Reusable utility to request Media Library permission & launch gallery picker
 */
export async function pickImagesFromGallery(
  options: GalleryPickOptions = {},
): Promise<PickedImageResult[]> {
  try {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permissionResult.granted) {
      toast.error('Ứng dụng cần quyền truy cập Thư viện ảnh', 'Chưa cấp quyền')
      return []
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: options.allowsMultipleSelection ?? true,
      selectionLimit: options.selectionLimit ?? 6,
      quality: options.quality ?? 0.9,
    })

    if (!result.canceled && result.assets && result.assets.length > 0) {
      return result.assets.map((asset) => ({
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        fileSize: asset.fileSize,
        fileName: asset.fileName || undefined,
      }))
    }
    return []
  } catch (err: any) {
    toast.error('Không thể mở thư viện ảnh: ' + (err?.message || 'Lỗi không xác định'))
    return []
  }
}
