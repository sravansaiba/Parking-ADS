import React, { useEffect, useState } from "react";
import RootNavigator from "./navigation/RootNavigator";
import { SafeAreaProvider } from "react-native-safe-area-context";
import SplashScreen from "../screens/SplashScreen";
import { useAuthStore } from "../store/authStore";

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  const init = useAuthStore((state) => state.init);

  useEffect(() => {
    init();
  }, []);

  const handleSplashFinish = () => {
    setIsLoading(false);
  };

  if (isLoading) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  return (
    <SafeAreaProvider>
      <RootNavigator />
    </SafeAreaProvider>
  );
}
