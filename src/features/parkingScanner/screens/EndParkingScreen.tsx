import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, StatusBar } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import EndParkingForm from '../components/EndParkingForm';

const STATUS_BAR_HEIGHT =
  Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;

export default function EndParkingScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  const { session, sessionId, isLostCard } = route.params || {};

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>End Parking</Text>
      </View>

      <EndParkingForm
        session={session}
        sessionId={sessionId}
        isLostCard={isLostCard}
        onSuccess={() => {
          navigation.goBack();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6fb',
    paddingTop: STATUS_BAR_HEIGHT + 8,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginLeft: 12,
  },
});
