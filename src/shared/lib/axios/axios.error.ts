import { AxiosError } from 'axios'
import { API_ERROR_MESSAGE } from './axios.message'

export type ApiError = {
  status?: number
  message: string
  data?: unknown
}

type ErrorResponseData = {
  message?: string
  error?: string
}

const getBackendMessage = (data: unknown): string | undefined => {
  if (!data || typeof data !== 'object') return undefined

  const responseData = data as ErrorResponseData
  return responseData.message || responseData.error
}

const getStatusMessage = (status?: number): string | undefined => {
  if (!status) return undefined

  if (status >= 500) return API_ERROR_MESSAGE.STATUS[500]

  return API_ERROR_MESSAGE.STATUS[status as keyof typeof API_ERROR_MESSAGE.STATUS]
}

export const formatAxiosError = (error: AxiosError): ApiError => {
  const status = error.response?.status
  const data = error.response?.data

  if (!error.response) {
    return {
      message: API_ERROR_MESSAGE.NETWORK,
    }
  }

  return {
    status,
    message: getBackendMessage(data) || getStatusMessage(status) || API_ERROR_MESSAGE.DEFAULT,
    data,
  }
}
