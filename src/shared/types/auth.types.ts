export const Permission = {
  'asset:read': 'asset:read',
  'asset:report_broken': 'asset:report_broken',
  'stock:write_in': 'stock:write_in',
  'stock:write_out': 'stock:write_out',
  'stock:read': 'stock:read',
  'inventory:write': 'inventory:write',
  'inventory:approve': 'inventory:approve',
  'dispatch:write': 'dispatch:write',
  'disposal:write': 'disposal:write',
  'disposal:approve': 'disposal:approve',
  'loan:write': 'loan:write',
  'rfid:config_preset': 'rfid:config_preset',
  'rfid:config_advanced': 'rfid:config_advanced',
  'rfid:write_tag': 'rfid:write_tag',
  'maintenance:accept': 'maintenance:accept',
  'maintenance:complete': 'maintenance:complete',
  'repair:update_result': 'repair:update_result',
} as const

export type PermissionKey = keyof typeof Permission
export type PermissionValue = (typeof Permission)[PermissionKey]

export interface Employee {
  id: string
  code: string
  fullName: string
  permissions: PermissionValue[]
  departmentId?: string
  departmentName?: string
}
