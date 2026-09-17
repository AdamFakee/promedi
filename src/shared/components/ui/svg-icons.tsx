import { colors } from '@\/shared\/theme'
import React from 'react'
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg'

interface IconProps {
  size?: number
  primaryColor?: string
  accentColor?: string
  color?: string
  className?: string
}

const DEFAULT_PRIMARY = colors.primary.default
const DEFAULT_ACCENT = colors.yellow.deep

/**
 * Main Institution Brand Logo (BMU - BUON MA THUOT MEDICAL UNIVERSITY)
 * Supports dynamic primary color (red) and accent color (gold), defaulting to theme tokens, plus optional withText layout
 */
export interface SvgBMULogoProps {
  size?: number
  primaryColor?: string
  accentColor?: string
  withText?: boolean
}

export const SvgBMULogo: React.FC<SvgBMULogoProps> = ({
  size = 48,
  primaryColor = colors.primary.default,
  accentColor = colors.background.headerGradient.end || '#FDAC41',
  withText = false,
}) => {
  if (withText) {
    return (
      <Svg width={size * 2.8} height={size} viewBox="0 0 280 100" fill="none">
        <G>
          {/* Logo Emblem Left */}
          <G transform="translate(0, 0)">
            <Path
              d="M 22 28 C 12 45 14 68 30 82 C 48 97 74 95 88 74 C 92 68 94 62 94 62 C 94 62 88 74 72 84 C 54 94 32 90 20 74 C 10 60 12 40 22 28 Z"
              fill={accentColor}
            />
            <Path
              d="M 26 70 C 38 88 64 94 86 82 C 92 78 95 72 95 72 C 95 72 88 82 72 88 C 50 96 28 88 18 74 C 20 73 24 71 26 70 Z"
              fill={primaryColor}
            />
            <G fill={primaryColor}>
              <Path d="M 46 14 C 50 14 60 10 62 10 C 64 25 64 45 66 54 C 74 65 80 72 82 74 C 74 81 66 84 60 84 C 55 75 48 64 48 54 C 48 42 46 26 46 14 Z" />
              <Path d="M 44 48 C 52 56 56 60 56 60 C 48 70 38 80 34 84 C 28 78 24 74 24 74 C 32 64 40 54 44 48 Z" />
              <Path d="M 26 42 L 40 32 L 44 48 L 30 58 Z" />
              <Path d="M 64 34 L 80 24 L 84 40 L 68 50 Z" />
              <Path d="M 66 52 L 82 44 L 86 60 L 70 68 Z" />
            </G>
          </G>

          {/* BMU Typography Right */}
          <G transform="translate(108, 0)">
            <SvgText
              x="0"
              y="40"
              fill={primaryColor}
              fontSize="40"
              fontWeight="900"
              letterSpacing="1"
            >
              BMU
            </SvgText>
            <SvgText
              x="0"
              y="62"
              fill={primaryColor}
              fontSize="14"
              fontWeight="800"
              letterSpacing="1.8"
            >
              BUON MA THUOT
            </SvgText>
            <SvgText
              x="0"
              y="82"
              fill={accentColor}
              fontSize="13"
              fontWeight="800"
              letterSpacing="1.5"
            >
              MEDICAL UNIVERSITY
            </SvgText>
          </G>
        </G>
      </Svg>
    )
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <G>
        <Path
          d="M 22 28 C 12 45 14 68 30 82 C 48 97 74 95 88 74 C 92 68 94 62 94 62 C 94 62 88 74 72 84 C 54 94 32 90 20 74 C 10 60 12 40 22 28 Z"
          fill={accentColor}
        />
        <Path
          d="M 26 70 C 38 88 64 94 86 82 C 92 78 95 72 95 72 C 95 72 88 82 72 88 C 50 96 28 88 18 74 C 20 73 24 71 26 70 Z"
          fill={primaryColor}
        />
        <G fill={primaryColor}>
          <Path d="M 46 14 C 50 14 60 10 62 10 C 64 25 64 45 66 54 C 74 65 80 72 82 74 C 74 81 66 84 60 84 C 55 75 48 64 48 54 C 48 42 46 26 46 14 Z" />
          <Path d="M 44 48 C 52 56 56 60 56 60 C 48 70 38 80 34 84 C 28 78 24 74 24 74 C 32 64 40 54 44 48 Z" />
          <Path d="M 26 42 L 40 32 L 44 48 L 30 58 Z" />
          <Path d="M 64 34 L 80 24 L 84 40 L 68 50 Z" />
          <Path d="M 66 52 L 82 44 L 86 60 L 70 68 Z" />
        </G>
      </G>
    </Svg>
  )
}
SvgBMULogo.displayName = 'SvgBMULogo'

export const SvgMainLogo = SvgBMULogo
export const SvgProMediLogo = SvgBMULogo

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

/**
 * Icon: ProMedi Health Heart & Shield SVG Illustration
 * Matches 3D/Vector illustration with hands holding a red heart, ECG pulse line, and green shield
 */
export interface SvgHealthHeartShieldProps {
  size?: number
  primaryColor?: string
  accentColor?: string
  pulseColor?: string
  skinColor?: string
}

export const SvgHealthHeartShield: React.FC<SvgHealthHeartShieldProps> = ({
  size = 220,
  primaryColor = colors.primary.default,
  accentColor = colors.success.default,
  pulseColor = colors.text.primary.white,
  skinColor = '#FCA5A5',
}) => {
  return (
    <Svg width={size} height={size * 0.88} viewBox="0 0 240 210" fill="none">
      <G>
        {/* 1. VIBRANT RED HEART */}
        <Path
          d="M120 155 C90 135 40 100 40 65 C40 40 60 22 86 22 C102 22 114 31 120 40 C126 31 138 22 154 22 C180 22 200 40 200 65 C200 100 150 135 120 155 Z"
          fill={primaryColor}
        />
        <Path
          d="M120 148 C95 130 48 97 48 65 C48 44 64 30 86 30 C99 30 110 37 115 47 L120 55 L125 47 C130 37 141 30 154 30 C176 30 192 44 192 65 C192 97 145 130 120 148 Z"
          fill="#FFFFFF"
          opacity="0.25"
        />

        {/* 2. WHITE ECG HEARTBEAT PULSE WAVE */}
        <Path
          d="M62 92 H90 L98 68 L114 116 L126 78 L134 94 H178"
          stroke={pulseColor}
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 3. TWO CARING HANDS CRADLING THE HEART */}
        {/* Left Sleeve */}
        <Rect x="70" y="168" width="40" height="26" rx="7" fill={accentColor} />
        <Rect
          x="70"
          y="168"
          width="40"
          height="7"
          rx="3.5"
          fill={colors.success.container || '#ECFDF3'}
        />
        {/* Right Sleeve */}
        <Rect x="130" y="168" width="40" height="26" rx="7" fill={accentColor} />
        <Rect
          x="130"
          y="168"
          width="40"
          height="7"
          rx="3.5"
          fill={colors.success.container || '#ECFDF3'}
        />

        {/* Left Hand Fingers */}
        <Path
          d="M56 102 C52 117 60 142 74 158 L83 170 H108 L100 142 C98 132 104 119 112 109 C114 107 110 101 104 103 C94 107 88 117 84 125 C82 112 88 99 94 92 C96 90 92 85 86 88 C78 93 72 105 70 117 C68 102 74 89 80 83 C82 81 78 77 72 80 C62 87 56 97 56 102 Z"
          fill={skinColor}
        />
        <Path
          d="M66 112 C64 127 72 146 83 162"
          stroke="#F87171"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Right Hand Fingers */}
        <Path
          d="M184 102 C188 117 180 142 166 158 L157 170 H132 L140 142 C142 132 136 119 128 109 C126 107 130 101 136 103 C146 107 152 117 156 125 C158 112 152 99 146 92 C144 90 148 85 154 88 C162 93 168 105 170 117 C172 102 166 89 160 83 C158 81 162 77 168 80 C178 87 184 97 184 102 Z"
          fill={skinColor}
        />
        <Path
          d="M174 112 C176 127 168 146 157 162"
          stroke="#F87171"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* 4. GREEN SHIELD BADGE WITH CHECKMARK AT TOP RIGHT */}
        <G transform="translate(142, 8)">
          <Path
            d="M30 4 C44 4 56 12 56 12 V32 C56 50 30 64 30 64 C30 64 4 50 4 32 V12 C4 12 16 4 30 4 Z"
            fill={accentColor}
            stroke="#047857"
            strokeWidth="3"
          />
          <Path
            d="M30 9 C40 9 50 16 50 16 V31 C50 45 30 57 30 57 C30 57 10 45 10 31 V16 C10 16 20 9 30 9 Z"
            fill="#ECFDF5"
          />
          <Path
            d="M20 31 L26 37 L40 23"
            stroke="#059669"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>
      </G>
    </Svg>
  )
}
SvgHealthHeartShield.displayName = 'SvgHealthHeartShield'

/**
 * Icon: ProMedi Touch Tap / Hand Press SVG Icon
 * Custom design matching ProMedi design system for Kiosk touch CTA
 */
export interface SvgTouchTapIconProps {
  size?: number
  primaryColor?: string
  accentColor?: string
  color?: string
}

export const SvgTouchTapIcon: React.FC<SvgTouchTapIconProps> = ({
  size = 28,
  primaryColor = colors.primary.default,
  accentColor = colors.yellow.deep,
  color = '#FFFFFF',
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <G>
        {/* Target Ripple Rings */}
        <Circle
          cx="50"
          cy="28"
          r="22"
          stroke={accentColor}
          strokeWidth="4"
          opacity="0.5"
          strokeDasharray="4 4"
        />
        <Circle cx="50" cy="28" r="14" stroke={color} strokeWidth="4" opacity="0.8" />
        <Circle cx="50" cy="28" r="5" fill={color} />

        {/* Hand Index Finger Tapping Upwards */}
        <Path
          d="M 44 38 L 44 24 C 44 20 56 20 56 24 L 56 48 C 56 44 64 44 64 48 L 64 52 C 64 48 72 48 72 52 L 72 60 C 72 56 80 56 80 60 L 80 72 C 80 86 68 94 52 94 C 36 94 28 82 28 70 L 28 58 C 28 52 38 46 44 38 Z"
          fill={primaryColor}
          stroke={color}
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </G>
    </Svg>
  )
}
SvgTouchTapIcon.displayName = 'SvgTouchTapIcon'

/**
 * Icon: ProMedi Numpad Backspace / Delete SVG Icon
 * Supports dynamic color (defaulting to colors.error.default)
 */
export interface SvgDeleteIconProps {
  size?: number
  color?: string
  primaryColor?: string
}

export const SvgDeleteIcon: React.FC<SvgDeleteIconProps> = ({
  size = 28,
  color,
  primaryColor = colors.error.default,
}) => {
  const strokeColor = color || primaryColor
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 4H8L1 12L8 20H21C21.5523 20 22 19.5523 22 19V5C22 4.44772 21.5523 4 21 4Z"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M18 9L12 15M12 9L18 15"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}
SvgDeleteIcon.displayName = 'SvgDeleteIcon'
