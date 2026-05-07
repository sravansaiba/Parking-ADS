import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
  StatusBar,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePricingStore, VehicleType } from '../pricingStore';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PricingStackParamList } from '../../../app/navigation/PricingStack';
import ScreenWrapper from '../../../components/ScreenWrapper/ScreenWrapper';
import { TENANT_ID } from '../../../utils/config';

type CreateRuleScreenNavigationProp = StackNavigationProp<PricingStackParamList, 'CreateRule'>;
type CreateRuleScreenRouteProp = RouteProp<PricingStackParamList, 'CreateRule'>;

const { width } = Dimensions.get('window');

interface PriceSlot {
  id: string;
  minMinutes: string;
  maxMinutes: string;
  price: string;
  isUnlimited: boolean;
  isReadOnly?: boolean;
}

const VEHICLE_THEMES: Record<VehicleType, { icon: any; color: string; bg: string }> = {
  EV: { icon: 'flash', color: '#10B981', bg: '#ECFDF5' },
  Bike: { icon: 'bicycle', color: '#3B82F6', bg: '#EFF6FF' },
  Car: { icon: 'car-sport', color: '#8B5CF6', bg: '#F5F3FF' },
  Auto: { icon: 'bus', color: '#0EA5E9', bg: '#E0F2FE' },
};

const CreateRule: React.FC = () => {
  const navigation = useNavigation<CreateRuleScreenNavigationProp>();
  const route = useRoute<CreateRuleScreenRouteProp>();
  const params = route.params ?? {};
  const { vehicleType, ruleId, extend } = params;
  const isEditMode = !!ruleId;

  const { createRule, updateRule, fetchRules, rules, loading } = usePricingStore();
  const tenantId = TENANT_ID;
  const [priceSlots, setPriceSlots] = useState<PriceSlot[]>([]);

  const safeVehicleType = vehicleType as VehicleType;
  const theme = VEHICLE_THEMES[safeVehicleType] || VEHICLE_THEMES.Car;

  useEffect(() => {
  fetchRules(tenantId);

  StatusBar.setBarStyle('dark-content');
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('#FFFFFF');
    }
  }, [tenantId]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRules(tenantId);
    setRefreshing(false);
  };




  useEffect(() => {
    const existingRule = rules.find(r => r.name === vehicleType);
    if (existingRule) {
      const sortedItems = [...existingRule.items].sort((a, b) => a.min_minutes - b.min_minutes);
      const mappedSlots: PriceSlot[] = sortedItems.map((item, index) => ({
        id: item.id || String(index),
        minMinutes: String(item.min_minutes),
        maxMinutes: item.max_minutes ? String(item.max_minutes) : '',
        price: String(item.price),
        isUnlimited: item.max_minutes === null,
        isReadOnly: isEditMode ? false : true 
      }));

      if (extend && !isEditMode) {
        const lastSlot = mappedSlots[mappedSlots.length - 1];
        if (!lastSlot.isUnlimited) {
          const nextMin = parseInt(lastSlot.maxMinutes) + 1;
          setPriceSlots([...mappedSlots, {
            id: Date.now().toString(),
            minMinutes: String(nextMin),
            maxMinutes: '',
            price: '',
            isUnlimited: false,
            isReadOnly: false
          }]);
        } else {
          setPriceSlots(mappedSlots);
        }
      } else {
        setPriceSlots(mappedSlots);
      }
    } else {
      setPriceSlots([{ id: '1', minMinutes: '0', maxMinutes: '', price: '', isUnlimited: false, isReadOnly: false }]);
    }
  }, [rules, vehicleType, extend, isEditMode]);

  const addPriceSlot = () => {
    if (isEditMode) return;
    const lastSlot = priceSlots[priceSlots.length - 1];
    if (lastSlot.isUnlimited) {
      Alert.alert('Action Denied', 'Cannot add slots after an unlimited slot.');
      return;
    }
    const nextMin = lastSlot.maxMinutes ? parseInt(lastSlot.maxMinutes) + 1 : 0;
    setPriceSlots([...priceSlots, {
      id: Date.now().toString(),
      minMinutes: String(nextMin),
      maxMinutes: '',
      price: '',
      isUnlimited: false,
      isReadOnly: false
    }]);
  };

  const removePriceSlot = (id: string) => {
    if (priceSlots.length === 1) return;
    setPriceSlots(priceSlots.filter(slot => slot.id !== id));
  };

  const updateSlot = (id: string, field: keyof PriceSlot, value: any) => {
    setPriceSlots(priceSlots.map(slot => (slot.id === id) ? { ...slot, [field]: value } : slot));
  };

  const handleSave = async () => {
    const isValid = priceSlots.every(s => s.price && (s.isUnlimited || (s.maxMinutes && parseInt(s.maxMinutes) > parseInt(s.minMinutes))));
    if (!isValid) {
      Alert.alert('Validation Error', 'Please check all time ranges and prices.');
      return;
    }

    const items = priceSlots.map(slot => ({
      min_minutes: parseInt(slot.minMinutes),
      max_minutes: slot.isUnlimited ? null : parseInt(slot.maxMinutes),
      price: parseFloat(slot.price),
    }));

    try {
      const existingRule = rules.find(r => r.name === vehicleType);
      if (existingRule) {
        await updateRule(existingRule.id, { items });
      } else {
        await createRule({ tenant_id: tenantId, name: safeVehicleType, items });
      }
      navigation.navigate('ViewRules');
    } catch {
      Alert.alert('Error', 'Failed to synchronize pricing rule.');
    }
  };

  return (
    <ScreenWrapper>
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerTextCenter}>
            <Text style={styles.headerTitle}>{isEditMode ? 'Edit' : 'Manage'} {vehicleType}</Text>
            <View style={styles.headerPill}>
              <View style={[styles.pillDot, { backgroundColor: theme.color }]} />
              <Text style={styles.headerSubtitle}>Revenue Logic</Text>
            </View>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#0e0d0d']}
                tintColor="#121211"
              />
            }
          >      
            <View style={styles.summaryBox}>
               <Text style={styles.summaryLabel}>Active Strategy Preview</Text>
               <View style={styles.timelineContainer}>
                  {priceSlots.map((slot, idx) => (
                    <View key={idx} style={styles.timelineItem}>
                       <View style={[styles.timelineNode, { backgroundColor: slot.price ? theme.color : '#E2E8F0' }]} />
                       {idx !== priceSlots.length - 1 && <View style={styles.timelineLine} />}
                    </View>
                  ))}
               </View>
               <Text style={styles.summaryDesc}>
                 {priceSlots.length} distinct pricing phases configured for {vehicleType}s.
               </Text>
            </View>

            <View style={[styles.modeBanner, { backgroundColor: isEditMode ? '#EEF2FF' : '#FFF7ED' }]}>
               <Ionicons name={isEditMode ? "hammer-outline" : "lock-closed-outline"} size={18} color={isEditMode ? "#4F46E5" : "#EA580C"} />
               <Text style={[styles.modeText, { color: isEditMode ? "#4338CA" : "#9A3412" }]}>
                 {isEditMode ? "Full Edit Enabled" : "Historical tiers are locked to preserve integrity."}
               </Text>
            </View>

            {priceSlots.map((slot, index) => (
              <View key={slot.id} style={[styles.slotCard, slot.isReadOnly && styles.cardReadOnly]}>
                <View style={styles.cardHeader}>
                   <View style={[styles.slotBadge, { backgroundColor: slot.isReadOnly ? '#94A3B8' : theme.color }]}>
                      <Text style={styles.slotBadgeText}>{index + 1}</Text>
                   </View>
                   <Text style={styles.cardTitleText}>Time Phase</Text>
                   {!slot.isReadOnly && (
                     <TouchableOpacity onPress={() => removePriceSlot(slot.id)} style={styles.trashBtn}>
                       <Ionicons name="trash-outline" size={18} color="#EF4444" />
                     </TouchableOpacity>
                   )}
                </View>

                <View style={styles.inputGrid}>
                  <View style={styles.fieldBox}>
                    <Text style={styles.fieldLabel}>From (min)</Text>
                    <View style={[styles.inputBox, slot.isReadOnly && styles.inputLocked]}>
                      <TextInput
                        style={[styles.textInput, slot.isReadOnly && { color: '#64748B' }]}
                        value={slot.minMinutes}
                        editable={false}
                        keyboardType="number-pad"
                      />
                    </View>
                  </View>

                  <View style={styles.fieldBox}>
                    <Text style={styles.fieldLabel}>To (min)</Text>
                    <View style={[styles.inputBox, slot.isReadOnly && styles.inputLocked]}>
                      {slot.isUnlimited ? (
                        <Text style={styles.unlimitedText}>Unlimited</Text>
                      ) : (
                        <TextInput
                          style={styles.textInput}
                          value={slot.maxMinutes}
                          onChangeText={(t) => updateSlot(slot.id, 'maxMinutes', t)}
                          editable={!slot.isReadOnly}
                          keyboardType="number-pad"
                          placeholder="End"
                        />
                      )}
                    </View>
                  </View>

                  <View style={styles.fieldBox}>
                    <Text style={styles.fieldLabel}>Rate (₹)</Text>
                    <View style={[styles.inputBox, styles.priceInputBox, slot.isReadOnly && styles.inputLocked]}>
                      <Text style={styles.currency}>₹</Text>
                      <TextInput
                        style={styles.textInput}
                        value={slot.price}
                        onChangeText={(t) => updateSlot(slot.id, 'price', t)}
                        editable={!slot.isReadOnly}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                      />
                    </View>
                  </View>
                </View>

                {!slot.isReadOnly && (
                  <TouchableOpacity
                    style={styles.unlimitedToggle}
                    onPress={() => updateSlot(slot.id, 'isUnlimited', !slot.isUnlimited)}
                  >
                    <Ionicons
                      name={slot.isUnlimited ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={slot.isUnlimited ? theme.color : '#CBD5E1'}
                    />
                    <Text style={styles.toggleLabel}>Cap as final phase</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {!isEditMode && !priceSlots[priceSlots.length - 1]?.isUnlimited && (
              <TouchableOpacity style={[styles.addBtn, { borderColor: theme.color }]} onPress={addPriceSlot}>
                <Ionicons name="add" size={20} color={theme.color} />
                <Text style={[styles.addBtnText, { color: theme.color }]}>Append Next Phase</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: theme.color }]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Text style={styles.saveBtnText}>Commit Pricing Rule</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  iconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  headerTextCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  headerPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, marginTop: 4 },
  pillDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  headerSubtitle: { fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 },
  
  scrollContent: { padding: 20, paddingBottom: 100 },
  summaryBox: { backgroundColor: '#F8FAFC', borderRadius: 24, padding: 20, marginBottom: 25, borderWidth: 1, borderColor: '#F1F5F9' },
  summaryLabel: { fontSize: 12, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 15 },
  timelineContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  timelineItem: { flexDirection: 'row', alignItems: 'center' },
  timelineNode: { width: 12, height: 12, borderRadius: 6 },
  timelineLine: { width: 30, height: 2, backgroundColor: '#E2E8F0', marginHorizontal: 4 },
  summaryDesc: { fontSize: 13, color: '#64748B', lineHeight: 18 },

  modeBanner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 20, gap: 10 },
  modeText: { fontSize: 12, fontWeight: '600' },

  slotCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9', elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10 },
  cardReadOnly: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', opacity: 0.8 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  slotBadge: { width: 24, height: 24, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  slotBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  cardTitleText: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1E293B' },
  trashBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },

  inputGrid: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  fieldBox: { flex: 1 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', marginBottom: 8, textTransform: 'uppercase' },
  inputBox: { height: 48, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 12, justifyContent: 'center' },
  inputLocked: { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' },
  priceInputBox: { borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', gap: 4 },
  textInput: { fontSize: 15, fontWeight: '600', color: '#1E293B', padding: 0 },
  currency: { fontSize: 15, fontWeight: '700', color: '#64748B' },
  unlimitedText: { fontSize: 14, color: '#64748B', fontWeight: '600' },

  unlimitedToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
  toggleLabel: { fontSize: 13, color: '#64748B', fontWeight: '600' },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, borderStyle: 'dashed', borderWidth: 2, gap: 10, marginTop: 10 },
  addBtnText: { fontSize: 14, fontWeight: '800' },

  footer: { padding: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  saveBtn: { height: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, elevation: 4, shadowOpacity: 0.2, shadowRadius: 10 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});

export default CreateRule;