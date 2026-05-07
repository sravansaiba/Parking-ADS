import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../../store/authStore';
import AuthStack from './AuthStack';
import MainTabs from './TabNavigator';
import { ActivityIndicator, View, Text, TouchableOpacity } from 'react-native';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, loading, error, init } = useAuthStore();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#020617' }}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#020617', padding: 20 }}>
        <Text style={{ color: '#94a3b8', fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Connection Issue</Text>
        <Text style={{ color: '#64748b', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
          {error}
        </Text>
        <TouchableOpacity 
          onPress={() => init()}
          style={{ 
            backgroundColor: '#f97316', 
            paddingHorizontal: 32, 
            paddingVertical: 14, 
            borderRadius: 12,
            shadowColor: '#f97316',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 5
          }}
        >
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 16 }}>Retry Now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Auth" component={AuthStack} />
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
