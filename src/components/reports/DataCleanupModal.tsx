import React, { useState, useEffect } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { reportsApi } from '../../api/reports/api';
import { DeleteOptions } from '../../types/reports';

interface DataCleanupModalProps {
  visible: boolean;
  tenantId: string;
  onClose: () => void;
  onCleanupComplete: () => void;
}

const DataCleanupModal: React.FC<DataCleanupModalProps> = ({
  visible,
  tenantId,
  onClose,
  onCleanupComplete,
}) => {
  const [loading, setLoading] = useState(false);
  const [storageInfo, setStorageInfo] = useState<{
    totalRecords: number;
    activeRecords: number;
    completedRecords: number;
    estimatedSizeMB: number;
    oldestRecord: string | null;
  } | null>(null);

  // const [deleteOptions, setDeleteOptions] = useState<DeleteOptions>({
  //   olderThanDays: 90,
  //   status: 'COMPLETED',
  //   dryRun: true,
  // });

  const [deleteOptions, setDeleteOptions] = useState({
    startDate: null as Date | null,
    endDate: null as Date | null,
    status: 'COMPLETED',
    dryRun: true,
  });

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const [previewResult, setPreviewResult] = useState<{
    deletedCount: number;
    remainingCount: number;
    spaceFreed: number;
  } | null>(null);

  useEffect(() => {
    if (visible) {
      loadStorageInfo();
    }
  }, [visible]);

  const loadStorageInfo = async () => {
    try {
      setLoading(true);
      const info = await reportsApi.getStorageInfo(tenantId);
      setStorageInfo(info);
    } catch (error) {
      Alert.alert('Error', 'Failed to load storage information');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async () => {
    try {
      if (!deleteOptions.startDate || !deleteOptions.endDate) {
        Alert.alert('Select Dates', 'Please select start and end date');
        return;
      }

      setLoading(true);

      const format = (d: Date) => {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      };

      const formattedStart = format(deleteOptions.startDate);
      const formattedEnd = format(deleteOptions.endDate);
      const payload = {
        ...deleteOptions,
        startDate: formattedStart,
        endDate: formattedEnd,
        dryRun: true,
      };
      const result = await reportsApi.deleteOldRecords(tenantId, payload);
      setPreviewResult(result);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to preview cleanup');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = () => {
    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to delete ${previewResult?.deletedCount || 0} records? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: performDelete,
        },
      ]
    );
  };

  const performDelete = async () => {
    try {
      if (!deleteOptions.startDate || !deleteOptions.endDate) {
        Alert.alert('Select Dates', 'Please select start and end date');
        return;
      }

      if (deleteOptions.startDate > deleteOptions.endDate) {
        Alert.alert('Invalid Date', 'Start date cannot be after end date');
        return;
      }

      setLoading(true);

      const start = deleteOptions.startDate;
      const end = deleteOptions.endDate;

      const format = (d: Date) => {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      };

      const formattedStart = format(start);
      const formattedEnd = format(end);
      const payload = {
        ...deleteOptions,
        startDate: formattedStart,
        endDate: formattedEnd,
        dryRun: false,
      };
      const result = await reportsApi.deleteOldRecords(tenantId, payload);
      Alert.alert('Success', 'Data cleaned up successfully');
      onCleanupComplete();
      onClose();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to delete records');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getRecommendation = (): { text: string; icon: string; color: string } => {
    if (!storageInfo) return { text: '', icon: '', color: '' };
    
    const { totalRecords, estimatedSizeMB } = storageInfo;
    
    if (estimatedSizeMB > 400) {
      return {
        text: 'High storage usage! Immediate cleanup recommended.',
        icon: 'alert-circle',
        color: '#F44336',
      };
    } else if (estimatedSizeMB > 250) {
      return {
        text: 'Moderate storage usage. Consider cleanup soon.',
        icon: 'alert',
        color: '#FF9800',
      };
    } else if (totalRecords > 50000) {
      return {
        text: 'Large number of records. Regular cleanup recommended.',
        icon: 'information',
        color: '#2196F3',
      };
    }
    return {
      text: 'Storage usage is healthy.',
      icon: 'check-circle',
      color: '#4CAF50',
    };
  };

  const recommendation = getRecommendation();

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
                <Icon name="delete-sweep" size={24} color="#FF9800" />
              </View>
              <Text style={styles.title}>Data Cleanup</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#757575" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {loading && !storageInfo ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF9800" />
                <Text style={styles.loadingText}>Loading storage info...</Text>
              </View>
            ) : (
              <>
                {/* Storage Info */}
                {storageInfo && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionIconContainer}>
                        <Icon name="database" size={18} color="#FF9800" />
                      </View>
                      <Text style={styles.sectionTitle}>Current Storage</Text>
                    </View>
                    
                    <View style={styles.infoCard}>
                      <View style={styles.infoRow}>
                        <View style={styles.infoLeft}>
                          <Icon name="file-document-multiple" size={18} color="#FF9800" />
                          <Text style={styles.infoLabel}>Total Records</Text>
                        </View>
                        <Text style={styles.infoValue}>
                          {storageInfo.totalRecords.toLocaleString()}
                        </Text>
                      </View>
                      
                      <View style={styles.infoRow}>
                        <View style={styles.infoLeft}>
                          <Icon name="clock-outline" size={18} color="#4CAF50" />
                          <Text style={styles.infoLabel}>Active Sessions</Text>
                        </View>
                        <Text style={[styles.infoValue, styles.activeValue]}>
                          {storageInfo.activeRecords}
                        </Text>
                      </View>
                      
                      <View style={styles.infoRow}>
                        <View style={styles.infoLeft}>
                          <Icon name="check-circle-outline" size={18} color="#2196F3" />
                          <Text style={styles.infoLabel}>Completed Sessions</Text>
                        </View>
                        <Text style={styles.infoValue}>
                          {storageInfo.completedRecords.toLocaleString()}
                        </Text>
                      </View>
                      
                      <View style={styles.infoRow}>
                        <View style={styles.infoLeft}>
                          <Icon name="harddisk" size={18} color="#9C27B0" />
                          <Text style={styles.infoLabel}>Estimated Size</Text>
                        </View>
                        <Text style={styles.infoValue}>
                          {storageInfo.estimatedSizeMB.toFixed(2)} MB
                        </Text>
                      </View>
                      
                      <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                        <View style={styles.infoLeft}>
                          <Icon name="calendar-clock" size={18} color="#FF6F00" />
                          <Text style={styles.infoLabel}>Oldest Record</Text>
                        </View>
                        <Text style={styles.infoValue}>
                          {formatDate(storageInfo.oldestRecord)}
                        </Text>
                      </View>
                    </View>
                    
                    {recommendation.text && (
                      <View style={[styles.recommendationBox, { backgroundColor: `${recommendation.color}15` }]}>
                        <Icon name={recommendation.icon} size={20} color={recommendation.color} />
                        <Text style={[styles.recommendationText, { color: recommendation.color }]}>
                          {recommendation.text}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Cleanup Options */}
                {/* <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionIconContainer}>
                      <Icon name="cog" size={18} color="#FF9800" />
                    </View>
                    <Text style={styles.sectionTitle}>Cleanup Options</Text>
                  </View>
                  
                  <View style={styles.optionCard}>
                    <View style={styles.optionHeader}>
                      <Icon name="calendar-range" size={20} color="#FF9800" />
                      <Text style={styles.optionLabel}>Delete records older than</Text>
                    </View>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={deleteOptions.olderThanDays}
                        onValueChange={(value) =>
                          setDeleteOptions({ ...deleteOptions, olderThanDays: value })
                        }
                        style={styles.picker}
                      >
                        <Picker.Item label="30 days" value={30} />
                        <Picker.Item label="60 days" value={60} />
                        <Picker.Item label="90 days (Recommended)" value={90} />
                        <Picker.Item label="120 days" value={120} />
                        <Picker.Item label="180 days" value={180} />
                        <Picker.Item label="365 days" value={365} />
                      </Picker>
                    </View>
                  </View>

                  <View style={styles.warningBox}>
                    <Icon name="shield-check" size={20} color="#FF9800" />
                    <Text style={styles.warningText}>
                      Only COMPLETED sessions will be deleted. ACTIVE sessions are always preserved.
                    </Text>
                  </View>
                </View> */}

                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Date Range</Text>

                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => {
                      setShowStartDatePicker(true);
                    }}
                  >
                    <View style={styles.dateButtonLeft}>
                      <View style={styles.dateIconContainer}>
                        <Icon name="calendar-start" size={20} color="#FF9800" />
                      </View>
                      <View>
                        <Text style={styles.dateLabel}>Start Date</Text>
                        <Text style={[
                          styles.dateValue,
                          { color: deleteOptions.startDate ? '#212121' : '#9E9E9E' }
                        ]}>
                          {deleteOptions.startDate
                            ? deleteOptions.startDate.toDateString()
                            : 'Select Start Date'}
                        </Text>
                      </View>
                    </View>
                    <Icon name="chevron-right" size={20} color="#BDBDBD" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => {
                      setShowEndDatePicker(true);
                    }}
                  >
                    <View style={styles.dateButtonLeft}>
                      <View style={styles.dateIconContainer}>
                        <Icon name="calendar-end" size={20} color="#FF9800" />
                      </View>
                      <View>
                        <Text style={styles.dateLabel}>End Date</Text>
                        <Text style={[
                          styles.dateValue,
                          { color: deleteOptions.endDate ? '#212121' : '#9E9E9E' }
                        ]}>
                          {deleteOptions.endDate
                            ? deleteOptions.endDate.toDateString()
                            : 'Select End Date'}
                        </Text>
                      </View>
                    </View>
                    <Icon name="chevron-right" size={20} color="#BDBDBD" />
                  </TouchableOpacity>
                </View>

                {/* Preview Result */}
                {previewResult && (
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionIconContainer}>
                        <Icon name="eye" size={18} color="#FF9800" />
                      </View>
                      <Text style={styles.sectionTitle}>Preview Results</Text>
                    </View>
                    
                    <View style={styles.previewCard}>
                      <View style={styles.previewRow}>
                        <View style={styles.previewLeft}>
                          <View style={[styles.previewIcon, { backgroundColor: '#FFEBEE' }]}>
                            <Icon name="delete" size={20} color="#F44336" />
                          </View>
                          <Text style={styles.previewLabel}>Records to Delete</Text>
                        </View>
                        <Text style={[styles.previewValue, styles.deleteValue]}>
                          {previewResult.deletedCount.toLocaleString()}
                        </Text>
                      </View>
                      
                      <View style={styles.previewRow}>
                        <View style={styles.previewLeft}>
                          <View style={[styles.previewIcon, { backgroundColor: '#E8F5E9' }]}>
                            <Icon name="harddisk" size={20} color="#4CAF50" />
                          </View>
                          <Text style={styles.previewLabel}>Space to Free</Text>
                        </View>
                        <Text style={[styles.previewValue, { color: '#4CAF50' }]}>
                          {previewResult.spaceFreed.toFixed(2)} KB
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.previewButton]}
              onPress={handlePreview}
              disabled={loading}
            >
              {loading && !previewResult ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Icon name="eye-outline" size={20} color="white" />
                  <Text style={styles.buttonText}>Preview Cleanup</Text>
                </>
              )}
            </TouchableOpacity>
            
            {previewResult && previewResult.deletedCount > 0 && (
              <TouchableOpacity
                style={[styles.button, styles.deleteButton]}
                onPress={handleConfirmDelete}
                disabled={loading}
              >
                <Icon name="delete-forever" size={20} color="white" />
                <Text style={styles.buttonText}>Delete Now</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
      {showStartDatePicker && (
        <DateTimePicker
          value={deleteOptions.startDate || new Date()}
          mode="date"
          onChange={(event, date) => {
            setShowStartDatePicker(false);
            if (event.type === 'set' && date) {
              setDeleteOptions({ ...deleteOptions, startDate: date });
            }
          }}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={deleteOptions.endDate || new Date()}
          mode="date"
          onChange={(event, date) => {
            setShowEndDatePicker(false);
            if (event.type === 'set' && date) {
              setDeleteOptions({ ...deleteOptions, endDate: date });
            }
          }}
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#FAFAFA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    padding: 16,
  },
  loadingContainer: {
    padding: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#757575',
    fontWeight: '500',
  },
  section: {
    marginBottom: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
    marginBottom:12
  },
  infoCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#616161',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#212121',
  },
  activeValue: {
    color: '#4CAF50',
  },
  recommendationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 14,
    borderRadius: 10,
    gap: 10,
  },
  recommendationText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  optionCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 14,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  optionLabel: {
    fontSize: 14,
    color: '#424242',
    fontWeight: '600',
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    padding: 14,
    borderRadius: 10,
    marginTop: 12,
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#E65100',
    fontWeight: '600',
    lineHeight: 18,
  },
  previewCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  previewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  previewIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 14,
    color: '#424242',
    fontWeight: '600',
  },
  previewValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#212121',
  },
  deleteValue: {
    color: '#F44336',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  previewButton: {
    backgroundColor: '#FF9800',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'white',
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
  },
});

export default DataCleanupModal;