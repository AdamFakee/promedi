import { minLength, object, pipe, string, transform, type InferOutput } from 'valibot'

export const activateDeviceSchema = object({
  deviceCode: pipe(
    string(),
    minLength(1, 'Mã máy / Thiết bị là bắt buộc'),
    transform((s) => s.trim().toUpperCase()),
  ),
  activationToken: pipe(
    string(),
    minLength(1, 'Mã kích hoạt (Token) là bắt buộc'),
    transform((s) => s.trim()),
  ),
})

export type ActivateDeviceFormData = InferOutput<typeof activateDeviceSchema>
