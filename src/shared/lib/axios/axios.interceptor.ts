import { API_CONSTANT } from '@/shared/constants'
import {
  AxiosError,
  AxiosHeaders,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'
import { formatAxiosError } from './axios.error'

interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

type AuthInterceptorContext = {
  getAccessToken?: () => string | undefined
  onTokenExpired?: () => void
}

let authContext: AuthInterceptorContext = {}

export const configureAuthInterceptors = (context: AuthInterceptorContext) => {
  authContext = context
}

const onRequest = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  const accessToken = authContext.getAccessToken?.()
  config.headers = new AxiosHeaders({
    ...config.headers,
    Authorization: accessToken ? `Bearer ${accessToken}` : '',
    'Content-Type': 'application/json',
  })

  return config
}

const onRequestError = (error: AxiosError): Promise<AxiosError> => {
  return Promise.reject(error)
}

const onResponse = (response: AxiosResponse): AxiosResponse => {
  return response
}

const onResponseError = async (error: AxiosError): Promise<never> => {
  const originalRequest = error.config as CustomAxiosRequestConfig | undefined
  const status = error.response?.status

  if (
    status === API_CONSTANT.HTTP_STATUS_CODE.UNAUTHORIZED &&
    originalRequest &&
    !originalRequest._retry &&
    !originalRequest.url?.includes('/auth/refresh')
  ) {
    originalRequest._retry = true
    authContext.onTokenExpired?.()
  }

  return Promise.reject(formatAxiosError(error))
}

export function setupInterceptorsTo(axiosInstance: AxiosInstance): AxiosInstance {
  axiosInstance.interceptors.request.use(onRequest, onRequestError)
  axiosInstance.interceptors.response.use(onResponse, onResponseError)
  return axiosInstance
}
