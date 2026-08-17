// import React, { useState, useMemo } from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   ScrollView,
//   FlatList,
//   RefreshControl,
//   TouchableOpacity,
//   Modal,
// } from 'react-native';
// import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
// import { Ionicons } from '@expo/vector-icons';
// import { ParkingSession } from '../../types/reports';

// interface TableViewProps {
//   sessions: ParkingSession[];
//   refreshing: boolean;
//   onRefresh: () => void;
// }

// const PAGE_SIZE_OPTIONS = [10, 15, 20, 25];
// const DEFAULT_PAGE_SIZE = 15;

// const TableView: React.FC<TableViewProps> = ({ sessions, refreshing, onRefresh }) => {

//   // ─── Pagination state ────────────────────────────────────────────────────────
//   const [currentPage, setCurrentPage] = useState(1);
//   const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
//   const [dropdownOpen, setDropdownOpen] = useState(false);

//   // ─── Sort sessions: newest end_time first (most recently completed → top) ───
//   const sortedSessions = useMemo(() => {
//     return [...sessions].sort((a, b) => {
//       const aTime = a.end_time ? new Date(a.end_time).getTime() : 0;
//       const bTime = b.end_time ? new Date(b.end_time).getTime() : 0;
//       return bTime - aTime; // descending — latest exit at top
//     });
//   }, [sessions]);

//   const totalRecords = sortedSessions.length;
//   const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

//   // Reset to page 1 if page goes out of range after filter/search
//   const safePage = Math.min(currentPage, totalPages);

//   // ─── Current page slice ──────────────────────────────────────────────────────
//   const pagedSessions = useMemo(() => {
//     const start = (safePage - 1) * pageSize;
//     return sortedSessions.slice(start, start + pageSize);
//   }, [sortedSessions, safePage, pageSize]);

//   const goNext = () => {
//     if (safePage < totalPages) setCurrentPage(p => Math.min(p + 1, totalPages));
//   };

//   const goPrev = () => {
//     if (safePage > 1) setCurrentPage(p => Math.max(p - 1, 1));
//   };

//   const onPageSizeChange = (size: number) => {
//     setPageSize(size);
//     setCurrentPage(1);
//     setDropdownOpen(false);
//   };

//   // ─── Formatters ──────────────────────────────────────────────────────────────
//   const formatDateTimeWithYear = (dateString: string | null): string => {
//     if (!dateString) return '-';
//     const date = new Date(dateString);
//     const day = String(date.getDate()).padStart(2, '0');
//     const month = String(date.getMonth() + 1).padStart(2, '0');
//     const year = date.getFullYear();
//     const hours = date.getHours();
//     const minutes = String(date.getMinutes()).padStart(2, '0');
//     const ampm = hours >= 12 ? 'PM' : 'AM';
//     const displayHours = hours % 12 || 12;
//     return `${day}-${month}-${year}  ${displayHours}:${minutes} ${ampm}`;
//   };

//   const calculateDuration = (start: string | null, end: string | null): string => {
//     if (!start || !end) return '-';
//     const diffMs = new Date(end).getTime() - new Date(start).getTime();
//     const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
//     const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
//     const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
//     if (days > 0) return `${days}d ${hours}h`;
//     if (hours > 0) return `${hours}h ${minutes}m`;
//     return `${minutes}m`;
//   };

//   const getVehicleIcon = (vehicleType: string | null): string => {
//     const type = vehicleType?.toLowerCase() || '';
//     if (type.includes('car')) return 'car-side';
//     if (type.includes('bike') || type.includes('motorcycle')) return 'motorbike';
//     if (type.includes('truck')) return 'truck';
//     if (type.includes('bus')) return 'bus-side';
//     return 'car-side';
//   };

//   const getPaymentIcon = (paymentType: string | null): string => {
//     const type = paymentType?.toLowerCase() || '';
//     if (type.includes('cash')) return 'cash';
//     if (type.includes('upi') || type.includes('online')) return 'contactless-payment';
//     if (type.includes('card')) return 'credit-card';
//     return 'currency-inr';
//   };

//   const getPaymentColor = (paymentType: string | null): string => {
//     const type = paymentType?.toLowerCase() || '';
//     if (type.includes('cash')) return '#4CAF50';
//     if (type.includes('upi') || type.includes('online')) return '#9C27B0';
//     return '#FF9800';
//   };

//   const getPartialPaymentLines = (session: ParkingSession) => {
//     const payments = session.payment_info?.payments || [];
//     let cash = 0;
//     let upi = 0;
//     payments.forEach((p: any) => {
//       if (p.type === 'cash') cash += p.amount;
//       if (p.type === 'upi') upi += p.amount;
//     });
//     return { cash, upi };
//   };

//   // ─── Row renderer ────────────────────────────────────────────────────────────
//   const renderRow = ({ item, index }: { item: ParkingSession; index: number }) => {
//     // Global row number across pages
//     const globalIndex = (safePage - 1) * pageSize + index + 1;

//     return (
//       <View style={[styles.row, index % 2 === 0 && styles.evenRow]}>
//         {/* # */}
//         <View style={[styles.cell, styles.snoCell]}>
//           <View style={styles.snoBadge}>
//             <Text style={styles.snoText}>{globalIndex}</Text>
//           </View>
//         </View>

//         {/* QR Code */}
//         <View style={[styles.cell, styles.qrCell]}>
//           <Text style={styles.qrText}>{item.qr_id || '-'}</Text>
//         </View>

//         {/* Vehicle */}
//         <View style={[styles.cell, styles.vehicleCell]}>
//           <Icon name={getVehicleIcon(item.vehicle_type)} size={16} color="#FF9800" style={styles.cellIcon} />
//           <Text style={styles.cellText}>{item.vehicle_type || '-'}</Text>
//         </View>

//         {/* Number Plate */}
//         <View style={[styles.cell, styles.numberCell]}>
//           <Text style={styles.numberPlateText}>{item.vehicle_number || '-'}</Text>
//         </View>

//         {/* Check-In */}
//         <View style={[styles.cell, styles.timeCell]}>
//           <Text style={styles.timeText}>{formatDateTimeWithYear(item.start_time)}</Text>
//         </View>

//         {/* Check-Out */}
//         <View style={[styles.cell, styles.timeCell]}>
//           <Text style={styles.timeText}>{formatDateTimeWithYear(item.end_time)}</Text>
//         </View>

//         {/* Duration */}
//         <View style={[styles.cell, styles.durationCell]}>
//           <View style={styles.durationBadge}>
//             <Icon name="clock-outline" size={12} color="#FF9800" />
//             <Text style={styles.durationText}>
//               {calculateDuration(item.start_time, item.end_time)}
//             </Text>
//           </View>
//         </View>

//         {/* Payment */}
//         <View style={[styles.cell, styles.paymentCell]}>
//           <View style={[styles.paymentBadge, { backgroundColor: getPaymentColor(item.payment_type) + '15' }]}>
//             <Icon name={getPaymentIcon(item.payment_type)} size={12} color={getPaymentColor(item.payment_type)} />
//             <Text style={[styles.paymentText, { color: getPaymentColor(item.payment_type) }]}>
//               {item.payment_type || '-'}
//             </Text>
//           </View>
//         </View>

//         {/* Amount */}
//         <View style={[styles.cell, styles.amountCell]}>
//           {item.payment_type === 'PARTIAL' ? (
//             <Text style={styles.partialAmountText}>
//               Cash - ₹{getPartialPaymentLines(item).cash}, Upi - ₹{getPartialPaymentLines(item).upi}
//             </Text>
//           ) : (
//             <View style={styles.amountContainer}>
//               <Icon name="currency-inr" size={14} color="#4CAF50" />
//               <Text style={styles.amountText}>{item.total_amount ?? '0'}</Text>
//             </View>
//           )}
//         </View>
//       </View>
//     );
//   };

//   // ─── Single-line pagination footer ───────────────────────────────────────────
//   const renderPaginationBar = () => (
//     <View style={styles.paginationBar}>

//       {/* LEFT: page size dropdown */}
//       <View style={styles.dropdownWrapper}>
//         <TouchableOpacity
//           style={styles.dropdown}
//           onPress={() => setDropdownOpen(v => !v)}
//           activeOpacity={0.8}
//         >
//           <Text style={styles.dropdownValue}>{pageSize}</Text>
//           <Ionicons
//             name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
//             size={13}
//             color="#FF9800"
//           />
//         </TouchableOpacity>

//         {dropdownOpen && (
//           <View style={styles.dropdownMenu}>
//             {PAGE_SIZE_OPTIONS.map(size => (
//               <TouchableOpacity
//                 key={size}
//                 onPress={() => onPageSizeChange(size)}
//                 style={[styles.dropdownItem, pageSize === size && styles.dropdownItemActive]}
//                 activeOpacity={0.7}
//               >
//                 <Text style={[styles.dropdownItemText, pageSize === size && styles.dropdownItemTextActive]}>
//                   {size}
//                 </Text>
//               </TouchableOpacity>
//             ))}
//           </View>
//         )}
//       </View>

//       <Text style={styles.perPageLabel}>/ page</Text>

//       <View style={{ flex: 1 }} />

//       {/* CENTER: total count */}
//       <Text style={styles.totalCount}>
//         <Text style={styles.totalCountBold}>{totalRecords}</Text> total
//       </Text>

//       <View style={{ flex: 1 }} />

//       {/* RIGHT: prev · page x/y · next */}
//       <View style={styles.pageNavRow}>
//         <TouchableOpacity
//           onPress={goPrev}
//           disabled={safePage === 1}
//           style={[styles.navBtn, safePage === 1 && styles.navBtnDisabled]}
//           activeOpacity={0.7}
//         >
//           <Ionicons name="chevron-back" size={15} color={safePage === 1 ? '#d1d5db' : '#FF9800'} />
//         </TouchableOpacity>

//         <Text style={styles.pageInfo}>
//           <Text style={styles.pageInfoBold}>{safePage}</Text>
//           <Text style={styles.pageInfoSlash}> / </Text>
//           <Text style={styles.pageInfoBold}>{totalPages}</Text>
//         </Text>

//         <TouchableOpacity
//           onPress={goNext}
//           disabled={safePage === totalPages}
//           style={[styles.navBtn, safePage === totalPages && styles.navBtnDisabled]}
//           activeOpacity={0.7}
//         >
//           <Ionicons name="chevron-forward" size={15} color={safePage === totalPages ? '#d1d5db' : '#FF9800'} />
//         </TouchableOpacity>
//       </View>
//     </View>
//   );

//   // ─── Empty state ─────────────────────────────────────────────────────────────
//   if (sessions.length === 0) {
//     return (
//       <View style={styles.emptyContainer}>
//         <View style={styles.emptyIconContainer}>
//           <Icon name="file-document-outline" size={80} color="#E0E0E0" />
//         </View>
//         <Text style={styles.emptyTitle}>No Sessions Found</Text>
//         <Text style={styles.emptySubtitle}>
//           No parking sessions match your current filters.{'\n'}
//           Try adjusting your filter criteria.
//         </Text>
//         <View style={styles.emptyHintContainer}>
//           <Icon name="information-outline" size={16} color="#FF9800" />
//           <Text style={styles.emptyHint}>Tip: Use the filter button to modify date range</Text>
//         </View>
//       </View>
//     );
//   }

//   return (
//     <View style={styles.container}>
//       <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.scrollView}>
//         <View style={styles.tableContainer}>

//           {/* Table Header */}
//           <View style={styles.header}>
//             <View style={[styles.headerCell, styles.snoCell]}>
//               <Text style={styles.headerText}>#</Text>
//             </View>
//             <View style={[styles.headerCell, styles.qrCell]}>
//               <Text style={styles.headerText}>QR Code</Text>
//             </View>
//             <View style={[styles.headerCell, styles.vehicleCell]}>
//               <Icon name="car" size={14} color="#fff" />
//               <Text style={styles.headerText}>Vehicle</Text>
//             </View>
//             <View style={[styles.headerCell, styles.numberCell]}>
//               <Text style={styles.headerText}>Number / Name</Text>
//             </View>
//             <View style={[styles.headerCell, styles.timeCell]}>
//               <Text style={styles.headerText}>Check-In</Text>
//             </View>
//             <View style={[styles.headerCell, styles.timeCell]}>
//               <Text style={styles.headerText}>Check-Out</Text>
//             </View>
//             <View style={[styles.headerCell, styles.durationCell]}>
//               <Icon name="clock-outline" size={14} color="#fff" />
//               <Text style={styles.headerText}>Duration</Text>
//             </View>
//             <View style={[styles.headerCell, styles.paymentCell]}>
//               <Icon name="cash-multiple" size={14} color="#fff" />
//               <Text style={styles.headerText}>Payment</Text>
//             </View>
//             <View style={[styles.headerCell, styles.amountCell]}>
//               <Icon name="currency-inr" size={14} color="#fff" />
//               <Text style={styles.headerText}>Amount</Text>
//             </View>
//           </View>

//           {/* Rows — only current page */}
//           <FlatList
//             data={pagedSessions}
//             renderItem={renderRow}
//             keyExtractor={(item) => item.id}
//             initialNumToRender={DEFAULT_PAGE_SIZE}
//             maxToRenderPerBatch={DEFAULT_PAGE_SIZE}
//             windowSize={5}
//             showsVerticalScrollIndicator={true}
//             scrollEnabled={false}
//             refreshControl={
//               <RefreshControl
//                 refreshing={refreshing}
//                 onRefresh={() => { setCurrentPage(1); onRefresh(); }}
//                 colors={['#FF9800']}
//                 tintColor="#FF9800"
//               />
//             }
//           />
//         </View>
//       </ScrollView>

//       {/* Single-line pagination bar — outside horizontal scroll */}
//       {renderPaginationBar()}
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#F8F9FA',
//   },
//   scrollView: {
//     flex: 1,
//   },
//   tableContainer: {
//     backgroundColor: '#fff',
//   },

//   // ─── Table header ──────────────────────────────────────────────────────────
//   header: {
//     flexDirection: 'row',
//     backgroundColor: '#FF9800',
//     elevation: 2,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//   },
//   headerCell: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 14,
//     paddingHorizontal: 12,
//     gap: 6,
//     borderRightWidth: 1,
//     borderRightColor: 'rgba(255,255,255,0.2)',
//   },
//   headerText: {
//     fontWeight: '700',
//     color: '#fff',
//     fontSize: 13,
//     letterSpacing: 0.3,
//     textAlign: 'center',
//   },

//   // ─── Table rows ────────────────────────────────────────────────────────────
//   row: {
//     flexDirection: 'row',
//     borderBottomWidth: 1,
//     borderBottomColor: '#F0F0F0',
//     minHeight: 60,
//   },
//   evenRow: {
//     backgroundColor: '#FAFAFA',
//   },
//   cell: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: 12,
//     paddingHorizontal: 12,
//     borderRightWidth: 1,
//     borderRightColor: '#F5F5F5',
//   },
//   cellIcon: {
//     marginRight: 6,
//   },
//   cellText: {
//     fontSize: 13,
//     color: '#424242',
//     fontWeight: '500',
//   },

//   // ─── Column widths ─────────────────────────────────────────────────────────
//   snoCell: { width: 50, justifyContent: 'center' },
//   qrCell: { width: 170, justifyContent: 'flex-start' },
//   vehicleCell: { width: 110, justifyContent: 'flex-start' },
//   numberCell: { width: 130, justifyContent: 'flex-start' },
//   timeCell: { width: 180, justifyContent: 'flex-start' },
//   durationCell: { width: 100, justifyContent: 'center' },
//   paymentCell: { width: 100, justifyContent: 'center' },
//   amountCell: { width: 140, justifyContent: 'center' },

//   snoBadge: {
//     width: 26,
//     height: 26,
//     borderRadius: 13,
//     backgroundColor: '#FFF3E0',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   snoText: {
//     fontSize: 12,
//     fontWeight: '700',
//     color: '#E65100',
//   },
//   qrText: {
//     fontSize: 13,
//     fontWeight: '600',
//     color: '#FF9800',
//     fontFamily: 'monospace',
//   },
//   numberPlateText: {
//     fontSize: 13,
//     fontWeight: '500',
//     color: '#424242',
//   },
//   timeText: {
//     fontSize: 12,
//     color: '#424242',
//     fontWeight: '600',
//     flexShrink: 1,
//   },
//   durationBadge: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#FFF3E0',
//     paddingHorizontal: 10,
//     paddingVertical: 6,
//     borderRadius: 12,
//     gap: 4,
//     borderWidth: 1,
//     borderColor: '#FFE0B2',
//   },
//   durationText: {
//     fontSize: 12,
//     color: '#E65100',
//     fontWeight: '700',
//   },
//   paymentBadge: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 8,
//     paddingVertical: 6,
//     borderRadius: 12,
//     gap: 4,
//   },
//   paymentText: {
//     fontSize: 11,
//     fontWeight: '700',
//     textTransform: 'uppercase',
//   },
//   amountContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#E8F5E9',
//     paddingHorizontal: 10,
//     paddingVertical: 6,
//     borderRadius: 8,
//     gap: 2,
//   },
//   amountText: {
//     fontSize: 14,
//     fontWeight: '700',
//     color: '#2E7D32',
//   },
//   partialAmountText: {
//     fontSize: 12,
//     fontWeight: '600',
//     color: '#2E7D32',
//   },

//   // ─── Pagination bar — single line ──────────────────────────────────────────
//   paginationBar: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#fff',
//     borderTopWidth: 1,
//     borderTopColor: '#F0F0F0',
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//   },
//   dropdownWrapper: {
//     position: 'relative',
//     zIndex: 10,
//   },
//   dropdown: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 4,
//     backgroundColor: '#FFF3E0',
//     borderWidth: 1,
//     borderColor: '#FF9800',
//     borderRadius: 8,
//     paddingHorizontal: 10,
//     paddingVertical: 5,
//   },
//   dropdownValue: {
//     fontSize: 13,
//     fontWeight: '700',
//     color: '#FF9800',
//   },
//   dropdownMenu: {
//     position: 'absolute',
//     bottom: 38,
//     left: 0,
//     backgroundColor: '#fff',
//     borderRadius: 10,
//     borderWidth: 1,
//     borderColor: '#E0E0E0',
//     overflow: 'hidden',
//     minWidth: 64,
//     elevation: 8,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: -2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 6,
//     zIndex: 20,
//   },
//   dropdownItem: {
//     paddingHorizontal: 16,
//     paddingVertical: 10,
//   },
//   dropdownItemActive: {
//     backgroundColor: '#FFF3E0',
//   },
//   dropdownItemText: {
//     fontSize: 14,
//     fontWeight: '600',
//     color: '#374151',
//   },
//   dropdownItemTextActive: {
//     color: '#FF9800',
//   },
//   perPageLabel: {
//     fontSize: 12,
//     color: '#9ca3af',
//     marginLeft: 6,
//   },
//   totalCount: {
//     fontSize: 13,
//     color: '#6b7280',
//   },
//   totalCountBold: {
//     fontWeight: '800',
//     color: '#212121',
//   },
//   pageNavRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   navBtn: {
//     width: 28,
//     height: 28,
//     borderRadius: 8,
//     backgroundColor: '#FFF3E0',
//     borderWidth: 1,
//     borderColor: '#FF9800',
//     alignItems: 'center',
//     justifyContent: 'center',
//   },
//   navBtnDisabled: {
//     backgroundColor: '#f9fafb',
//     borderColor: '#e5e7eb',
//   },
//   pageInfo: {
//     fontSize: 13,
//     color: '#6b7280',
//     minWidth: 36,
//     textAlign: 'center',
//   },
//   pageInfoBold: {
//     fontWeight: '800',
//     color: '#212121',
//     fontSize: 13,
//   },
//   pageInfoSlash: {
//     color: '#d1d5db',
//     fontSize: 13,
//   },

//   // ─── Empty state ───────────────────────────────────────────────────────────
//   emptyContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     padding: 40,
//     backgroundColor: '#fff',
//     margin: 20,
//     borderRadius: 16,
//     elevation: 2,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.05,
//     shadowRadius: 4,
//   },
//   emptyIconContainer: {
//     marginBottom: 20,
//     opacity: 0.5,
//   },
//   emptyTitle: {
//     fontSize: 20,
//     fontWeight: '700',
//     color: '#212121',
//     marginBottom: 8,
//   },
//   emptySubtitle: {
//     fontSize: 14,
//     color: '#757575',
//     textAlign: 'center',
//     lineHeight: 20,
//     marginBottom: 20,
//   },
//   emptyHintContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#FFF3E0',
//     paddingHorizontal: 16,
//     paddingVertical: 10,
//     borderRadius: 20,
//     gap: 8,
//   },
//   emptyHint: {
//     fontSize: 13,
//     color: '#E65100',
//     fontWeight: '500',
//   },
// });

// export default TableView;




import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Ionicons } from '@expo/vector-icons';
import { ParkingSession } from '../../types/reports';

interface TableViewProps {
  sessions: ParkingSession[];
  refreshing: boolean;
  onRefresh: () => void;
}

const PAGE_SIZE_OPTIONS = [10, 15, 20, 25];
const DEFAULT_PAGE_SIZE = 15;

const TableView: React.FC<TableViewProps> = ({ sessions, refreshing, onRefresh }) => {

  // ─── Pagination state ────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setDropdownOpen(false);
      };
    }, [])
  );

  // ─── Sort sessions: newest end_time first (most recently completed → top) ───
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const aTime = a.end_time ? new Date(a.end_time).getTime() : 0;
      const bTime = b.end_time ? new Date(b.end_time).getTime() : 0;
      return bTime - aTime; // descending — latest exit at top
    });
  }, [sessions]);

  const totalRecords = sortedSessions.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  // Reset to page 1 if page goes out of range after filter/search
  const safePage = Math.min(currentPage, totalPages);

  // ─── Current page slice ──────────────────────────────────────────────────────
  const pagedSessions = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sortedSessions.slice(start, start + pageSize);
  }, [sortedSessions, safePage, pageSize]);

  const goNext = () => {
    if (safePage < totalPages) setCurrentPage(p => Math.min(p + 1, totalPages));
  };

  const goPrev = () => {
    if (safePage > 1) setCurrentPage(p => Math.max(p - 1, 1));
  };

  const onPageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
    setDropdownOpen(false);
  };

  // ─── Formatters ──────────────────────────────────────────────────────────────
  const formatDateTimeWithYear = (dateString: string | null): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${day}-${month}-${year}  ${displayHours}:${minutes} ${ampm}`;
  };

  const calculateDuration = (start: string | null, end: string | null): string => {
    if (!start || !end) return '-';
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    let result = '';

    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m`;

    return result.trim() || '0m';
  };

  const getVehicleIcon = (vehicleType: string | null): string => {
    const type = vehicleType?.toLowerCase() || '';
    if (type.includes('car')) return 'car-side';
    if (type.includes('bike') || type.includes('motorcycle')) return 'motorbike';
    if (type.includes('auto')) return 'rickshaw';
    if (type.includes('truck')) return 'truck';
    if (type.includes('bus')) return 'bus-side';
    return 'car-side';
  };

  const getPaymentIcon = (paymentType: string | null): string => {
    const type = paymentType?.toLowerCase() || '';
    if (type.includes('cash')) return 'cash';
    if (type.includes('upi') || type.includes('online')) return 'contactless-payment';
    if (type.includes('card')) return 'credit-card';
    return 'currency-inr';
  };

  const getPaymentColor = (paymentType: string | null): string => {
    const type = paymentType?.toLowerCase() || '';
    if (type.includes('cash')) return '#4CAF50';
    if (type.includes('upi') || type.includes('online')) return '#9C27B0';
    return '#FF9800';
  };

  const getPartialPaymentLines = (session: ParkingSession) => {
    const payments = session.payment_info?.payments || [];
    let cash = 0;
    let upi = 0;
    payments.forEach((p: any) => {
      if (p.type === 'cash') cash += p.amount;
      if (p.type === 'upi') upi += p.amount;
    });
    return { cash, upi };
  };

  // ─── Row renderer ────────────────────────────────────────────────────────────
  const renderRow = ({ item, index }: { item: ParkingSession; index: number }) => {
    // Global row number across pages
    const globalIndex = (safePage - 1) * pageSize + index + 1;

    return (
      <View style={[styles.row, index % 2 === 0 && styles.evenRow]}>
        {/* # */}
        <View style={[styles.cell, styles.snoCell]}>
          <View style={styles.snoBadge}>
            <Text style={styles.snoText}>{globalIndex}</Text>
          </View>
        </View>

        {/* QR Code */}
        <View style={[styles.cell, styles.qrCell]}>
          <Text style={styles.qrText}>{item.qr_id ? item.qr_id.replace(/^APK-/, '') : '-'}</Text>
        </View>

        {/* Vehicle */}
        <View style={[styles.cell, styles.vehicleCell]}>
          <Icon name={getVehicleIcon(item.vehicle_type)} size={16} color="#FF9800" style={styles.cellIcon} />
          <Text style={styles.cellText}>{item.vehicle_type || '-'}</Text>
        </View>

        {/* Number Plate */}
        <View style={[styles.cell, styles.numberCell]}>
          <Text style={styles.numberPlateText}>{item.vehicle_number || '-'}</Text>
        </View>

        {/* Check-In */}
        <View style={[styles.cell, styles.timeCell]}>
          <Text style={styles.timeText}>{formatDateTimeWithYear(item.start_time)}</Text>
        </View>

        {/* Check-Out */}
        <View style={[styles.cell, styles.timeCell]}>
          <Text style={styles.timeText}>{formatDateTimeWithYear(item.end_time)}</Text>
        </View>

        {/* Duration */}
        <View style={[styles.cell, styles.durationCell]}>
          <View style={styles.durationBadge}>
            <Icon name="clock-outline" size={12} color="#FF9800" />
            <Text style={styles.durationText}>
              {calculateDuration(item.start_time, item.end_time)}
            </Text>
          </View>
        </View>

        {/* Payment */}
        <View style={[styles.cell, styles.paymentCell]}>
          <View style={[styles.paymentBadge, { backgroundColor: getPaymentColor(item.payment_type) + '15' }]}>
            <Icon name={getPaymentIcon(item.payment_type)} size={12} color={getPaymentColor(item.payment_type)} />
            <Text style={[styles.paymentText, { color: getPaymentColor(item.payment_type) }]}>
              {item.payment_type || '-'}
            </Text>
          </View>
        </View>

        {/* Amount
        <View style={[styles.cell, styles.amountCell]}>
          {item.payment_type === 'PARTIAL' ? (
            <Text style={styles.partialAmountText}>
              Cash - ₹{getPartialPaymentLines(item).cash}, Upi - ₹{getPartialPaymentLines(item).upi}
            </Text>
          ) : (
            <View style={styles.amountContainer}>
              <Icon name="currency-inr" size={14} color="#4CAF50" />
              <Text style={styles.amountText}>{item.total_amount ?? '0'}</Text>
            </View>
          )}
        </View> */}


        {/* Amount */}
        <View style={[styles.cell, styles.amountCell]}>
          {item.payment_type === 'PARTIAL' ? (
            <View>
              <Text style={styles.partialAmountText}>
                Cash - ₹{getPartialPaymentLines(item).cash}, Upi - ₹{getPartialPaymentLines(item).upi}
              </Text>
              {item.is_amount_edited && (
                <View style={styles.editedBadge}>
                  <Icon name="pencil" size={9} color="#b45309" />
                  <Text style={styles.editedBadgeText}>Edited</Text>
                </View>
              )}
            </View>
          ) : (
            <View>
              <View style={styles.amountContainer}>
                <Icon name="currency-inr" size={14} color="#4CAF50" />
                <Text style={styles.amountText}>{item.total_amount ?? '0'}</Text>
              </View>
              {item.is_amount_edited && (
                <View style={styles.editedBadge}>
                  <Icon name="pencil" size={9} color="#b45309" />
                  <Text style={styles.editedBadgeText}>Edited</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  // ─── Single-line pagination footer ───────────────────────────────────────────
  const renderPaginationBar = () => (
    <View style={styles.paginationBar}>

      {/* LEFT: page size dropdown */}
      <View style={styles.dropdownWrapper}>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setDropdownOpen(v => !v)}
          activeOpacity={0.8}
        >
          <Text style={styles.dropdownValue}>{pageSize}</Text>
          <Ionicons
            name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
            size={13}
            color="#FF9800"
          />
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

      {/* CENTER: total count */}
      <Text style={styles.totalCount}>
        <Text style={styles.totalCountBold}>{totalRecords}</Text> total
      </Text>

      <View style={{ flex: 1 }} />

      {/* RIGHT: prev · page x/y · next */}
      <View style={styles.pageNavRow}>
        <TouchableOpacity
          onPress={goPrev}
          disabled={safePage === 1}
          style={[styles.navBtn, safePage === 1 && styles.navBtnDisabled]}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={15} color={safePage === 1 ? '#d1d5db' : '#FF9800'} />
        </TouchableOpacity>

        <Text style={styles.pageInfo}>
          <Text style={styles.pageInfoBold}>{safePage}</Text>
          <Text style={styles.pageInfoSlash}> / </Text>
          <Text style={styles.pageInfoBold}>{totalPages}</Text>
        </Text>

        <TouchableOpacity
          onPress={goNext}
          disabled={safePage === totalPages}
          style={[styles.navBtn, safePage === totalPages && styles.navBtnDisabled]}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-forward" size={15} color={safePage === totalPages ? '#d1d5db' : '#FF9800'} />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ─── Empty state ─────────────────────────────────────────────────────────────
  if (sessions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Icon name="file-document-outline" size={80} color="#E0E0E0" />
        </View>
        <Text style={styles.emptyTitle}>No Sessions Found</Text>
        <Text style={styles.emptySubtitle}>
          No parking sessions match your current filters.{'\n'}
          Try adjusting your filter criteria.
        </Text>
        <View style={styles.emptyHintContainer}>
          <Icon name="information-outline" size={16} color="#FF9800" />
          <Text style={styles.emptyHint}>Tip: Use the filter button to modify date range</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.scrollView}>
        <View style={styles.tableContainer}>

          {/* Table Header */}
          <View style={styles.header}>
            <View style={[styles.headerCell, styles.snoCell]}>
              <Text style={styles.headerText}>#</Text>
            </View>
            <View style={[styles.headerCell, styles.qrCell]}>
              <Text style={styles.headerText}>QR Code</Text>
            </View>
            <View style={[styles.headerCell, styles.vehicleCell]}>
              <Icon name="car" size={14} color="#fff" />
              <Text style={styles.headerText}>Vehicle</Text>
            </View>
            <View style={[styles.headerCell, styles.numberCell]}>
              <Text style={styles.headerText}>Number / Name</Text>
            </View>
            <View style={[styles.headerCell, styles.timeCell]}>
              <Text style={styles.headerText}>Check-In</Text>
            </View>
            <View style={[styles.headerCell, styles.timeCell]}>
              <Text style={styles.headerText}>Check-Out</Text>
            </View>
            <View style={[styles.headerCell, styles.durationCell]}>
              <Icon name="clock-outline" size={14} color="#fff" />
              <Text style={styles.headerText}>Duration</Text>
            </View>
            <View style={[styles.headerCell, styles.paymentCell]}>
              <Icon name="cash-multiple" size={14} color="#fff" />
              <Text style={styles.headerText}>Payment</Text>
            </View>
            <View style={[styles.headerCell, styles.amountCell]}>
              <Icon name="currency-inr" size={14} color="#fff" />
              <Text style={styles.headerText}>Amount</Text>
            </View>
          </View>

          {/* Rows — only current page */}
          <FlatList
            data={pagedSessions}
            renderItem={renderRow}
            keyExtractor={(item) => item.id}
            initialNumToRender={DEFAULT_PAGE_SIZE}
            maxToRenderPerBatch={DEFAULT_PAGE_SIZE}
            windowSize={5}
            showsVerticalScrollIndicator={true}
            scrollEnabled={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setCurrentPage(1); onRefresh(); }}
                colors={['#FF9800']}
                tintColor="#FF9800"
              />
            }
          />
        </View>
      </ScrollView>

      {/* Single-line pagination bar — outside horizontal scroll */}
      {renderPaginationBar()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  tableContainer: {
    backgroundColor: '#fff',
  },

  // ─── Table header ──────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    backgroundColor: '#FF9800',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 6,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.2)',
  },
  headerText: {
    fontWeight: '700',
    color: '#fff',
    fontSize: 13,
    letterSpacing: 0.3,
    textAlign: 'center',
  },

  // ─── Table rows ────────────────────────────────────────────────────────────
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    minHeight: 60,
  },
  evenRow: {
    backgroundColor: '#FAFAFA',
  },
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: '#F5F5F5',
  },
  cellIcon: {
    marginRight: 6,
  },
  cellText: {
    fontSize: 13,
    color: '#424242',
    fontWeight: '500',
  },

  // ─── Column widths ─────────────────────────────────────────────────────────
  snoCell: { width: 50, justifyContent: 'center' },
  qrCell: { width: 140, justifyContent: 'flex-start' },
  vehicleCell: { width: 110, justifyContent: 'flex-start' },
  numberCell: { width: 130, justifyContent: 'flex-start' },
  timeCell: { width: 180, justifyContent: 'flex-start' },
  durationCell: { width: 100, justifyContent: 'center' },
  paymentCell: { width: 100, justifyContent: 'center' },
  amountCell: { width: 140, justifyContent: 'center' },

  snoBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  snoText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#E65100',
  },
  qrText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF9800',
    fontFamily: 'monospace',
  },
  numberPlateText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#424242',
  },
  timeText: {
    fontSize: 12,
    color: '#424242',
    fontWeight: '600',
    flexShrink: 1,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  durationText: {
    fontSize: 12,
    color: '#E65100',
    fontWeight: '700',
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  paymentText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 2,
  },
  amountText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E7D32',
  },
  partialAmountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
  },

  // ─── Pagination bar — single line ──────────────────────────────────────────
  paginationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownWrapper: {
    position: 'relative',
    zIndex: 10,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FF9800',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dropdownValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF9800',
  },
  dropdownMenu: {
    position: 'absolute',
    bottom: 38,
    left: 0,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
    minWidth: 64,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    zIndex: 20,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dropdownItemActive: {
    backgroundColor: '#FFF3E0',
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  dropdownItemTextActive: {
    color: '#FF9800',
  },
  perPageLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 6,
  },
  totalCount: {
    fontSize: 13,
    color: '#6b7280',
  },
  totalCountBold: {
    fontWeight: '800',
    color: '#212121',
  },
  pageNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FF9800',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnDisabled: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
  },
  pageInfo: {
    fontSize: 13,
    color: '#6b7280',
    minWidth: 36,
    textAlign: 'center',
  },
  pageInfoBold: {
    fontWeight: '800',
    color: '#212121',
    fontSize: 13,
  },
  pageInfoSlash: {
    color: '#d1d5db',
    fontSize: 13,
  },

  // ─── Empty state ───────────────────────────────────────────────────────────
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  emptyIconContainer: {
    marginBottom: 20,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  emptyHint: {
    fontSize: 13,
    color: '#E65100',
    fontWeight: '500',
  },

  editedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  editedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b45309',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  filterMenuCenter: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: '30%',
    alignItems: 'center',
  },
  filterMenu: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  filterMenuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 14,
    textAlign: 'center',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
  },
  filterOptionActive: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  filterOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  filterOptionTextActive: {
    color: '#FF9800',
    fontWeight: '700',
  },
});

export default TableView;