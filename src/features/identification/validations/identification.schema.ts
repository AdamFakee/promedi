import { minLength, object, pipe, regex, string, trim, type InferOutput } from 'valibot'

export const identificationFormSchema = object({
  fullName: pipe(string('Họ và tên không hợp lệ'), trim(), minLength(1, 'Vui lòng nhập Họ và tên')),
  identityCode: pipe(
    string('Số CCCD không hợp lệ'),
    trim(),
    minLength(1, 'Vui lòng nhập số căn cước công dân'),
    regex(/^\d{12}$/, 'Số căn cước công dân phải đúng 12 chữ số'),
  ),
})

export type IdentificationFormData = InferOutput<typeof identificationFormSchema>
