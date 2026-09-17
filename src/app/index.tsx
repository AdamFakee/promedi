import { LoadingIndicator } from '@/shared/components/ui'
import { View } from 'react-native'

/**
 * Entry point của App - render Loading spinner trong khi useAppGate
 * đang kiểm tra state và thực hiện điều hướng phù hợp
 */
export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <LoadingIndicator size="large" />
    </View>
  )
}
