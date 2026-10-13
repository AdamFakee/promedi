/**
 * Cấu hình môi trường cho ứng dụng (dạng pure TypeScript).
 * UAT và DEV là một. Bạn chỉ cần đổi ACTIVE_ENV giữa 'uat' hoặc 'prod'.
 */

export type AppEnvironment = 'uat' | 'prod'

export interface EnvConfig {
  /** Môi trường hiện tại ('uat' | 'prod') */
  readonly env: AppEnvironment
  /** Cờ kiểm tra môi trường UAT / DEV */
  readonly isUat: boolean
  /** Cờ kiểm tra môi trường UAT / DEV (alias) */
  readonly isDev: boolean
  /** Cờ kiểm tra môi trường PROD */
  readonly isProd: boolean
  /** API Gateway Base URL */
  readonly apiBaseUrl: string
  /** Thời gian timeout của request (ms) */
  readonly apiTimeout: number
  /** Bật/tắt console log / debug logger */
  readonly enableLogger: boolean
}

/**
 * -------------------------------------------------------------
 * ⚙️ SWITCH MÔI TRƯỜNG TẠI ĐÂY
 * Chọn: 'uat' (DEV/UAT) | 'prod' (PRODUCTION)
 * -------------------------------------------------------------
 */
export const ACTIVE_ENV: AppEnvironment = 'uat'

const ENV_MAP: Record<AppEnvironment, EnvConfig> = {
  uat: {
    env: 'uat',
    isUat: true,
    isDev: true,
    isProd: false,
    apiBaseUrl: 'https://api-wms-dev.aidx.vn',
    apiTimeout: 30_000,
    enableLogger: true,
  },
  prod: {
    env: 'prod',
    isUat: false,
    isDev: false,
    isProd: true,
    apiBaseUrl: 'https://api-wms.aidx.vn',
    apiTimeout: 30_000,
    enableLogger: false,
  },
}

export const ENV: EnvConfig = ENV_MAP[ACTIVE_ENV]
