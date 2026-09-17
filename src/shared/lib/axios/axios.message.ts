export const API_ERROR_MESSAGE = {
  NETWORK: 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng.',
  DEFAULT: 'Đã có lỗi xảy ra. Vui lòng thử lại.',
  STATUS: {
    400: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
    401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    403: 'Bạn không có quyền thực hiện thao tác này.',
    404: 'Không tìm thấy dữ liệu.',
    422: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
    500: 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.',
  },
} as const
