import { colors } from '@\/shared\/theme'
import React from 'react'
import Svg, { Circle, Path, Rect } from 'react-native-svg'

interface IconProps {
  size?: number
  primaryColor?: string
  accentColor?: string
  color?: string
  className?: string
}

const DEFAULT_PRIMARY = '#0F172A' // Slate 900
const DEFAULT_ACCENT = '#2563EB' // Vibrant Electric Blue

// ─────────────────────────────────────────────────────────────────────────────
// PREMIUM BOTTOM TAB NAVIGATION ICONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Tab Icon: Trang chủ (Home - Sleek Modern Dashboard House)
 */
export const SvgHomeTabIcon: React.FC<IconProps> = ({ size = 22, color = colors.neutral[500] }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 10.182V20C3 20.5523 3.44772 21 4 21H9V15C9 14.4477 9.44772 14 10 14H14C14.5523 14 15 14.4477 15 15V21H20C20.5523 21 21 20.5523 21 20V10.182C21 9.70295 20.8276 9.2404 20.5137 8.87637L13.5137 2.73091C12.6586 1.73719 11.3414 1.73719 10.4863 2.73091L3.48628 8.87637C3.17242 9.2404 3 9.70295 3 10.182Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/**
 * Icon: Cài đặt phần cứng (Gear / Settings)
 */
export const SvgSettingsIcon: React.FC<IconProps> = ({
  size = 22,
  color = colors.neutral[500],
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle
        cx="12"
        cy="12"
        r="3"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/**
 * Tab Icon: Tài sản (Assets - Resized & Visually Balanced 3D Asset Box)
 */
export const SvgAssetsTabIcon: React.FC<IconProps> = ({
  size = 23,
  color = colors.neutral[500],
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 7.5L12 2L2 7.5V16.5L12 22L22 16.5V7.5Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 2V10.5M2 7.5L12 12.5L22 7.5M12 12.5V22"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/**
 * Tab Icon: Dashboard / Tổng quan (Sleek 4-Grid Dashboard Layout)
 */
export const SvgDashboardTabIcon: React.FC<IconProps> = ({
  size = 22,
  color = colors.neutral[500],
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="3"
        width="8"
        height="8"
        rx="2"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect
        x="13"
        y="3"
        width="8"
        height="5"
        rx="2"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect
        x="13"
        y="12"
        width="8"
        height="9"
        rx="2"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect
        x="3"
        y="15"
        width="8"
        height="6"
        rx="2"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/**
 * Tab Icon: Lịch sử (History - Activity Log Clock with Reset Arrow)
 */
export const SvgHistoryTabIcon: React.FC<IconProps> = ({
  size = 22,
  color = colors.neutral[500],
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3 3v5h5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 7v5l3 2"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/**
 * Tab Icon: Tài khoản (Profile - User Avatar Badge)
 */
export const SvgProfileTabIcon: React.FC<IconProps> = ({
  size = 22,
  color = colors.neutral[500],
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M6 21V19C6 16.7909 7.79086 15 10 15H14C16.2091 15 18 16.7909 18 19V21"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// C5 HARDWARE DIAGNOSTICS & FEATURE ICONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Custom Duotone SVG Icon for C5 Trigger Key (Pistol Grip + Trigger Accent)
 */
export const SvgTriggerIcon: React.FC<IconProps> = ({
  size = 24,
  primaryColor = DEFAULT_PRIMARY,
  accentColor = '#DC2626', // Vibrant Red Accent
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 5C4 3.89543 4.89543 3 6 3H16C17.1046 3 18 3.89543 18 5V9C18 10.1046 17.1046 11 16 11H14.5L13.2 20.1C13.05 21.15 12.15 21.9 11.1 21.9H7.9C6.7 21.9 5.8 20.85 6 19.65L7 12H6C4.89543 12 4 11.1046 4 10V5Z"
        fill={primaryColor}
      />
      <Rect x="7" y="5" width="10" height="4" rx="1" fill={accentColor} />
      <Path
        d="M6 13.5C6 12.67 6.67 12 7.5 12H10.5C11.33 12 12 12.67 12 13.5V14.5C12 15.33 11.33 16 10.5 16H7.5C6.67 16 6 15.33 6 14.5V13.5Z"
        fill={accentColor}
      />
    </Svg>
  )
}

/**
 * Custom Duotone SVG Icon for Barcode Scanner (Barcode + Laser Line)
 */
export const SvgBarcodeIcon: React.FC<IconProps> = ({
  size = 24,
  primaryColor = DEFAULT_PRIMARY,
  accentColor = '#D97706', // Amber Laser Accent
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="2" height="16" rx="0.5" fill={primaryColor} />
      <Rect x="7" y="4" width="1.5" height="16" rx="0.5" fill={primaryColor} />
      <Rect x="10.5" y="4" width="3" height="16" rx="0.5" fill={primaryColor} />
      <Rect x="15" y="4" width="1.5" height="16" rx="0.5" fill={primaryColor} />
      <Rect x="18" y="4" width="3" height="16" rx="0.5" fill={primaryColor} />
      <Rect x="1" y="11" width="22" height="2" rx="1" fill={accentColor} />
    </Svg>
  )
}

/**
 * Custom Duotone SVG Icon for UHF RFID Reader (RFID Tag + Radio Wave Signals)
 */
export const SvgRfidIcon: React.FC<IconProps> = ({
  size = 24,
  primaryColor = DEFAULT_PRIMARY,
  accentColor = '#2563EB', // Blue Radio Wave Accent
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="8" y="8" width="8" height="8" rx="2" fill={primaryColor} />
      <Circle cx="12" cy="12" r="1.8" fill={accentColor} />
      <Path
        d="M4.93 4.93C1.02 8.84 1.02 15.16 4.93 19.07"
        stroke={accentColor}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <Path
        d="M19.07 4.93C22.98 8.84 22.98 15.16 19.07 19.07"
        stroke={accentColor}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <Path
        d="M7.76 7.76C5.41 10.1 5.41 13.9 7.76 16.24"
        stroke={primaryColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Path
        d="M16.24 7.76C18.59 10.1 18.59 13.9 16.24 16.24"
        stroke={primaryColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  )
}

/**
 * Custom Duotone SVG Icon for Device Health / Shield Status
 */
export const SvgDeviceShieldIcon: React.FC<IconProps> = ({
  size = 24,
  primaryColor = DEFAULT_PRIMARY,
  accentColor = '#16A34A', // Emerald Shield Check
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2L4 5V11C4 16.55 7.4 21.74 12 23C16.6 21.74 20 16.55 20 11V5L12 2Z"
        fill={primaryColor}
      />
      <Path
        d="M9 11.5L11 13.5L15.5 9"
        stroke={accentColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/**
 * Custom Duotone SVG Icon for Inventory Warehouse / Storage Box
 */
export const SvgWarehouseIcon: React.FC<IconProps> = ({
  size = 24,
  primaryColor = DEFAULT_PRIMARY,
  accentColor = DEFAULT_ACCENT,
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 9.5L12 4L21 9.5V20C21 20.55 20.55 21 20 21H4C3.45 21 3 20.55 3 20V9.5Z"
        fill={primaryColor}
      />
      <Rect x="7" y="11" width="10" height="10" rx="1" fill={accentColor} />
      <Path d="M7 14H17M7 17H17" stroke={primaryColor} strokeWidth="1.5" />
    </Svg>
  )
}

/**
 * Custom Duotone SVG Icon for Map Pin Location
 */
export const SvgMapPinIcon: React.FC<IconProps> = ({
  size = 24,
  color = colors.primary.default,
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2Z"
        fill={color}
      />
      <Circle cx="12" cy="9" r="3" fill="#FFFFFF" />
    </Svg>
  )
}

/**
 * Custom Duotone SVG Icon for Hospital Building / Location
 */
export const SvgBuildingIcon: React.FC<IconProps> = ({
  size = 24,
  primaryColor = DEFAULT_PRIMARY,
  accentColor = '#64748B',
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 21V5C4 3.9 4.9 3 6 3H18C19.1 3 20 3.9 20 5V21H4Z"
        stroke={primaryColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 7H10M14 7H15M9 11H10M14 11H15M9 15H15M11 21V18H13V21"
        stroke={accentColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD FEATURE ACTION ICONS (VIBRANT DUOTONE PALETTE)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 1. Nhập kho (Stock In) - Emerald Green Accent
 */
export const SvgStockInIcon: React.FC<IconProps> = ({
  size = 24,
  primaryColor = DEFAULT_PRIMARY,
  accentColor = '#16A34A', // Vibrant Emerald
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 10V19C4 20.1 4.9 21 6 21H18C19.1 21 20 20.1 20 19V10"
        stroke={primaryColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Path
        d="M12 3V14M12 14L8 10M12 14L16 10"
        stroke={accentColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/**
 * 2. Xuất kho (Stock Out) - Rose Red Accent
 */
export const SvgStockOutIcon: React.FC<IconProps> = ({
  size = 24,
  primaryColor = DEFAULT_PRIMARY,
  accentColor = '#DC2626', // Vibrant Rose Red
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 10V19C4 20.1 4.9 21 6 21H18C19.1 21 20 20.1 20 19V10"
        stroke={primaryColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Path
        d="M12 15V3M12 3L8 7M12 3L16 7"
        stroke={accentColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/**
 * 3. Kiểm kê (Inventory Sweep) - Amber Gold Accent
 */
export const SvgInventoryIcon: React.FC<IconProps> = ({
  size = 24,
  primaryColor = DEFAULT_PRIMARY,
  accentColor = '#D97706', // Vibrant Amber
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16 4H18C19.1 4 20 4.9 20 6V20C20 21.1 19.1 22 18 22H6C4.9 22 4 21.1 4 20V6C4 4.9 4.9 4 6 4H8"
        stroke={primaryColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Rect x="8" y="2" width="8" height="4" rx="1" fill={accentColor} />
      <Path
        d="M9 13.5L11 15.5L15.5 11"
        stroke={accentColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/**
 * 4. Cấp phát (Dispatch / Transfer) - Royal Blue Accent
 */
export const SvgDispatchIcon: React.FC<IconProps> = ({
  size = 24,
  primaryColor = DEFAULT_PRIMARY,
  accentColor = '#2563EB', // Vibrant Royal Blue
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17 4H4C2.9 4 2 4.9 2 6V17"
        stroke={primaryColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Path
        d="M7 20H20C21.1 20 22 19.1 22 18V7"
        stroke={primaryColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Path
        d="M14 7L17 4L14 1"
        stroke={accentColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M10 17L7 20L10 23"
        stroke={accentColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/**
 * 5. Báo hỏng / Sửa chữa (Maintenance) - Orange Accent
 */
export const SvgMaintenanceIcon: React.FC<IconProps> = ({
  size = 24,
  primaryColor = DEFAULT_PRIMARY,
  accentColor = '#EA580C', // Vibrant Orange
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14.7 13.5L20.5 19.3C21.1 19.9 21.1 20.9 20.5 21.5C19.9 22.1 18.9 22.1 18.3 21.5L12.5 15.7"
        stroke={primaryColor}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <Path
        d="M16 6.5C16 9.5 13.5 12 10.5 12C9.5 12 8.6 11.7 7.8 11.2L4 15L2 13L5.8 9.2C5.3 8.4 5 7.5 5 6.5C5 3.5 7.5 1 10.5 1C11.5 1 12.5 1.3 13.3 1.8L11 4.1L12.9 6L15.2 3.7C15.7 4.5 16 5.5 16 6.5Z"
        fill={accentColor}
      />
    </Svg>
  )
}

/**
 * 6. Thanh lý (Disposal) - Purple Accent
 */
export const SvgDisposalIcon: React.FC<IconProps> = ({
  size = 24,
  primaryColor = DEFAULT_PRIMARY,
  accentColor = '#9333EA', // Vibrant Purple
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6H21M19 6V20C19 21.1 18.1 22 17 22H7C5.9 22 5 21.1 5 20V6M8 6V4C8 2.9 8.9 2 10 2H14C15.1 2 16 2.9 16 4V6"
        stroke={primaryColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Path d="M10 11V17M14 11V17" stroke={accentColor} strokeWidth="2.5" strokeLinecap="round" />
    </Svg>
  )
}

/**
 * 7. Cho mượn (Loan / Borrow) - Sky Blue Accent
 */
export const SvgLoanIcon: React.FC<IconProps> = ({
  size = 24,
  primaryColor = DEFAULT_PRIMARY,
  accentColor = '#0284C7', // Vibrant Sky Blue
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M11 15L8 12L2 18L5 21L10 16L14 20L22 12L19 9L15 13L11 15Z" fill={primaryColor} />
      <Circle cx="18" cy="6" r="4" fill={accentColor} />
      <Path
        d="M18 4V8M16 6H20"
        stroke={colors.surface[50]}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </Svg>
  )
}

/**
 * 8. Quét Asset 360 (Scan 360) - Indigo Accent
 */
export const SvgScan360Icon: React.FC<IconProps> = ({
  size = 24,
  primaryColor = DEFAULT_PRIMARY,
  accentColor = '#4F46E5', // Vibrant Indigo
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 9V5C3 3.9 3.9 3 5 3H9M15 3H19C20.1 3 21 3.9 21 5V9M21 15V19C21 20.1 20.1 21 19 21H15M9 21H5C3.9 21 3 20.1 3 19V15"
        stroke={primaryColor}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <Circle cx="12" cy="12" r="4" fill={accentColor} />
    </Svg>
  )
}

/**
 * 9. Gán tag RFID (Write Tag) - Teal Accent
 */
export const SvgWriteTagIcon: React.FC<IconProps> = ({
  size = 24,
  primaryColor = DEFAULT_PRIMARY,
  accentColor = '#0D9488', // Vibrant Teal
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"
        stroke={primaryColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="7" cy="7" r="2" fill={accentColor} />
    </Svg>
  )
}

/**
 * 10. Định vị Tag (Geiger Radar) - Cyan Accent
 */
export const SvgLocateGeigerIcon: React.FC<IconProps> = ({
  size = 24,
  primaryColor = DEFAULT_PRIMARY,
  accentColor = '#0284C7', // Vibrant Cyan/Sky Blue
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={primaryColor} strokeWidth="2" />
      <Circle cx="12" cy="12" r="5" stroke={primaryColor} strokeWidth="1.5" />
      <Circle cx="12" cy="12" r="2" fill={accentColor} />
      <Path d="M12 3V12L18 18" stroke={accentColor} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  )
}

/**
 * 11. Cấu hình C5 (Config Reader) - Slate Accent
 */
export const SvgConfigReaderIcon: React.FC<IconProps> = ({
  size = 24,
  primaryColor = DEFAULT_PRIMARY,
  accentColor = '#475569', // Vibrant Slate Accent
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3"
        stroke={primaryColor}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Circle cx="4" cy="12" r="2.5" fill={accentColor} />
      <Circle cx="12" cy="10" r="2.5" fill={accentColor} />
      <Circle cx="20" cy="14" r="2.5" fill={accentColor} />
    </Svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CENTRALIZED UI ACTION ICONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Centralized SVG UI Action Icon: CheckCircle / Pass Indicator
 */
export const SvgCheckCircleIcon: React.FC<IconProps> = ({
  size = 16,
  color = colors.surface[50],
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 11.08V12a10 10 0 11-5.93-9.14"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M22 4L12 14.01l-3-3"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/**
 * Centralized SVG UI Action Icon: Chevron Left / Back Icon
 */
export const SvgChevronLeftIcon: React.FC<IconProps> = ({
  size = 20,
  color = colors.neutral[900],
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/**
 * Centralized SVG UI Action Icon: Chevron Right
 */
export const SvgChevronRightIcon: React.FC<IconProps> = ({
  size = 16,
  color = colors.secondary,
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18l6-6-6-6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/**
 * Centralized SVG UI Action Icon: Reset / Rotate Refresh
 */
export const SvgResetIcon: React.FC<IconProps> = ({ size = 20, color = colors.neutral[900] }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3 3v5h5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/**
 * Centralized SVG UI Action Icon: Close X
 */
export const SvgCloseIcon: React.FC<IconProps> = ({ size = 20, color = colors.secondary }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 6L6 18M6 6l12 12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/**
 * Centralized SVG UI Action Icon: Alert Triangle / Warning
 */
export const SvgAlertTriangleIcon: React.FC<IconProps> = ({
  size = 16,
  color = colors.warning.default,
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/**
 * Centralized SVG UI Action Icon: X Circle / Missing
 */
export const SvgXCircleIcon: React.FC<IconProps> = ({
  size = 16,
  color = colors.error.default,
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
      <Path
        d="M15 9l-6 6M9 9l6 6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/**
 * Centralized SVG UI Action Icon: Tag / Code Badge
 */
export const SvgTagIcon: React.FC<IconProps> = ({ size = 12, color = colors.neutral[500] }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="7" cy="7" r="1.5" fill={color} />
    </Svg>
  )
}

/**
 * Centralized SVG Icon: Phiếu lĩnh vật tư y tế (Requisition Slip Document)
 */
export const SvgRequisitionSlipIcon: React.FC<IconProps> = ({ size = 18, color = '#2563EB' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="3" width="16" height="18" rx="2.5" stroke={color} strokeWidth="2" />
      <Path d="M8 7h8" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M8 11h8" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M8 15h5" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  )
}

/**
 * Icon: Mũi tên phải (Arrow Right)
 */
export const SvgArrowRightIcon: React.FC<IconProps> = ({
  size = 18,
  color = colors.primary.default,
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12h14M12 5l7 7-7 7"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/**
 * Icon: Tia sét trợ giúp nhanh (Zap / Quick Action)
 */
export const SvgZapIcon: React.FC<IconProps> = ({ size = 16, color = '#64748B' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/**
 * Icon: Tải lại / Sync (Refresh)
 */
export const SvgRefreshIcon: React.FC<IconProps> = ({ size = 16, color = '#334155' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/**
 * Icon: Đang hoạt động (Activity Pulse)
 */
export const SvgActivityIcon: React.FC<IconProps> = ({ size = 16, color = '#059669' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 12h-4l-3 9L9 3l-3 9H2"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/**
 * Icon: Hộp tài sản / Kho (Box Package)
 */
export const SvgBoxIcon: React.FC<IconProps> = ({ size = 16, color = '#2563EB' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 8L12 3L3 8V16L12 21L21 16V8Z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 3V12.5M3 8L12 13L21 8"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/**
 * Icon: Thời gian / Cho mượn (Clock)
 */
export const SvgClockIcon: React.FC<IconProps> = ({ size = 16, color = '#7C3AED' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="2" />
      <Path
        d="M12 7v5l3 2"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/**
 * Icon: Phễu Lọc (Filter)
 */
export const SvgFilterIcon: React.FC<IconProps> = ({ size = 20, color = '#475569' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/**
 * Icon: Lịch (Calendar)
 */
export const SvgCalendarIcon: React.FC<IconProps> = ({ size = 16, color = '#64748B' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="3" y="4" width="18" height="18" rx="2" stroke={color} strokeWidth="2" />
      <Path d="M16 2v4M8 2v4M3 10h18" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  )
}

/**
 * Icon: Người dùng (User)
 */
export const SvgUserIcon: React.FC<IconProps> = ({ size = 16, color = '#64748B' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth="2" />
    </Svg>
  )
}

/**
 * Icon: Tìm kiếm (Search)
 */
export const SvgSearchIcon: React.FC<IconProps> = ({ size = 20, color = '#64748B' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="8" stroke={color} strokeWidth="2" />
      <Path d="M21 21l-4.35-4.35" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  )
}

/**
 * Icon: Vi xử lý / Phần cứng (CPU Chip)
 */
export const SvgCpuIcon: React.FC<IconProps> = ({ size = 20, color = '#334155' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="2.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect
        x="8.5"
        y="8.5"
        width="7"
        height="7"
        rx="1"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 1V4M15 1V4M9 20V23M15 20V23M20 9H23M20 15H23M1 9H4M1 15H4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/**
 * Icon: Chuông thông báo (Bell)
 */
export const SvgBellIcon: React.FC<IconProps> = ({ size = 20, color = '#334155' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M13.73 21a2 2 0 0 1-3.46 0"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/**
 * Icon: Tòa nhà Bệnh viện (Hospital / Building)
 */
export const SvgHospitalBuildingIcon: React.FC<IconProps> = ({
  size = 18,
  color = colors.primary.default,
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 21h18M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M10 9h4M12 7v4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

/**
 * Icon: Pin / Battery Status
 */
export const SvgBatteryIcon: React.FC<IconProps> = ({
  size = 20,
  color = colors.primary.default,
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="2"
        y="6"
        width="17"
        height="12"
        rx="2.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M21 10v4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Rect x="5" y="9" width="7" height="6" rx="1" fill={color} />
    </Svg>
  )
}
SvgBatteryIcon.displayName = 'SvgBatteryIcon'
