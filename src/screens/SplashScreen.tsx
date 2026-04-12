import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Image } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const videoRef = useRef<Video>(null);

  useEffect(() => {
    // Animate logo entrance
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Set timeout to navigate to login after splash duration
    const timer = setTimeout(() => {
      onFinish();
    }, 3000); // 3 seconds

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      {/* Option 1: Background Video (uncomment to use) */}
      {/* <Video
        ref={videoRef}
        source={require('../assets/splash-video.mp4')} // Add your video file
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping={false}
        isMuted
        onPlaybackStatusUpdate={(status) => {
          if (status.isLoaded && status.didJustFinish) {
            onFinish();
          }
        }}
      /> */}

      {/* Option 2: Gradient Background (currently active) */}
      <LinearGradient
        colors={['#2d1810', '#1a0f0a']}
        style={styles.gradient}
      >
        {/* Animated Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={styles.logoBackground}>
            <Image 
              source={require('../assets/icon.png')} 
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        {/* Animated App Name */}
        <Animated.Text
          style={[
            styles.appName,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          RAVITEJA PARKING STAND
        </Animated.Text>

        {/* Animated Tagline */}
        <Animated.Text
          style={[
            styles.tagline,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          Smart Parking Solution
        </Animated.Text>

        {/* Loading Indicator */}
        <Animated.View
          style={[
            styles.loadingContainer,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={styles.loadingBar}>
            <LinearGradient
              colors={['#f97316', '#ea580c']}
              style={styles.loadingBarFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
        </Animated.View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: height,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 32,
  },
  logoBackground: {
    width: 160,
    height: 160,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  logoImage: {
    width: 130,
    height: 130,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
    letterSpacing: 0.8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  tagline: {
    fontSize: 16,
    color: '#d4a574',
    fontWeight: '500',
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 80,
    width: width * 0.5,
  },
  loadingBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingBarFill: {
    width: '70%',
    height: '100%',
  },
});