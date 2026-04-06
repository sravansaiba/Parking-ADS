import React, { useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  Text,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const carAnim = useRef(new Animated.Value(-200)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning ☀️';
    if (hour < 18) return 'Good Afternoon 🌤️';
    return 'Good Evening 🌙';
  };

  useEffect(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 900,
      useNativeDriver: true,
    }).start();

    Animated.timing(carAnim, {
      toValue: 0,
      duration: 1500,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1800,
        useNativeDriver: true,
      })
    ).start();

    const timer = setTimeout(() => {
      onFinish();
    }, 3200);

    return () => clearTimeout(timer);
  }, []);

  const shimmerX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-150, 300],
  });

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#020617', '#0f172a', '#1e293b']}
        style={styles.gradient}
      >
        <Animated.Text style={[styles.greeting, { opacity: fadeAnim }]}>
          {getGreeting()}
        </Animated.Text>

        <Animated.View
          style={[
            styles.glassCard,
            {
              opacity: fadeAnim,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <Image
            source={require('../assets/icon.png')}
            style={styles.logo}
          />
          <Text style={styles.title}>RAVITEJA PARKING STAND</Text>
          <Text style={styles.subtitle}>Smart Parking Solution</Text>
        </Animated.View>

        <View style={styles.roadContainer}>
          <Animated.Text
            style={[
              styles.car,
              { transform: [{ translateX: carAnim }] },
            ]}
          >
            🚗
          </Animated.Text>
          <View style={styles.gate} />
        </View>

        <View style={styles.loader}>
          <Animated.View
            style={[
              styles.shimmer,
              { transform: [{ translateX: shimmerX }] },
            ]}
          />
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  greeting: {
    position: 'absolute',
    top: 80,
    fontSize: 16,
    color: '#94a3b8',
  },

  glassCard: {
    width: width * 0.8,
    padding: 20,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
  },

  logo: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },

  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },

  subtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },

  roadContainer: {
    position: 'absolute',
    bottom: 140,
    width: width * 0.7,
    height: 40,
    justifyContent: 'center',
  },

  car: {
    fontSize: 28,
  },

  gate: {
    position: 'absolute',
    right: 0,
    width: 6,
    height: 30,
    backgroundColor: '#f97316',
    borderRadius: 3,
  },

  loader: {
    position: 'absolute',
    bottom: 80,
    width: width * 0.5,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    borderRadius: 2,
  },

  shimmer: {
    width: 120,
    height: '100%',
    backgroundColor: '#f97316',
  },
});