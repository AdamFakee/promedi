import { useState } from 'react'
import type {
  CameraPickOptions,
  GalleryPickOptions,
  PickedImageResult,
} from '../utils/image-picker.utils'
import { pickImageFromCamera, pickImagesFromGallery } from '../utils/image-picker.utils'

export function useImagePicker() {
  const [isPicking, setIsPicking] = useState(false)

  const pickFromCamera = async (options?: CameraPickOptions): Promise<PickedImageResult | null> => {
    setIsPicking(true)
    try {
      return await pickImageFromCamera(options)
    } finally {
      setIsPicking(false)
    }
  }

  const pickFromGallery = async (options?: GalleryPickOptions): Promise<PickedImageResult[]> => {
    setIsPicking(true)
    try {
      return await pickImagesFromGallery(options)
    } finally {
      setIsPicking(false)
    }
  }

  return {
    isPicking,
    pickFromCamera,
    pickFromGallery,
  }
}
