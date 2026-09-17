import { Link, Stack } from 'expo-router'
import { Text, View } from 'react-native'

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Không tìm thấy trang' }} />
      <View className="flex-1 items-center justify-center bg-slate-50 p-5">
        <Text className="mb-2 font-bold text-lg text-slate-900">Trang không tồn tại!</Text>
        <Link href="/" className="mt-4 rounded-xl bg-primary px-4 py-2">
          <Text className="font-bold text-sm text-white">Quay về trang chủ</Text>
        </Link>
      </View>
    </>
  )
}
