import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  ActivityIndicator,
  StatusBar,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePricingStore, VehicleType } from '../pricingStore';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PricingStackParamList } from '../../../app/navigation/PricingStack';
import ScreenWrapper from '../../../components/ScreenWrapper/ScreenWrapper';
import { TENANT_ID } from '../../../utils/config';
import Auto from '../../../assets/auto.svg';

type PricingScreenNavigationProp = StackNavigationProp<PricingStackParamList, 'PricingMain'>;

const { width } = Dimensions.get('window');

type VehicleTypeInfo = {
  type: VehicleType;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
};

const VEHICLE_TYPES: VehicleTypeInfo[] = [
  { type: 'EV', icon: 'flash', color: '#FF9500', bgColor: '#FFF7ED' },
  { type: 'Bike', icon: 'bicycle', color: '#F97316', bgColor: '#FFF7ED' },
  { type: 'Car', icon: 'car-sport', color: '#FB923C', bgColor: '#FFF7ED' },
 { type: 'Auto', icon: 'bus', color: '#FB923C', bgColor: '#FFF7ED' }
];

const Pricing: React.FC = () => {
  const navigation = useNavigation<PricingScreenNavigationProp>();
  const { 
    rules, 
    fetchRules, 
    loading,
    getRuleByVehicleType 
  } = usePricingStore();
  
  const tenantId = TENANT_ID;
  
  useEffect(() => {
    fetchRules(tenantId);
  }, [tenantId]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRules(tenantId);
    setRefreshing(false);
  };


  const totalRules = rules.length;
  const activeRulesCount = rules.filter(r => r.is_active).length;

  const handlePressVehicle = (vehicleType: VehicleType) => {
    const rule = getRuleByVehicleType(vehicleType);
    if (rule) {
      navigation.navigate('ViewRules', { ruleId: rule.id });
    } else {
      navigation.navigate('CreateRule', { vehicleType });
    }
  };

  // if (loading) {
  //   return (
  //     <View style={styles.loadingContainer}>
  //       <Ionicons name="hourglass-outline" size={40} color="#FF9500" />
  //       <Text style={styles.loadingText}>Loading Pricing Engine...</Text>
  //     </View>
  //   );
  // }

  return (
  <ScreenWrapper>
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
       refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#0c0c0c']}
          tintColor="#0f0f0f"
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerLabel}>Management</Text>
          <Text style={styles.headerTitle}>Pricing Rules</Text>
        </View>

        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('ViewRules')}
        >
          <Ionicons name="options-outline" size={22} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* Analytics */}
      <View style={styles.analyticsContainer}>
        <View style={[styles.mainMetric, { backgroundColor: '#111827' }]}>
          <Text style={[styles.metricLabel, { color: '#9CA3AF' }]}>
            Active Rules
          </Text>
          <View style={styles.metricRowMain}>
            <Text style={[styles.metricValue, { color: '#FFF' }]}>
              {activeRulesCount}
            </Text>
            <Text style={[styles.metricTotal, { color: '#6B7280' }]}>
              / {totalRules}
            </Text>
          </View>
        </View>

        <View style={styles.sideMetrics}>
          <View style={styles.miniCard}>
            <Text style={styles.miniLabel}>Drafts</Text>
            <Text style={styles.miniValue}>
              {totalRules - activeRulesCount}
            </Text>
          </View>

          <View style={[styles.miniCard, { backgroundColor: '#ECFDF5' }]}>
            <Text style={[styles.miniLabel, { color: '#059669' }]}>Health</Text>
            <Text style={[styles.miniValue, { color: '#059669' }]}>100%</Text>
          </View>
        </View>
      </View>

      {/* Vehicle Strategies */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Vehicle Strategies</Text>
        <TouchableOpacity onPress={() => navigation.navigate('ViewRules')}>
          <Text style={styles.seeAllText}>Manage All</Text>
        </TouchableOpacity>
      </View>

      {VEHICLE_TYPES.map((vehicle) => {
        const rule = getRuleByVehicleType(vehicle.type);
        if (!rule) return null;

        return (
          <TouchableOpacity
            key={vehicle.type}
            activeOpacity={0.7}
            style={styles.card}
            onPress={() => handlePressVehicle(vehicle.type)}
          >
            <View style={[styles.iconContainer, { backgroundColor: vehicle.bgColor }]}>
              {vehicle.type === 'Auto' ? (
                <Auto width={26} height={26} color="#F97316" />
              ) : (
                <Ionicons name={vehicle.icon} size={24} color={vehicle.color} />
              )}
            </View>

            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{vehicle.type} Plan</Text>
              <View style={styles.cardMeta}>
                <Text style={styles.cardSubtitle}>
                  {rule.items.length} Slots
                </Text>
                <View style={styles.dot} />
                <Text style={styles.cardSubtitle}>
                  {new Date(rule.created_at).toLocaleDateString('en-GB')}
                </Text>
              </View>
            </View>

            <View style={styles.statusBadgeContainer}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: rule.is_active ? '#ECFDF5' : '#FEF2F2' },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: rule.is_active ? '#10B981' : '#EF4444' },
                  ]}
                >
                  {rule.is_active ? 'Active' : 'Draft'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Operations */}
      <Text style={[styles.sectionTitle, { marginHorizontal: 20, marginTop: 25 }]}>
        Operations
      </Text>

      <View style={styles.toolsGrid}>
        <TouchableOpacity style={styles.toolItem}>
          <View style={[styles.toolIcon, { backgroundColor: '#EFF6FF' }]}>
            <Ionicons name="calculator" size={20} color="#3B82F6" />
          </View>
          <Text style={styles.toolLabel}>Simulator</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolItem}
          onPress={() => navigation.navigate('ViewRules')}
        >
          <View style={[styles.toolIcon, { backgroundColor: '#F5F3FF' }]}>
            <Ionicons name="bar-chart" size={20} color="#8B5CF6" />
          </View>
          <Text style={styles.toolLabel}>Analytics</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toolItem}
          onPress={() => navigation.navigate('SelectVehicle')}
        >
          <View style={[styles.toolIcon, { backgroundColor: '#FFF7ED' }]}>
            <Ionicons name="add-circle-outline" size={20} color="#F97316" />
          </View>
          <Text style={styles.toolLabel}>New Plan</Text>
        </TouchableOpacity>
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
  scrollContent: {
    paddingTop: 20, 
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  headerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF9500',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyticsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 25,
  },
  mainMetric: {
    flex: 1.5,
    padding: 20,
    borderRadius: 24,
    justifyContent: 'center',
  },
  metricRowMain: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  metricTotal: {
    fontSize: 16,
    marginLeft: 4,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  sideMetrics: {
    flex: 1,
    gap: 12,
  },
  miniCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    padding: 12,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  miniLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  miniValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  seeAllText: {
    fontSize: 14,
    color: '#FF9500',
    fontWeight: '600',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    marginLeft: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 8,
  },
  statusBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  toolsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 15,
  },
  toolItem: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  toolIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  toolLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
});

export default Pricing;