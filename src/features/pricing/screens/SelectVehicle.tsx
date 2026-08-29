import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  Dimensions,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PricingStackParamList } from '../../../app/navigation/PricingStack';
import { VehicleType, usePricingStore } from '../pricingStore';
import ScreenWrapper from '../../../components/ScreenWrapper/ScreenWrapper';
import { TENANT_ID } from '../../../utils/config';
import Auto from '../../../assets/auto.svg';

type NavProp = StackNavigationProp<PricingStackParamList, 'SelectVehicle'>;

const { width } = Dimensions.get('window');

const VEHICLES: { type: VehicleType; icon: any; color: string; desc: string }[] = [
  { type: 'EV', icon: 'flash', color: '#10B981', desc: 'Electric vehicles & green mobility' },
  { type: 'Bike', icon: 'bicycle', color: '#3B82F6', desc: 'Two-wheelers & standard motorbikes' },
  { type: 'Car', icon: 'car-sport', color: '#8B5CF6', desc: 'Standard sedans, SUVs & heavy vehicles' },
  { type: 'Auto', icon: 'bus', color: '#0EA5E9', desc: 'Auto rickshaws & three-wheelers' },
];

const SelectVehicle: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { getRuleByVehicleType } = usePricingStore();

  const handleSelect = (type: VehicleType) => {
    const existingRule = getRuleByVehicleType(type);
    navigation.navigate('CreateRule', {
      vehicleType: type,
      extend: !!existingRule,
    });
  };

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    StatusBar.setBarStyle('dark-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('#FFFFFF');
    }
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await usePricingStore.getState().fetchRules(
      TENANT_ID
    );
    setRefreshing(false);
  };



  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerLabel}>Step 1 of 2</Text>
          <Text style={styles.headerTitle}>Select Vehicle</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#0e0d0d']}
            tintColor="#121211"
          />
        }
      >
        <Text style={styles.instructionText}>
          Choose a category to configure or update your pricing strategy.
        </Text>

        {VEHICLES.map(v => {
          const hasRule = !!getRuleByVehicleType(v.type);
          
          return (
            <TouchableOpacity
              key={v.type}
              style={[styles.card, hasRule && styles.cardWithRule]}
              onPress={() => handleSelect(v.type)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconPlate, { backgroundColor: `${v.color}10` }]}>
               {v.type === 'Auto' ? (
                <Auto width={30} height={30} fill={v.color} />
              ) : (
                <Ionicons name={v.icon} size={30} color={v.color} />
              )}
              </View>

              <View style={styles.cardInfo}>
                <View style={styles.titleRow}>
                  <Text style={styles.vehicleTitle}>{v.type}</Text>
                  {hasRule && (
                    <View style={styles.existingBadge}>
                      <Text style={styles.existingBadgeText}>CONFIGURED</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.vehicleDesc}>{v.desc}</Text>
              </View>

              <View style={styles.arrowCircle}>
                <Ionicons 
                  name={hasRule ? "sync-outline" : "chevron-forward"} 
                  size={18} 
                  color={v.color} 
                />
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={styles.hintBox}>
          <Ionicons name="information-circle-outline" size={20} color="#64748B" />
          <Text style={styles.hintText}>
            Configuring a vehicle with an existing rule will allow you to extend or modify current slots.
          </Text>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FF9500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  instructionText: {
    fontSize: 15,
    color: '#64748B',
    lineHeight: 22,
    marginBottom: 25,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  cardWithRule: {
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  iconPlate: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  vehicleTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  existingBadge: {
    backgroundColor: '#111827',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  existingBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFF',
  },
  vehicleDesc: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  arrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  hintBox: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 20,
    marginTop: 10,
    gap: 12,
    alignItems: 'center',
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
  },
});

export default SelectVehicle;