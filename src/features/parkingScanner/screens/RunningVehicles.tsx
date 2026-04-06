import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getActiveSessions } from '../../../api/sessions/api';
import { useAuthStore } from '../../../store/authStore';

const STATUS_BAR_HEIGHT =
  Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;

const PAGE_SIZE_OPTIONS = [10, 15, 20, 25];
const DEFAULT_PAGE_SIZE = 15;

interface Session {
  id: string;
  vehicle_type: string;
  vehicle_number: string;
  qr_id: string;
  start_time: string;
  created_at?: string;
  updated_at?: string;
}

const formatParkedSince = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();

  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Today ${time}`;
  if (isYesterday) return `Yesterday ${time}`;

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}  ${time}`;
};

export default function RunningVehicles() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { vehicleType } = route.params;

  const [search, setSearch] = useState('');
  const [data, setData] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [totalRecords, setTotalRecords] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const fetchIdRef = useRef(0);

  // ─── Search debounce ────────────────────────────────────────────────────────
  const searchTimeoutRef = useRef<any>(null);

  // ─── Core fetch — search goes to DB, not local filter ───────────────────────
  const fetchPage = async (
    page: number,
    size: number,
    searchText: string,
    isRefresh = false
  ) => {
    const user = useAuthStore.getState().user;
    if (!user?.tenant_id) return;

    const fetchId = ++fetchIdRef.current;
    isRefresh ? setRefreshing(true) : setLoading(true);

    try {
      const { data: sessions, total } = await getActiveSessions(
        user.tenant_id,
        {
          vehicle_type: vehicleType,
          limit: size,
          offset: (page - 1) * size,
          search: searchText.trim() || undefined, // ✅ pass search to API
        }
      );

      if (fetchId !== fetchIdRef.current) return;

      setData(sessions);
      setTotalRecords(total);
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  // ─── Re-fetch on page/size change ──────────────────────────────────────────
  useEffect(() => {
    fetchPage(currentPage, pageSize, search);
  }, [currentPage, pageSize]);

  // ─── useFocusEffect — re-fetch every time screen comes into focus ───────────
  // This fixes the "no data after re-login" issue
  useFocusEffect(
    React.useCallback(() => {
      setCurrentPage(1);
      fetchPage(1, pageSize, search);
    }, [vehicleType, pageSize])
  );

  // ─── Search — debounced, resets to page 1, queries DB ───────────────────────
  const handleSearch = (text: string) => {
    setSearch(text);
    setCurrentPage(1);

    // Debounce 400ms so we don't fire on every keystroke
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      fetchPage(1, pageSize, text);
    }, 400);
  };

  const onRefresh = async () => {
    if (refreshing) return;
    setCurrentPage(1);
    setSearch('');
    await fetchPage(1, pageSize, '', true);
  };

  const onPageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
    setDropdownOpen(false);
    // useEffect on pageSize will trigger fetchPage
  };

  const renderPaginationBar = () => (
    <View style={styles.paginationBar}>
      <View style={styles.dropdownWrapper}>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setDropdownOpen(v => !v)}
          activeOpacity={0.8}
        >
          <Text style={styles.dropdownValue}>{pageSize}</Text>
          <Ionicons name={dropdownOpen ? 'chevron-up' : 'chevron-down'} size={13} color="#f97316" />
        </TouchableOpacity>

        {dropdownOpen && (
          <View style={styles.dropdownMenu}>
            {PAGE_SIZE_OPTIONS.map(size => (
              <TouchableOpacity
                key={size}
                onPress={() => onPageSizeChange(size)}
                style={[styles.dropdownItem, pageSize === size && styles.dropdownItemActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.dropdownItemText, pageSize === size && styles.dropdownItemTextActive]}>
                  {size}
                </Text>
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
          onPress={() => setCurrentPage(p => p - 1)}
          disabled={currentPage === 1}
          style={[styles.navBtn, currentPage === 1 && styles.navBtnDisabled]}
        >
          <Ionicons name="chevron-back" size={15} color={currentPage === 1 ? '#d1d5db' : '#f97316'} />
        </TouchableOpacity>

        <Text style={styles.pageInfo}>
          <Text style={styles.pageInfoBold}>{currentPage}</Text>
          <Text style={styles.pageInfoSlash}> / </Text>
          <Text style={styles.pageInfoBold}>{totalPages}</Text>
        </Text>

        <TouchableOpacity
          onPress={() => setCurrentPage(p => p + 1)}
          disabled={currentPage === totalPages}
          style={[styles.navBtn, currentPage === totalPages && styles.navBtnDisabled]}
        >
          <Ionicons name="chevron-forward" size={15} color={currentPage === totalPages ? '#d1d5db' : '#f97316'} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={{ paddingTop: STATUS_BAR_HEIGHT + 24 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Running {vehicleType}s</Text>
        </View>

        <TextInput
          placeholder="Search vehicle or QR"
          value={search}
          onChangeText={handleSearch}
          style={styles.search}
        />
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#f97316" />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.vehicle}>{item.vehicle_number || '--'}</Text>
                <Text style={styles.qr}>
                  {item.qr_id ? item.qr_id.split('-')[1] : '--'}
                </Text>
                <Text style={styles.parkedSince}>
                  🕐 {formatParkedSince(item.start_time)}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => navigation.navigate('EndParking', { sessionId: item.id, isLostCard: true })}
                activeOpacity={0.8}
              >
                <View style={styles.arrowCircle}>
                  <Ionicons name="chevron-forward" size={18} color="#ffffff" />
                </View>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {search.trim()
                ? `No results for "${search}"`
                : `No running ${vehicleType}s`}
            </Text>
          }
          ListFooterComponent={renderPaginationBar}
          refreshing={refreshing}
          onRefresh={onRefresh}
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6fb', paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginLeft: 12 },
  search: { backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 14 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 12, marginBottom: 10 },
  rowLeft: { flex: 1, gap: 3 },
  vehicle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  qr: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  parkedSince: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  empty: { textAlign: 'center', marginTop: 40, color: '#6b7280' },
  arrowCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f97316', alignItems: 'center', justifyContent: 'center' },
  paginationBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: 8, marginBottom: 8 },
  dropdownWrapper: { position: 'relative', zIndex: 10 },
  dropdown: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff7f0', borderWidth: 1, borderColor: '#f97316', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  dropdownValue: { fontSize: 13, fontWeight: '700', color: '#f97316' },
  dropdownMenu: { position: 'absolute', bottom: 38, left: 0, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden', minWidth: 64, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.08, shadowRadius: 6, zIndex: 20 },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 10 },
  dropdownItemActive: { backgroundColor: '#fff7f0' },
  dropdownItemText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  dropdownItemTextActive: { color: '#f97316' },
  perPageLabel: { fontSize: 12, color: '#9ca3af', marginLeft: 6 },
  totalCount: { fontSize: 13, color: '#6b7280' },
  totalCountBold: { fontWeight: '800', color: '#111827' },
  pageNavRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#fff7f0', borderWidth: 1, borderColor: '#f97316', alignItems: 'center', justifyContent: 'center' },
  navBtnDisabled: { backgroundColor: '#f9fafb', borderColor: '#e5e7eb' },
  pageInfo: { fontSize: 13, color: '#6b7280', minWidth: 36, textAlign: 'center' },
  pageInfoBold: { fontWeight: '800', color: '#111827', fontSize: 13 },
  pageInfoSlash: { color: '#d1d5db', fontSize: 13 },
});