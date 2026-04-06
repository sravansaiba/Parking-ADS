import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../../services/supabase';
import { useAuthStore } from '../../../store/authStore';

const STATUS_BAR_HEIGHT =
  Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;

const PAGE_SIZE_OPTIONS = [10, 15, 20, 25];
const DEFAULT_PAGE_SIZE = 15;

type Vehicle = {
  id: string;
  vehicle_number: string;
  person_name: string;
  qr_id: string;
  start_time: string;
  end_time: string | null;
};

export default function VehicleListReport() {
  const { user } = useAuthStore();
  const tenantId = user?.tenant_id;
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const { type, date: dateString } = route.params;
  
  const date = useMemo(() => new Date(dateString), [dateString]);

  const [data, setData] = useState<Vehicle[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalRecords, setTotalRecords] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  const getDateRange = () => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  };

    // ─── Fetch next batch and append ─────────────────────────────────────────────
  const fetchPage = async (page: number, size: number, searchText = '') => {
    if (!tenantId) return;

    setLoading(true);

    const { start, end } = getDateRange();

    let query = supabase
      .from('parking_sessions')
      .select(
        'id, vehicle_number, person_name, qr_id, start_time, end_time',
        { count: 'exact' }
      )
      .eq('tenant_id', tenantId);

    if (type === 'IN') {
      query = query
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .order('start_time', { ascending: false });
    } else {
      query = query
        .gte('end_time', start.toISOString())
        .lte('end_time', end.toISOString())
        .order('end_time', { ascending: false });
    }

    if (searchText.trim()) {
      query = query.or(
        `vehicle_number.ilike.%${searchText}%,person_name.ilike.%${searchText}%,qr_id.ilike.%${searchText}%`
      );
    }
    query = query.range((page - 1) * size, page * size - 1);

    const { data, count } = await query;

    console.log("Page:", page);
    console.log("Range:", (page - 1) * size, "to", page * size - 1);

    setData(data || []);
    setTotalRecords(count || 0);
    setLoading(false);
  };

  // ✅ ONLY pagination trigger
  useEffect(() => {
    fetchPage(currentPage, pageSize, search);
  }, [currentPage, pageSize]);

  // ✅ SEARCH HANDLER (like RunningVehicles)
  const handleSearch = (text: string) => {
    setSearch(text);
    setCurrentPage(1);
    fetchPage(1, pageSize, text);
  };

  const renderItem = ({ item }: { item: Vehicle }) => (
    <View style={styles.card}>
      <Text style={styles.rowText}>
        <Text style={styles.label}>Vehicle Number / Person Name - </Text>
        {item.vehicle_number}
      </Text>

      <Text style={styles.rowText}>
        <Text style={styles.label}>QR - </Text>
        {item.qr_id?.split('-')[1]}
      </Text>

      <Text style={styles.time}>
        {type === 'IN'
          ? `Start - ${new Date(item.start_time).toLocaleTimeString()}`
          : `End - ${
              item.end_time
                ? new Date(item.end_time).toLocaleTimeString()
                : '-'
            }`}
      </Text>
    </View>
  );

  const renderPaginationBar = () => (
    <View style={styles.paginationBar}>
      <View style={styles.dropdownWrapper}>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setDropdownOpen(v => !v)}
        >
          <Text style={styles.dropdownValue}>{pageSize}</Text>
          <Ionicons
            name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
            size={13}
            color="#f97316"
          />
        </TouchableOpacity>

        {dropdownOpen && (
          <View style={styles.dropdownMenu}>
            {PAGE_SIZE_OPTIONS.map(size => (
              <TouchableOpacity
                key={size}
                onPress={() => {
                  setPageSize(size);
                  setCurrentPage(1);
                  setDropdownOpen(false);
                }}
                style={styles.dropdownItem}
              >
                <Text style={styles.dropdownItemText}>{size}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <Text style={styles.perPageLabel}>/ page</Text>

      <View style={{ flex: 1 }} />

      <Text style={styles.totalCount}>
        <Text style={styles.totalCountBold}>{totalRecords}</Text> total
      </Text>

      <View style={{ flex: 1 }} />

      <View style={styles.pageNavRow}>
        <TouchableOpacity
          onPress={() => currentPage > 1 && setCurrentPage(p => p - 1)}
          disabled={currentPage === 1}
          style={styles.navBtn}
        >
          <Ionicons name="chevron-back" size={15} color="#f97316" />
        </TouchableOpacity>

        <Text style={styles.pageInfo}>
          {currentPage} / {totalPages}
        </Text>

        <TouchableOpacity
          onPress={() =>
            currentPage < totalPages && setCurrentPage(p => p + 1)
          }
          disabled={currentPage === totalPages}
          style={styles.navBtn}
        >
          <Ionicons name="chevron-forward" size={15} color="#f97316" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{type} Vehicles</Text>
      </View>

      <TextInput
        placeholder="Search Vehicle / Name / QR"
        value={search}
        onChangeText={handleSearch}
        style={styles.search}
      />

      {loading ? (
        // Full-screen spinner only on very first load
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : (
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          ListFooterComponent={renderPaginationBar}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6fb',
    paddingTop: STATUS_BAR_HEIGHT + 16,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginLeft: 12,
  },
  search: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  rowText: {
    fontSize: 14,
    color: '#111827',
    marginTop: 2,
  },
  label: {
    fontWeight: '700',
    color: '#374151',
  },
  time: {
    marginTop: 6,
    fontWeight: '700',
    color: '#FF6B35',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  paginationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
  },
  dropdownWrapper: { position: 'relative', zIndex: 10 },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7f0',
    borderWidth: 1,
    borderColor: '#f97316',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dropdownValue: { fontSize: 13, fontWeight: '700', color: '#f97316' },
  dropdownMenu: {
    position: 'absolute',
    bottom: 38,
    left: 0,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 10 },
  dropdownItemText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  perPageLabel: { fontSize: 12, color: '#9ca3af', marginLeft: 6 },
  totalCount: { fontSize: 13, color: '#6b7280' },
  totalCountBold: { fontWeight: '800', color: '#111827' },
  pageNavRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#fff7f0',
    borderWidth: 1,
    borderColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageInfo: { fontSize: 13, color: '#6b7280' },
});