import { Stack } from 'expo-router'
import React from 'react'

export default function KioskLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="idle" />
      <Stack.Screen name="measure" />
      <Stack.Screen name="height-demo" />
      <Stack.Screen name="settings" />
    </Stack>
  )
}
