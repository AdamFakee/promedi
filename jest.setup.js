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

jest.mock('react-native-tcp-socket', () => ({
  createConnection: jest.fn().mockReturnValue({
    on: jest.fn(),
    write: jest.fn(),
    destroy: jest.fn(),
    removeListener: jest.fn(),
  }),
}))

jest.mock('expo-modules-core', () => {
  const actual = jest.requireActual('expo-modules-core')
  return {
    ...actual,
    requireNativeModule: jest.fn().mockImplementation((name) => {
      if (name === 'UsbSerialBridge') {
        return {
          open: jest.fn().mockResolvedValue(undefined),
          close: jest.fn().mockResolvedValue(undefined),
          write: jest.fn().mockResolvedValue(undefined),
          listDevices: jest.fn().mockResolvedValue([]),
          requestPermission: jest.fn().mockResolvedValue(true),
          listDevNodes: jest.fn().mockResolvedValue([]),
        }
      }
      try {
        return actual.requireNativeModule(name)
      } catch {
        return {}
      }
    }),
  }
})
