import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { startParkingSession } from '../../../api/sessions/api';
import { useAuthStore } from '../../../store/authStore';

type Props = {
  qrId: string;
  onSuccess: () => void;
  onCancel?: () => void;
};

type VehicleTypeSelectorProps = {
  value: string;
  onChange: (value: string) => void;
};

const VehicleTypeSelector = ({ value, onChange }: VehicleTypeSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const options = ['Car', 'Bike', 'EV', 'AUTO'];

  return (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity
        style={[styles.dropdownButton, isOpen && styles.dropdownButtonActive]}
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.7}
      >
        <Text style={value ? styles.dropdownButtonText : styles.dropdownPlaceholder}>
          {value || 'Select vehicle type'}
        </Text>
        <Text style={styles.chevronText}>{isOpen ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.dropdownMenu}>
          {options.map(option => (
            <TouchableOpacity
              key={option}
              style={[
                styles.dropdownOption,
                value === option && styles.dropdownOptionSelected,
              ]}
              onPress={() => {
                onChange(option);
                setIsOpen(false);
              }}
            >
              <Text style={[
                styles.dropdownOptionText,
                value === option && styles.dropdownOptionTextSelected,
              ]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

export default function StartParkingForm({ qrId, onSuccess, onCancel }: Props) {
  const { user } = useAuthStore();
  const [vehicleType, setVehicleType] = useState('Bike');
  const [vehicleOrPerson, setVehicleOrPerson] = useState('');
  const [startTime] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const isFinished = useRef(false);

  const handleStart = async () => {
    if (loading || isFinished.current) return;

    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }
    if (!vehicleType) {
      Alert.alert('Error', 'Please select vehicle type');
      return;
    }
    if (!vehicleOrPerson.trim()) {
      Alert.alert('Error', 'Vehicle Number or Person Name is required');
      return;
    }

    setLoading(true);
    try {
      await startParkingSession({
        qr_id: qrId,
        vehicle_type: vehicleType,
        vehicle_number: vehicleOrPerson,
        person_name: vehicleOrPerson,
        tenant_id: user.tenant_id as string,
      });

      isFinished.current = true;

      Alert.alert(
        'Success',
        'Parking session started successfully',
        [
          {
            text: 'OK',
            onPress: () => {
              onSuccess();
            }
          }
        ],
        { cancelable: false }
      );
    } catch (e: any) {
      setLoading(false);
      Alert.alert('Error', e.message);
    }
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
      <View style={styles.form}>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>QR Code ID</Text>
          <TextInput
            value={qrId?.split('-')[1]}
            editable={false}
            style={styles.inputDisabled}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Vehicle Type</Text>
          <VehicleTypeSelector value={vehicleType} onChange={setVehicleType} />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Vehicle Number / Person Name</Text>
          <TextInput
            placeholder="e.g., KA01AB1234 or Rahul"
            value={vehicleOrPerson}
            onChangeText={(text) => setVehicleOrPerson(text.toUpperCase())}
            style={styles.input}
            autoCapitalize="characters"
            placeholderTextColor="#94a3b8"
            editable={!loading}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Session Start Time</Text>
          <View style={styles.timeContainer}>
            <Text style={styles.timeLabel}>Entry:</Text>
            <Text style={styles.timeText}>
              {startTime.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
            </Text>
          </View>
        </View>

        <View style={styles.actionRow}>
          {onCancel && (
            <TouchableOpacity 
              style={[styles.cancelBtn, loading && { opacity: 0.5 }]} 
              onPress={onCancel} 
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelBtnText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.primaryBtn, loading && { opacity: 0.7 }]}
            onPress={handleStart}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnText}>Start Session</Text>
            )}
          </TouchableOpacity>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 16,
    paddingTop: 8,
  },
  fieldGroup: {},
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#1e293b',
    backgroundColor: '#ffffff',
  },
  inputDisabled: {
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
  },
  dropdownContainer: { zIndex: 50 },
  dropdownButton: {
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownButtonActive: {
    borderColor: '#6366f1',
  },
  dropdownButtonText: {
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '500',
  },
  dropdownPlaceholder: {
    fontSize: 15,
    color: '#94a3b8',
  },
  chevronText: {
    fontSize: 10,
    color: '#94a3b8',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '110%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 100,
  },
  dropdownOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownOptionSelected: { backgroundColor: '#f5f3ff' },
  dropdownOptionText: { fontSize: 15, color: '#475569' },
  dropdownOptionTextSelected: { fontWeight: '700', color: '#6366f1' },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    backgroundColor: '#ffffff',
    borderStyle: 'dashed',
  },
  timeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
    marginRight: 8,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#d1d5db',
  },
  cancelBtnText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '700',
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 4,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});