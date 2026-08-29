import React, { useEffect, useState } from "react";
import RootNavigator from "./navigation/RootNavigator";
import { SafeAreaProvider } from "react-native-safe-area-context";
import SplashScreen from "../screens/SplashScreen";
import { useAuthStore } from "../store/authStore";

export default function App() {
  const [isSplashTimerDone, setIsSplashTimerDone] = useState(false);
  const [isTimeoutReached, setIsTimeoutReached] = useState(false);
  const { loading: isAuthLoading, init } = useAuthStore();

  useEffect(() => {
    init();

    // Fallback safety timeout: ensure the app never stays stuck on splash indefinitely
    const safetyTimer = setTimeout(() => {
      setIsTimeoutReached(true);
    }, 5000);

    return () => clearTimeout(safetyTimer);
  }, []);

  const handleSplashFinish = () => {
    setIsSplashTimerDone(true);
  };

  // Keep splash screen until minimum splash animation is done AND auth store is ready
  const isAppReady = (isSplashTimerDone && !isAuthLoading) || isTimeoutReached;

  if (!isAppReady) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  return (
    <SafeAreaProvider>
      <RootNavigator />
    </SafeAreaProvider>
  );
}
