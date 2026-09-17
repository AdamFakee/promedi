// Mock các thư viện native không chạy được trong môi trường Node/Jest
import 'react-native-gesture-handler/jestSetup'

jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    getString: jest.fn(),
    setString: jest.fn(),
    set: jest.fn(),
    getBoolean: jest.fn(),
    delete: jest.fn(),
    clearAll: jest.fn(),
  })),
}))
