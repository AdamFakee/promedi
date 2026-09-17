import type { InventoryAuditItem, InventoryItem } from '../types'
import { AssetStatus } from '../types'

const DEVICE_TYPES = [
  { name: 'Máy thở y tế cao cấp Hamilton C3', unit: 'Cái', prefix: 'MAYTHO' },
  { name: 'Bơm tiêm điện Terumo TE-331', unit: 'Chiếc', prefix: 'BOMTIEM' },
  { name: 'Máy Monitor Bedside Nihon Kohden BSM-3562', unit: 'Cái', prefix: 'MONITOR' },
  { name: 'Máy sốc tim ZOLL R Series', unit: 'Bộ', prefix: 'SOCTIM' },
  { name: 'Hệ thống Đèn mổ treo trần Luvis S200', unit: 'Bộ', prefix: 'DENMO' },
  { name: 'Bàn mổ đa năng Mindray HyBase 6100', unit: 'Chiếc', prefix: 'BANMO' },
  { name: 'Máy siêu âm màu 4D GE Voluson E10', unit: 'Cái', prefix: 'SIEUAM' },
  { name: 'Máy làm ấm máu & dịch truyền Ranger 3M', unit: 'Cái', prefix: 'LAMAM' },
  { name: 'Máy truyền dịch B.Braun Infusomat space', unit: 'Chiếc', prefix: 'TRUYENDICH' },
  { name: 'Kính hiển vi phẫu thuật Leica M530 OH6', unit: 'Bộ', prefix: 'KINHMO' },
]

const DEPARTMENTS = [
  { id: 'loc-or-01', name: 'Phòng Mổ 01' },
  { id: 'loc-icu-01', name: 'Khoa Hồi sức tích cực (ICU)' },
  { id: 'loc-emer-01', name: 'Khoa Cấp cứu' },
  { id: 'loc-rad-01', name: 'Khoa Chẩn đoán hình ảnh' },
]

/** 5 Mã Tag RFID EPC Thực tế từ Thiết bị Cầm tay Chainway C5 */
export const PHYSICAL_CHAINWAY_RFID_TAGS = [
  'e2000020140502061830b4db',
  'e2000020140502150540bfdb',
  'e2000020140502431140ddf5',
  'e20000201407006525702414',
  'e20000201407007403802f49',
]

/**
 * Sinh ngẫu nhiên 500 tài sản & vật tư y tế mock để benchmark hiệu năng FlashList
 * Đảm bảo 5 tag RFID thực tế luôn thuộc Phòng Mổ 01 để quét ăn khớp ngay 100%
 */
function generateMockInventoryItems(count = 500): (InventoryItem & InventoryAuditItem)[] {
  const items: (InventoryItem & InventoryAuditItem)[] = []

  for (let i = 1; i <= count; i++) {
    const devType = DEVICE_TYPES[(i - 1) % DEVICE_TYPES.length]
    // 5 item đầu tiên gán cố định 5 EPC tag thực tế và vị trí Phòng Mổ 01
    const isPhysicalTag = i <= PHYSICAL_CHAINWAY_RFID_TAGS.length
    const loc = isPhysicalTag
      ? DEPARTMENTS[0]
      : i % 10 < 8
        ? DEPARTMENTS[0]
        : DEPARTMENTS[i % DEPARTMENTS.length]

    const isUniversalCode = i === 4
    const code = isUniversalCode
      ? 'ABC-abc-1234'
      : `TS-${devType.prefix}-${String(i).padStart(4, '0')}`
    const hexEpc = isPhysicalTag
      ? PHYSICAL_CHAINWAY_RFID_TAGS[i - 1]
      : `E28068940000501234${String(i).padStart(6, '0')}`

    const status = i % 5 === 0 ? AssetStatus.UNDER_REPAIR : AssetStatus.IN_STOCK

    items.push({
      id: `ast-${i}`,
      code,
      name: isUniversalCode ? 'Máy siêu âm màu 4D GE Voluson E10' : `${devType.name} #${i}`,
      unit: devType.unit,
      trackingType: 'SERIALIZED',
      identificationType: isUniversalCode ? 'BARCODE' : 'RFID',
      rfidEpc: hexEpc,
      barcodeData: code,
      status,
      locationId: loc.id,
      locationName: loc.name,
      category: 'UNSCANNED',
      bookQuantity: 1,
      actualQuantity: 0,
    })
  }

  return items
}

export const MOCK_INVENTORY_ITEMS = generateMockInventoryItems(500)
