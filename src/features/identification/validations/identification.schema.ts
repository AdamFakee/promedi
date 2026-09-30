import { minLength, object, picklist, pipe, regex, string, trim, type InferOutput } from 'valibot'

export const identificationFormSchema = object({
  fullName: pipe(
    string('Vui lòng nhập Họ và tên'),
    trim(),
    minLength(1, 'Vui lòng nhập Họ và tên'),
  ),
  identityCode: pipe(
    string('Vui lòng nhập số căn cước công dân'),
    trim(),
    minLength(1, 'Vui lòng nhập số căn cước công dân'),
    regex(/^$|^\d{12}$/, 'Số căn cước công dân phải đúng 12 chữ số'),
  ),
  age: pipe(
    string('Vui lòng nhập số tuổi'),
    trim(),
    minLength(1, 'Vui lòng nhập số tuổi'),
    regex(/^$|^([1-9]|[1-9][0-9]|1[01][0-9]|120)$/, 'Tuổi hợp lệ từ 1 đến 120'),
  ),
  gender: picklist(['M', 'F'], 'Vui lòng chọn giới tính'),
})

export type IdentificationFormData = InferOutput<typeof identificationFormSchema>
