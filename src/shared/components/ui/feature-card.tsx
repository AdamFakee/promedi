import React from 'react'
import { View, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'

export interface FeatureCardProps {
  title: string
  subtitle: string
  route: string
  icon?: React.ReactNode
  badge?: string
  badgeColor?: string
}

export function FeatureCard({
  title,
  subtitle,
  route,
  icon,
  badge,
  badgeColor = 'bg-blue-500/20 text-blue-400',
}: FeatureCardProps) {
  const router = useRouter()

  return (
    <TouchableOpacity
      onPress={() => router.push(route as any)}
      className="mb-3 w-[48%] rounded-2xl border border-gray-800 bg-gray-900/80 p-4 active:bg-gray-800"
    >
      <View className="mb-2 flex-row items-center justify-between">
        <View className="rounded-xl bg-gray-800/80 p-2">{icon}</View>
        {badge && (
          <View className={`rounded-full px-2 py-0.5 ${badgeColor}`}>
            <Text className="font-bold text-[10px] tracking-wider">{badge}</Text>
          </View>
        )}
      </View>
      <Text className="mb-1 font-bold text-sm text-white" numberOfLines={1}>
        {title}
      </Text>
      <Text className="text-xs text-gray-400" numberOfLines={2}>
        {subtitle}
      </Text>
    </TouchableOpacity>
  )
}
