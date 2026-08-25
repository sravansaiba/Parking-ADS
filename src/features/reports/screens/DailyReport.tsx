import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';

import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';
import { reportsApi } from '../../../api/reports/api';
import { exportMonthlyReportToPDF } from '../../../utils/exportMonthlyReportToPDF';
import { Alert, ActivityIndicator } from 'react-native';

const STATUS_BAR_HEIGHT =
  Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;

type Session = {
  id: string;
  start_time: string;
  end_time: string | null;
  payment_info: any;
};

export default function DailyReport() {
  const { user } = useAuthStore();
  const navigation = useNavigation<any>();
  const tenantId = user?.tenant_id;
  const isStaff = user?.role?.toLowerCase() === "staff";

  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [inCount, setInCount] = useState(0);
  const [outCount, setOutCount] = useState(0);
  const [cash, setCash] = useState(0);
  const [upi, setUpi] = useState(0);

  const formattedDate = date.toDateString();
  const onRefresh = async () => {
    if (refreshing) return;

    setRefreshing(true);
    await new Promise(res => setTimeout(res, 400));
    await loadData();
    setRefreshing(false);
  };

  const loadData = async () => {
    if (!tenantId) return;

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const { data: inData } = await supabase
      .from('parking_sessions')
      .select('id,start_time')
      .eq('tenant_id', tenantId)
      .gte('start_time', start.toISOString())
      .lte('start_time', end.toISOString());

    const { data: outData } = await supabase
      .from('parking_sessions')
      .select('id,start_time,end_time,payment_info,total_amount,payment_type')
      .eq('tenant_id', tenantId)
      .gte('end_time', start.toISOString())
      .lte('end_time', end.toISOString());

    setInCount(inData?.length || 0);
    setOutCount(outData?.length || 0);

    let cashTotal = 0;
    let upiTotal = 0;

    (outData || []).forEach((s: any) => {
      const amount = Number(s.total_amount || 0);
      const type = (s.payment_type || '').toUpperCase();

      if (type === 'PARTIAL' && s.payment_info?.payments) {
        s.payment_info.payments.forEach((p: any) => {
          const pType = (p.type || '').toLowerCase();
          const pAmt = Number(p.amount || 0);
          if (pType === 'cash') cashTotal += pAmt;
          if (pType === 'upi' || pType === 'online') upiTotal += pAmt;
        });
      } else if (type === 'CASH') {
        cashTotal += amount;
      } else if (type === 'UPI' || type === 'ONLINE') {
        upiTotal += amount;
      }
    });

    setCash(cashTotal);
    setUpi(upiTotal);
  };

  useEffect(() => {
    loadData();
  }, [date]);

  const [downloadingMonth, setDownloadingMonth] = useState(false);

  const handleDownloadMonthlyReport = async () => {
    if (!tenantId) return;
    try {
      setDownloadingMonth(true);
      const targetYear = date.getFullYear();
      const targetMonth = date.getMonth();
      const monthlyData = await reportsApi.getMonthlyReportData(
        tenantId,
        targetYear,
        targetMonth
      );
      await exportMonthlyReportToPDF(monthlyData);
    } catch (e: any) {
      Alert.alert(
        'Export Failed',
        e.message || 'Failed to generate monthly report'
      );
    } finally {
      setDownloadingMonth(false);
    }
  };

  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel('daily-report-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'parking_sessions' },
        () => loadData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [date, tenantId]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 30 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          progressViewOffset={STATUS_BAR_HEIGHT + 60}
          colors={['#040404']}
          tintColor="#080706"
        />
      }
    >
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#FF6B35" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Daily Report</Text>
        </View>

        {!isStaff && (
          <TouchableOpacity
            style={styles.monthDownloadBtn}
            onPress={handleDownloadMonthlyReport}
            disabled={downloadingMonth}
            activeOpacity={0.8}
          >
            {downloadingMonth ? (
              <ActivityIndicator size="small" color="#FF6B35" />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={18} color="#FF6B35" />
                <Text style={styles.monthDownloadText}>Month PDF</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={styles.dateCard}
        activeOpacity={0.8}
        onPress={() => setShowPicker(true)}
      >
        <View>
          <Text style={styles.dateLabel}>Selected Date</Text>
          <Text style={styles.dateValue}>{formattedDate}</Text>
        </View>
        <Ionicons name="calendar" size={22} color="#FF6B35" />
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={date}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={(event, selected) => {
            setShowPicker(false);
            if (selected) setDate(selected);
          }}
        />
      )}

      <View style={styles.statsRow}>
        <TouchableOpacity
          style={styles.statCard}
          activeOpacity={0.8}
          onPress={() =>
            navigation.navigate('VehicleListReport', {
              type: 'IN',
              date: date.toISOString(),
            })
          }
        >
          <Text style={styles.statLabel}>IN</Text>
          <Text style={styles.statValue}>{inCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.statCard}
          activeOpacity={0.8}
          onPress={() =>
            navigation.navigate('VehicleListReport', {
              type: 'OUT',
              date: date.toISOString(),
            })
          }
        >
          <Text style={styles.statLabel}>OUT</Text>
          <Text style={styles.statValue}>{outCount}</Text>
        </TouchableOpacity>
      </View>

      {!isStaff && (
        <View style={styles.revenueCard}>
          <Text style={styles.revenueTitle}>Revenue</Text>

          <View style={styles.revenueRow}>
            <Text style={styles.revenueLabel}>Cash</Text>
            <Text style={styles.revenueValue}>₹{cash}</Text>
          </View>

          <View style={styles.revenueRow}>
            <Text style={styles.revenueLabel}>UPI</Text>
            <Text style={styles.revenueValue}>₹{upi}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.revenueRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{cash + upi}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: STATUS_BAR_HEIGHT + 16,
    paddingHorizontal: 16,
    backgroundColor: '#F4F6FB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', marginLeft: 12, color: '#111827' },
  monthDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF2EC',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFD6C2',
    gap: 6,
  },
  monthDownloadText: {
    color: '#FF6B35',
    fontSize: 13,
    fontWeight: '700',
  },
  dateCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
    elevation: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  dateLabel: { color: '#FF8C42', fontSize: 12, fontWeight: '600' },
  dateValue: { color: '#111827', fontWeight: '700', marginTop: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    elevation: 3,
    borderTopWidth: 3,
    borderTopColor: '#FF6B35',
  },
  statLabel: { color: '#6b7280', fontSize: 12 },
  statValue: { fontSize: 22, fontWeight: '800', color: '#FF6B35', marginTop: 6 },
  revenueCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  revenueTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 10 },
  revenueRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 6 },
  revenueLabel: { color: '#111827' },
  revenueValue: { fontWeight: '700', color: '#FF6B35' },
  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 8 },
  totalLabel: { fontWeight: '800', color: '#111827' },
  totalValue: { fontWeight: '800', color: '#FF6B35' },
});
