// Mock các thư viện native không chạy được trong môi trường Node/Jest
import 'react-native-gesture-handler/jestSetup'

const mockStorageInstance = {
  getString: jest.fn(),
  setString: jest.fn(),
  set: jest.fn(),
  getBoolean: jest.fn(),
  delete: jest.fn(),
  remove: jest.fn(),
  clearAll: jest.fn(),
}

jest.mock('react-native-mmkv', () => ({
  createMMKV: jest.fn().mockReturnValue(mockStorageInstance),
  MMKV: jest.fn().mockImplementation(() => mockStorageInstance),
}))
