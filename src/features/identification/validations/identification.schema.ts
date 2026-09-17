import * as v from 'valibot'

export const identificationSchema = v.pipe(
  v.string(),
  v.nonEmpty('Vui lòng nhập số điện thoại hoặc CCCD'),
  v.regex(/^\d+$/, 'Chỉ được nhập các chữ số'),
  v.check(
    (val) => val.length === 10 || val.length === 12,
    'Độ dài phải đúng 10 số (SĐT) hoặc 12 số (CCCD)',
  ),
)

export type IdentificationInput = v.InferOutput<typeof identificationSchema>

export function getIdentityType(value: string): 'PHONE' | 'CCCD' | null {
  if (value.length === 10) return 'PHONE'
  if (value.length === 12) return 'CCCD'
  return null
}
