import type { RequisitionSlip } from '@/shared/types'

/** Mock dataset Phiếu Lĩnh Chờ Xử Lý từ HIS */
export const MOCK_REQUISITION_SLIPS: RequisitionSlip[] = [
  {
    id: 'req-001',
    code: 'PL-2026-0892',
    departmentId: 'loc-dept-surgery',
    departmentName: 'Khoa Phẫu Thuật Gây Mê Hồi Sức',
    requestedItemsCount: 150,
    priority: 'URGENT',
    status: 'WAITING_DISPATCH',
    createdAt: '08:30 - Hôm nay',
    createdByName: 'ĐD Trưởng Nguyễn Thị X',
    targetLocation: {
      id: 'loc-dept-surgery',
      code: 'K-PHAUTHUAT',
      name: 'Khoa Phẫu Thuật Gây Mê Hồi Sức',
      building: 'Tòa A',
      floor: 'Tầng 3',
    },
  },
  {
    id: 'req-002',
    code: 'PL-2026-0895',
    departmentId: 'loc-dept-icu',
    departmentName: 'Khoa Hồi Sức Tích Cực (ICU)',
    requestedItemsCount: 80,
    priority: 'URGENT',
    status: 'WAITING_DISPATCH',
    createdAt: '09:15 - Hôm nay',
    createdByName: 'KTV Trưởng Trần Văn B',
    targetLocation: {
      id: 'loc-dept-icu',
      code: 'K-ICU',
      name: 'Khoa Hồi Sức Tích Cực (ICU)',
      building: 'Tòa B',
      floor: 'Tầng 2',
    },
  },
  {
    id: 'req-003',
    code: 'PL-2026-0901',
    departmentId: 'loc-dept-emergency',
    departmentName: 'Khoa Cấp Cứu Đa Khoa',
    requestedItemsCount: 45,
    priority: 'NORMAL',
    status: 'WAITING_DISPATCH',
    createdAt: '09:40 - Hôm nay',
    createdByName: 'Điều dưỡng Lê Thị C',
    targetLocation: {
      id: 'loc-dept-emergency',
      code: 'K-CAPCUU',
      name: 'Khoa Cấp Cứu Đa Khoa',
      building: 'Tòa A',
      floor: 'Tầng 1',
    },
  },
]
