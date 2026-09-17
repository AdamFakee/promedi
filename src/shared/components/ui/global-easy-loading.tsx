import React, { useEffect, useRef } from 'react'
import { ActivityIndicator, Animated, Easing, StyleSheet, Text } from 'react-native'
import { Portal } from '@gorhom/portal'
import { useAlertStore } from '@/shared/store'

export const GlobalEasyLoading = () => {
  const isLoading = useAlertStore((s) => s.isLoading)
  const message = useAlertStore((s) => s.loadingMessage)

  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.92)).current

  useEffect(() => {
    if (isLoading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
          easing: Easing.out(Easing.quad),
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      fadeAnim.setValue(0)
      scaleAnim.setValue(0.92)
    }
  }, [isLoading, fadeAnim, scaleAnim])

  return (
    <Portal>
      {isLoading ? (
        <Animated.View
          pointerEvents={isLoading ? 'auto' : 'none'}
          style={[
            styles.overlay,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.card,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <ActivityIndicator size="large" color="#FFFFFF" />

            {message ? (
              <Text style={styles.text} numberOfLines={2}>
                {message}
              </Text>
            ) : null}
          </Animated.View>
        </Animated.View>
      ) : null}
    </Portal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    zIndex: 99999,
  },
  card: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    maxWidth: 240,
    minWidth: 140,
  },
  text: {
    fontFamily: 'Manrope-Bold',
    fontSize: 13,
    lineHeight: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.2,
    marginTop: 10,
  },
})
