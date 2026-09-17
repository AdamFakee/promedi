export type PaymentMethodCode = 'cash' | 'card' | 'qr' | 'bank_transfer' | (string & {})

export type PortablePaymentCommandResult = Record<string, unknown>

/**
 * Dữ liệu Snapshot ghi nhận lịch sử các giao dịch thanh toán của đơn hàng.
 * Trường `method` dùng PaymentMethodCode làm chuẩn duy nhất.
 */
export interface PaymentSnapshot {
  /** Phương thức thanh toán (PaymentMethodCode) */
  method: PaymentMethodCode
  /** Số tiền giao dịch */
  amount: number
  /** Tiền khách đưa (Dùng cho Tiền mặt) */
  cashTendered?: number
  /** Tiền thối lại (Dùng cho Tiền mặt) */
  cashChange?: number
  /** Mã tham chiếu giao dịch (Dùng cho QR/Bank/Card) */
  referenceCode?: string
  /** Loại thẻ (Dùng cho Card) */
  cardType?: string
  /** Lưu toàn bộ đối tượng kết quả thanh toán từ máy POS di động */
  portablePaymentResult?: PortablePaymentCommandResult
}

/**
 * Chuẩn hóa dữ liệu danh sách giao dịch thanh toán Snapshot
 */
export const sanitizePaymentsSnapshot = (rawPayments: unknown): PaymentSnapshot[] => {
  if (!Array.isArray(rawPayments)) return []
  return rawPayments.map((payment) => {
    const item = payment && typeof payment === 'object' ? (payment as Record<string, unknown>) : {}

    return {
      method: (item.method as PaymentMethodCode) || 'cash',
      amount: Number(item.amount || 0),
      cashTendered: item.cashTendered !== undefined ? Number(item.cashTendered) : undefined,
      cashChange: item.cashChange !== undefined ? Number(item.cashChange) : undefined,
      referenceCode: item.referenceCode ? String(item.referenceCode) : undefined,
      cardType: item.cardType ? String(item.cardType) : undefined,
      portablePaymentResult:
        item.portablePaymentResult && typeof item.portablePaymentResult === 'object'
          ? (item.portablePaymentResult as PortablePaymentCommandResult)
          : undefined,
    }
  })
}
