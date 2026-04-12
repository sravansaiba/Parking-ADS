import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { ReportFilters, VehicleType, PaymentType } from '../../types/reports';

interface FilterModalProps {
  visible: boolean;
  filters: ReportFilters;
  onApply: (filters: ReportFilters) => void;
  onClose: () => void;
}

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  filters,
  onApply,
  onClose,
}) => {
  const [localFilters, setLocalFilters] = useState<ReportFilters>(filters);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Update local filters when modal opens
  useEffect(() => {
    if (visible) {
      setLocalFilters(filters);
    }
  }, [visible, filters]);

  const handleApply = () => {
    onApply(localFilters);
  };

  const handleReset = () => {
    const today = new Date();
    const resetFilters: ReportFilters = {
      startDate: new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0),
      endDate: new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59),
      vehicleType: 'ALL',
      paymentType: 'ALL',
      status: 'COMPLETED',
    };
    setLocalFilters(resetFilters);
  };

  const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setLocalFilters({ ...localFilters, startDate: selectedDate });
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setLocalFilters({ ...localFilters, endDate: selectedDate });
    }
  };

  // Quick date range presets
  const handleQuickDateRange = (range: 'today' | 'week' | 'month' | 'quarter') => {
    const today = new Date();
    let start: Date;
    let end: Date = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    switch (range) {
      case 'today':
        start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
        break;
      case 'week':
        start = new Date(today);
        start.setDate(today.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
        break;
      case 'quarter':
        start = new Date(today.getFullYear(), today.getMonth() - 2, 1, 0, 0, 0);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
        break;
      default:
        start = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0);
    }

    setLocalFilters({ ...localFilters, startDate: start, endDate: end });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconContainer}>
                <Icon name="filter-variant" size={22} color="#FF9800" />
              </View>
              <Text style={styles.title}>Filter Reports</Text>
            </View>
            <TouchableOpacity 
              onPress={onClose}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <Icon name="close" size={24} color="#757575" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {/* Quick Date Range Presets */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Select</Text>
              <View style={styles.quickDateRow}>
                <TouchableOpacity
                  style={styles.quickDateChip}
                  onPress={() => handleQuickDateRange('today')}
                  activeOpacity={0.7}
                >
                  <Icon name="calendar-today" size={14} color="#FF9800" />
                  <Text style={styles.quickDateText}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickDateChip}
                  onPress={() => handleQuickDateRange('week')}
                  activeOpacity={0.7}
                >
                  <Icon name="calendar-week" size={14} color="#FF9800" />
                  <Text style={styles.quickDateText}>Last 7 Days</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickDateChip}
                  onPress={() => handleQuickDateRange('month')}
                  activeOpacity={0.7}
                >
                  <Icon name="calendar-month" size={14} color="#FF9800" />
                  <Text style={styles.quickDateText}>This Month</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickDateChip}
                  onPress={() => handleQuickDateRange('quarter')}
                  activeOpacity={0.7}
                >
                  <Icon name="calendar-range" size={14} color="#FF9800" />
                  <Text style={styles.quickDateText}>Last 3 Months</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Date Range */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Date Range</Text>
              
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowStartDatePicker(true)}
                activeOpacity={0.7}
              >
                <View style={styles.dateButtonLeft}>
                  <View style={styles.dateIconContainer}>
                    <Icon name="calendar-start" size={20} color="#FF9800" />
                  </View>
                  <View>
                    <Text style={styles.dateLabel}>Start Date</Text>
                    <Text style={styles.dateValue}>{formatDate(localFilters.startDate)}</Text>
                  </View>
                </View>
                <Icon name="chevron-right" size={20} color="#BDBDBD" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowEndDatePicker(true)}
                activeOpacity={0.7}
              >
                <View style={styles.dateButtonLeft}>
                  <View style={styles.dateIconContainer}>
                    <Icon name="calendar-end" size={20} color="#FF9800" />
                  </View>
                  <View>
                    <Text style={styles.dateLabel}>End Date</Text>
                    <Text style={styles.dateValue}>{formatDate(localFilters.endDate)}</Text>
                  </View>
                </View>
                <Icon name="chevron-right" size={20} color="#BDBDBD" />
              </TouchableOpacity>
            </View>

            {/* Vehicle Type */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vehicle Type</Text>
              <View style={styles.optionCard}>
                <View style={styles.optionIconContainer}>
                  <Icon name="car-multiple" size={20} color="#FF9800" />
                </View>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={localFilters.vehicleType}
                    onValueChange={(value) =>
                      setLocalFilters({ ...localFilters, vehicleType: value as VehicleType })
                    }
                    style={styles.picker}
                    dropdownIconColor="#FF9800"
                  >
                    <Picker.Item label="All Vehicles" value="ALL" />
                    <Picker.Item label="Car" value="Car" />
                    <Picker.Item label="Bike" value="Bike" />
                    <Picker.Item label="EV" value="EV" />
                    <Picker.Item label="Auto" value="Auto" />
                    <Picker.Item label="Cycle" value="Cycle" />
                  </Picker>
                </View>
              </View>
            </View>

            {/* Payment Type */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment Method</Text>
              <View style={styles.optionCard}>
                <View style={styles.optionIconContainer}>
                  <Icon name="credit-card-multiple" size={20} color="#FF9800" />
                </View>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={localFilters.paymentType}
                    onValueChange={(value) =>
                      setLocalFilters({ ...localFilters, paymentType: value as PaymentType })
                    }
                    style={styles.picker}
                    dropdownIconColor="#FF9800"
                  >
                    <Picker.Item label="All Payment Methods" value="ALL" />
                    <Picker.Item label="Cash Payment" value="CASH" />
                    <Picker.Item label="Online Payment" value="UPI" />
                  </Picker>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.resetButton]}
              onPress={handleReset}
              activeOpacity={0.7}
            >
              <Icon name="refresh" size={18} color="#757575" />
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.applyButton]}
              onPress={handleApply}
              activeOpacity={0.7}
            >
              <Icon name="check" size={18} color="#fff" />
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={localFilters.startDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleStartDateChange}
          maximumDate={localFilters.endDate}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={localFilters.endDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleEndDateChange}
          minimumDate={localFilters.startDate}
          maximumDate={new Date()}
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212121',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickDateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickDateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFE0B2',
    gap: 6,
  },
  quickDateText: {
    fontSize: 12,
    color: '#E65100',
    fontWeight: '600',
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  dateButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
    fontWeight: '500',
  },
  dateValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    paddingLeft: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 12,
  },
  optionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    flex: 1,
  },
  picker: {
    height: 50,
    color: '#212121',
  },
  actions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  resetButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#757575',
  },
  applyButton: {
    backgroundColor: '#FF9800',
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});

export default FilterModal;