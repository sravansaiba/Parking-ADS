import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator,
  StatusBar,
  Platform,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { usePricingStore, VehicleType } from '../pricingStore';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PricingStackParamList } from '../../../app/navigation/PricingStack';
import { TENANT_ID } from '../../../utils/config';
import Auto from '../../../assets/auto.svg';
const { width } = Dimensions.get('window');

type ViewRulesScreenNavigationProp = StackNavigationProp<PricingStackParamList, 'ViewRules'>;
type ViewRulesScreenRouteProp = RouteProp<PricingStackParamList, 'ViewRules'>;

const VEHICLE_THEMES: Record<VehicleType, { icon: any; color: string; bg: string }> = {
  EV: { icon: 'flash', color: '#059669', bg: '#ECFDF5' },
  Bike: { icon: 'bicycle', color: '#2563EB', bg: '#EFF6FF' },
  Car: { icon: 'car-sport', color: '#7C3AED', bg: '#F5F3FF' },
  Auto: { icon: 'bus', color: '#F97316', bg: '#FFF7ED' },
};

const ViewRules: React.FC = () => {
  const navigation = useNavigation<ViewRulesScreenNavigationProp>();
  const route = useRoute<ViewRulesScreenRouteProp>();
  const { ruleId } = route.params || {};

  const { rules, selectedRule, fetchRule, fetchRules, toggleRuleStatus, deleteRule, loading } = usePricingStore();
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());

  useEffect(() => {
    ruleId ? fetchRule(ruleId) : fetchRules(TENANT_ID);
    if (ruleId) setExpandedRules(new Set([ruleId]));
  }, [ruleId]);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedRules);
    newExpanded.has(id) ? newExpanded.delete(id) : newExpanded.add(id);
    setExpandedRules(newExpanded);
  };

  const formatMinutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 > 0 ? ` ${m % 60}m` : ''}` : `${m}m`);

  const displayRules = ruleId && selectedRule ? [selectedRule] : rules;

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);

    if (ruleId) {
      await fetchRule(ruleId);
    } else {
      await fetchRules(TENANT_ID);
    }

    setRefreshing(false);
  };



  if (loading && displayRules.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={{ height: 30}} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.navButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Pricing Hub</Text>
          <Text style={styles.headerSubtitle}>{displayRules.length} Strategies Active</Text>
        </View>

        <TouchableOpacity style={styles.primaryAddBtn} onPress={() => navigation.navigate('SelectVehicle')}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollBody}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#111112']}
            tintColor="#0b0b0b"
          />
        }
        >
        {displayRules.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="color-wand-outline" size={60} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Empty Warehouse</Text>
            <Text style={styles.emptySubtitle}>No pricing rules found.</Text>
          </View>
        ) : (
          displayRules.map((rule) => {
            const theme = VEHICLE_THEMES[rule.name as VehicleType] || VEHICLE_THEMES.Car;
            const isExpanded = expandedRules.has(rule.id);

            return (
              <View key={rule.id} style={[styles.card, isExpanded && styles.cardActive]}>
                <TouchableOpacity style={styles.cardHeader} onPress={() => toggleExpand(rule.id)} activeOpacity={0.7}>
                  <View style={[styles.iconPlate, { backgroundColor: theme.bg }]}>
                    {rule.name === 'Auto' ? (
                      <Auto width={26} height={26} fill="#F97316" />
                    ) : (
                      <Ionicons name={theme.icon} size={26} color={theme.color} />
                    )}
                  </View>
                  
                  <View style={styles.cardMainInfo}>
                    <Text style={styles.vehicleTitle}>{rule.name}</Text>
                    <View style={styles.tagRow}>
                       <View style={[styles.miniTag, { backgroundColor: rule.is_active ? '#D1FAE5' : '#F1F5F9' }]}>
                          <Text style={[styles.miniTagText, { color: rule.is_active ? '#065F46' : '#64748B' }]}>
                            {rule.is_active ? 'LIVE' : 'PAUSED'}
                          </Text>
                       </View>
                       <Text style={styles.tierCount}>{rule.items.length} Tiers</Text>
                    </View>
                  </View>

                  <Ionicons name={isExpanded ? "chevron-up" : "chevron-forward"} size={20} color="#94A3B8" />
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.cardBody}>
                    <View style={styles.divider} />
                    {rule.items.sort((a,b) => a.min_minutes - b.min_minutes).map((item, idx) => (
                      <View key={item.id} style={styles.tierJourney}>
                        <View style={styles.journeyIndicator}>
                           <View style={[styles.dot, { backgroundColor: theme.color }]} />
                           {idx !== rule.items.length - 1 && <View style={styles.verticalLine} />}
                        </View>
                        <View style={styles.journeyContent}>
                           <Text style={styles.journeyTime}>
                             {formatMinutes(item.min_minutes)} — {item.max_minutes ? formatMinutes(item.max_minutes) : '∞'}
                           </Text>
                           <Text style={[styles.journeyPrice, { color: theme.color }]}>₹{Number(item.price).toFixed(0)}</Text>
                        </View>
                      </View>
                    ))}

                    <View style={styles.footerActions}>
                      <View style={styles.toggleBox}>
                        <Text style={styles.toggleLabel}>Status</Text>
                        <Switch
                          value={rule.is_active}
                          onValueChange={(newValue) => toggleRuleStatus(rule.id, newValue)}
                          trackColor={{ false: '#E2E8F0', true: theme.color }}
                          thumbColor="#fff"
                        />
                      </View>
                      <View style={styles.actionButtons}>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('CreateRule', { ruleId: rule.id, vehicleType: rule.name as VehicleType })}>
                          <Ionicons name="create-outline" size={20} color="#6366F1" />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.iconBtn, {backgroundColor: '#FEF2F2'}]} onPress={() => deleteRule(rule.id)}>
                          <Ionicons name="trash-outline" size={20} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            );
          })
        )}

        <View style={styles.marketSection}>
            <Text style={styles.sectionHeading}>Market Intelligence</Text>
            <View style={styles.graphCard}>
                <View style={styles.graphHeader}>
                    <View>
                        <Text style={styles.graphTitle}>Revenue Yield Trend</Text>
                        <Text style={styles.graphSubtitle}>Real-time strategy performance</Text>
                    </View>
                    <View style={styles.trendBadge}>
                        <Ionicons name="trending-up" size={12} color="#10B981" />
                        <Text style={styles.trendText}>+12.4%</Text>
                    </View>
                </View>

                <View style={styles.chartArea}>
                    {[40, 70, 45, 90, 65, 80, 100, 55, 75, 85].map((val, i) => (
                        <View key={i} style={styles.barWrapper}>
                            <View style={[styles.bar, { height: val, backgroundColor: i === 6 ? '#6366F1' : '#E2E8F0' }]} />
                            <Text style={styles.barLabel}>{i + 1}d</Text>
                        </View>
                    ))}
                </View>
                
                <View style={styles.insightFooter}>
                    <Ionicons name="bulb-outline" size={16} color="#6366F1" />
                    <Text style={styles.insightFooterText}>
                        Peak performance detected in <Text style={{fontWeight: '700'}}>Car</Text> segments between 10 AM - 2 PM.
                    </Text>
                </View>
            </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  navButton: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  headerTitleBox: { alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A' },
  headerSubtitle: { fontSize: 11, color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase', marginTop: 2 },
  primaryAddBtn: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center' },
  
  scrollBody: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  cardActive: { borderColor: '#6366F1' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 18 },
  iconPlate: { width: 54, height: 54, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  cardMainInfo: { flex: 1, marginLeft: 16 },
  vehicleTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  tagRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  miniTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginRight: 8 },
  miniTagText: { fontSize: 10, fontWeight: '900' },
  tierCount: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  cardBody: { paddingHorizontal: 20, paddingBottom: 20 },
  divider: { height: 1, backgroundColor: '#F8FAFC', marginBottom: 20 },
  tierJourney: { flexDirection: 'row', minHeight: 45 },
  journeyIndicator: { alignItems: 'center', width: 20, marginRight: 15 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  verticalLine: { width: 1.5, flex: 1, backgroundColor: '#F1F5F9', marginVertical: 4 },
  journeyContent: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  journeyTime: { fontSize: 14, fontWeight: '700', color: '#475569' },
  journeyPrice: { fontSize: 16, fontWeight: '900' },
  footerActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F8FAFC' },
  toggleBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleLabel: { fontSize: 13, fontWeight: '800', color: '#64748B' },
  actionButtons: { flexDirection: 'row', gap: 10 },
  iconBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },

  /* MARKET INTELLIGENCE STYLES */
  marketSection: { marginTop: 20 },
  sectionHeading: { fontSize: 18, fontWeight: '900', color: '#0F172A', marginBottom: 15 },
  graphCard: {
    backgroundColor: '#FFF',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 3,
    shadowOpacity: 0.04,
  },
  graphHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25 },
  graphTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  graphSubtitle: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  trendBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  trendText: { fontSize: 12, fontWeight: '900', color: '#059669' },
  chartArea: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 100, marginBottom: 20 },
  barWrapper: { alignItems: 'center', gap: 8 },
  bar: { width: 18, borderRadius: 4 },
  barLabel: { fontSize: 9, fontWeight: '700', color: '#CBD5E1', textTransform: 'uppercase' },
  insightFooter: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F5F3FF', padding: 12, borderRadius: 12 },
  insightFooterText: { flex: 1, fontSize: 12, color: '#6366F1', lineHeight: 16 },

  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#334155', marginTop: 15 },
  emptySubtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginTop: 5 },
});

export default ViewRules;