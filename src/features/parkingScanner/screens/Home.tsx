import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
  StatusBar,
  Platform,
  RefreshControl,
  AppState,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useAuthStore } from "../../../store/authStore";
import {
  handleQRScan as handleQRScanApi,
  getActiveSessions,
  getLastDepartedSession,
  getActiveSessionsForDashboard,
} from "../../../api/sessions/api";
import StartParkingForm from "../components/StartParkingForm";
import EndParkingForm from "../components/EndParkingForm";
import { ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useFocusEffect } from "@react-navigation/native";
import AutoIcon from '../../../assets/autorickshaw.svg';
import Auto from '../../../assets/auto.svg';


const STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;

export default function HomeScreen() {
  const [scanning, setScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const scanAnim = useRef(new Animated.Value(0)).current;
  const scannedRef = useRef(false);
  const isProcessingScan = useRef(false);
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);
  const [currentVehicles, setCurrentVehicles] = useState<number>(0);
  const [lastDeparted, setLastDeparted] = useState<{
    qr_id: string;
    vehicle_number: string;
    vehicle_type: string;
  } | null>(null);

  const appStateRef = useRef(AppState.currentState);

  const [scannedQR, setScannedQR] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<any>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showStartForm, setShowStartForm] = useState(false);
  const [showEndForm, setShowEndForm] = useState(false);

 type VehicleType = "EV" | "Bike" | "Car" | "AUTO";
  const VEHICLE_ICONS: Record<VehicleType, keyof typeof Ionicons.glyphMap> = {
    EV: "flash",
    Bike: "bicycle",
    Car: "car-sport",
    AUTO: "bus",
  };

  const [vehicleCounts, setVehicleCounts] = useState<Record<VehicleType, number>>({
    EV: 0,
    Bike: 0,
    Car: 0,
    AUTO: 0,
  });

  const onRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await new Promise((res) => setTimeout(res, 400));
    await refreshDashboard();
    setRefreshing(false);
  };

  const handleLogout = () => setShowLogoutModal(true);

  const confirmLogout = async () => {
    await useAuthStore.getState().signOut();
    setShowLogoutModal(false);
  };

  useEffect(() => {
    if (scanning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
          Animated.timing(scanAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      scanAnim.setValue(0);
    }
  }, [scanning]);

  // useEffect(() => {
  //   const sub = AppState.addEventListener("change", (state) => {
  //     if (state === "active") {
  //       console.log("App resumed → Resetting scanner locks");
  //       scannedRef.current = false;
  //       isProcessingScan.current = false;
  //       // Force scanner off on resume so user has to tap to scan again (re-mounting hardware)
  //       setScanning(false);
  //     }
  //   });

  //   return () => sub.remove();
  // }, []);


  useEffect(() => {
  const sub = AppState.addEventListener("change", (nextState) => {
    const prev = appStateRef.current;
    appStateRef.current = nextState;

    if (prev === "background" && nextState === "active") {
      scannedRef.current = false;
      isProcessingScan.current = false;
      setScanning(false);
    }
  });
  return () => sub.remove();
}, []);

  const refreshDashboard = async () => {
    const freshUser = useAuthStore.getState().user;
    if (!freshUser?.tenant_id) return;

    const sessions = (await getActiveSessionsForDashboard(freshUser.tenant_id)) as { vehicle_type?: VehicleType }[];
    setCurrentVehicles(sessions.length);

    const counts: Record<VehicleType, number> = { EV: 0, Bike: 0, Car: 0, AUTO: 0 };
    sessions.forEach((s) => {
      if (s.vehicle_type && s.vehicle_type in counts) {
        counts[s.vehicle_type as VehicleType]++;
      }
    });
    setVehicleCounts(counts);

    const lastSession = await getLastDepartedSession(freshUser.tenant_id);
    setLastDeparted(lastSession);
  };

  useFocusEffect(
    React.useCallback(() => {
      refreshDashboard();
      scannedRef.current = false;
      isProcessingScan.current = false;
    }, []),
  );

  const handleQRScan = async (event: any) => {
    // Check both local ref and the API processing lock
    if (scannedRef.current || isProcessingScan.current) return;
    scannedRef.current = true;
    isProcessingScan.current = true;

    const code = event?.data;

    if (!code || !code.startsWith("APK-")) {
      scannedRef.current = false;
      isProcessingScan.current = false;
      return;
    }

    const freshUser = useAuthStore.getState().user;
    const tenantId = freshUser?.tenant_id;

    if (!tenantId) {
      Alert.alert("Error", "Your user account has no tenant linked.");
      scannedRef.current = false;
      isProcessingScan.current = false;
      return;
    }

    setScanning(false);

    try {
      const data = await handleQRScanApi(code, tenantId);

      if (data?.action === "START") {
        setScannedQR(code);
        setShowStartForm(true);
        // Note: scannedRef/isProcessing remains true to prevent background scans while form is open
      } else if (data?.action === "END") {
        setActiveSession(data.session);
        setShowEndForm(true);
      } else {
        Alert.alert("Error", "Invalid response from server.");
        scannedRef.current = false; 
        isProcessingScan.current = false;
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong.");
      scannedRef.current = false;
      isProcessingScan.current = false;
    }
  };

  if (!permission?.granted && scanning) {
    requestPermission();
    return null;
  }

  const handleStartCancel = async () => {
    setShowStartForm(false);
    setScannedQR(null);
    scannedRef.current = false;
    isProcessingScan.current = false;
    await refreshDashboard();
  };

  const handleEndCancel = async () => {
    setShowEndForm(false);
    setActiveSession(null);
    scannedRef.current = false;
    isProcessingScan.current = false;
    await refreshDashboard();
  };

  if (showStartForm && scannedQR) {
    return (
      <View style={styles.container}>
        <View style={styles.formHeader}>
          <TouchableOpacity onPress={handleStartCancel} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.formHeaderTitle}>Start Parking</Text>
        </View>

        <StartParkingForm
          qrId={scannedQR}
          onSuccess={async () => {
            setShowStartForm(false);
            setScannedQR(null);
            scannedRef.current = false;
            isProcessingScan.current = false;
            await refreshDashboard();
          }}
          onCancel={handleStartCancel}
        />
      </View>
    );
  }

  if (showEndForm && activeSession) {
    return (
      <View style={styles.container}>
        <View style={styles.formHeader}>
          <TouchableOpacity onPress={handleEndCancel} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.formHeaderTitle}>End Parking</Text>
        </View>

        <EndParkingForm
          session={activeSession}
          onSuccess={async () => {
            setShowEndForm(false);
            setActiveSession(null);
            scannedRef.current = false;
            isProcessingScan.current = false;
            await refreshDashboard();
          }}
          onCancel={handleEndCancel}
        />
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 30 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#17120c"]}
          tintColor="#141210"
          progressViewOffset={60}
        />
      }
    >
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Smart Parking</Text>
            <Text style={styles.headerSub}>Scan QR to manage parking sessions</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={24} color="#e65d0d" />
          </TouchableOpacity>
        </View>

        <View style={styles.scannerCard}>
          {!scanning ? (
            <TouchableOpacity 
              style={styles.scanButton} 
              onPress={() => {
                scannedRef.current = false;
                isProcessingScan.current = false;
                setScanning(true);
            }}>
              <View style={styles.scanCircle}>
                <Text style={styles.scanIcon}>⌁</Text>
              </View>
              <Text style={styles.scanText}>Tap to Scan QR</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.cameraWrap}>
              <View style={styles.cameraFrame}>
                <CameraView
                  style={styles.camera}
                  onBarcodeScanned={handleQRScan}
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                />
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
                <Animated.View
                  style={[
                    styles.scanLine,
                    {
                      transform: [{
                        translateY: scanAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 230],
                        }),
                      }],
                    },
                  ]}
                />
              </View>
              <TouchableOpacity 
                style={styles.closeScannerBtn} 
                onPress={() => {
                  setScanning(false);
                  scannedRef.current = false;
                  isProcessingScan.current = false;
                }}
              >
                <Text style={styles.closeScannerText}>Close Scanner</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Vehicles Inside</Text>
            <Text style={styles.statValue}>{currentVehicles}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Last Departed</Text>
            <Text style={styles.statValueSmall}>
              {lastDeparted ? `${lastDeparted.vehicle_type} - ${lastDeparted.vehicle_number}` : "--"}
            </Text>
          </View>
        </View>

        <View style={styles.reportCard}>
          <View style={styles.vehicleStatsRow}>
            <TouchableOpacity
              style={[styles.vehicleStatCard, { backgroundColor: "#16A34A" }]}
              onPress={() => navigation.navigate("RunningVehicles", { vehicleType: "EV" })}
            >
              <Ionicons name={VEHICLE_ICONS.EV} size={30} color="#fff" />
              <Text style={styles.vehicleStatValue}>{vehicleCounts.EV}</Text>
              <Text style={styles.vehicleStatLabel}>EV</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.vehicleStatCard, { backgroundColor: "#696a6c" }]}
              onPress={() => navigation.navigate("RunningVehicles", { vehicleType: "Bike" })}
            >
              <Ionicons name={VEHICLE_ICONS.Bike} size={30} color="#fff" />
              <Text style={styles.vehicleStatValue}>{vehicleCounts.Bike}</Text>
              <Text style={styles.vehicleStatLabel}>Bike</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.vehicleStatCard, { backgroundColor: "#e46a32" }]}
              onPress={() => navigation.navigate("RunningVehicles", { vehicleType: "Car" })}
            >
              <Ionicons name={VEHICLE_ICONS.Car} size={30} color="#fff" />
              <Text style={styles.vehicleStatValue}>{vehicleCounts.Car}</Text>
              <Text style={styles.vehicleStatLabel}>Car</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.vehicleStatCard, { backgroundColor: "#0EA5E9" }]}
              onPress={() => navigation.navigate("RunningVehicles", { vehicleType: "AUTO" })}
            >
              <Auto width={30} height={30} />
              <Text style={styles.vehicleStatValue}>{vehicleCounts.AUTO}</Text>
              <Text style={styles.vehicleStatLabel}>Auto</Text>
            </TouchableOpacity>

          </View>
        </View>
        <TouchableOpacity
          style={styles.reportCard}
          activeOpacity={0.7}
          onPress={() => navigation.navigate("DailyReport")}
        >
          <Text style={styles.reportTitle}>Daily Report</Text>
          <View style={styles.reportRow}>
            <Text style={styles.reportLabel}>Active Vehicles</Text>
            <Text style={styles.reportValue}>{currentVehicles}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.reportRow}>
            <Text style={styles.reportLabel}>Last Exit QR</Text>
            <Text style={styles.reportValue}>
              {lastDeparted ? lastDeparted.qr_id.split("-")[1] : "--"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {showLogoutModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Logout</Text>
            <Text style={styles.modalText}>Are you sure you want to log out?</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancel]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalConfirm]}
                onPress={confirmLogout}
              >
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6fb",
    paddingTop: STATUS_BAR_HEIGHT + 8,
    paddingHorizontal: 16,
  },

  // ✅ Form screen header with back arrow
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 20,
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  formHeaderTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1f2937",
  },

  header: {
    marginTop: 30,
    marginBottom: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoutBtn: { padding: 8 },
  modalOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "85%",
    maxWidth: 400,
    alignItems: "center",
  },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#1f2937", marginBottom: 8 },
  modalText: { fontSize: 15, color: "#6b7280", textAlign: "center", marginBottom: 24 },
  modalActions: { flexDirection: "row", gap: 12, width: "100%" },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  modalCancel: { backgroundColor: "#f3f4f6", borderWidth: 1, borderColor: "#e5e7eb" },
  modalConfirm: { backgroundColor: "#f97316" },
  modalBtnText: { fontSize: 16, fontWeight: "700", color: "#1f2937" },
  headerTitle: { fontSize: 26, fontWeight: "800", color: "#1f2937" },
  headerSub: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  scannerCard: { backgroundColor: "#ffffff", borderRadius: 20, padding: 20, elevation: 5 },
  scanButton: { alignItems: "center", paddingVertical: 30 },
  scanCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: "#e65d0d",
    alignItems: "center", justifyContent: "center",
  },
  scanIcon: { fontSize: 36, color: "#ffffff" },
  scanText: { marginTop: 12, fontSize: 16, fontWeight: "700", color: "#1f2937" },
  cameraWrap: { alignItems: "center" },
  cameraFrame: { width: 260, height: 260, borderRadius: 20, overflow: "hidden" },
  camera: { width: "100%", height: "100%" },
  corner: { position: "absolute", width: 40, height: 40, borderColor: "#22c55e", borderWidth: 4 },
  topLeft: { top: 10, left: 10, borderRightWidth: 0, borderBottomWidth: 0 },
  topRight: { top: 10, right: 10, borderLeftWidth: 0, borderBottomWidth: 0 },
  bottomLeft: { bottom: 10, left: 10, borderRightWidth: 0, borderTopWidth: 0 },
  bottomRight: { bottom: 10, right: 10, borderLeftWidth: 0, borderTopWidth: 0 },
  scanLine: { position: "absolute", width: "90%", height: 3, backgroundColor: "#22c55e", left: "5%" },
  closeScannerBtn: {
    marginTop: 14, backgroundColor: "#ef4444",
    paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10,
  },
  closeScannerText: { color: "#fff", fontWeight: "700" },
  statsRow: { flexDirection: "row", gap: 12, marginTop: 20 },
  statCard: { flex: 1, backgroundColor: "#ffffff", borderRadius: 16, padding: 16, elevation: 3 },
  statLabel: { color: "#6b7280", fontSize: 13 },
  statValue: { fontSize: 26, fontWeight: "800", color: "#e65d0d", marginTop: 4 },
  statValueSmall: { fontSize: 14, fontWeight: "700", color: "#111827", marginTop: 10 },
  reportCard: { backgroundColor: "#ffffff", borderRadius: 16, padding: 18, marginTop: 20, elevation: 3 },
  reportTitle: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 12 },
  reportRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 6 },
  reportLabel: { color: "#6b7280" },
  reportValue: { fontWeight: "700", color: "#111827" },
  divider: { height: 1, backgroundColor: "#e5e7eb", marginVertical: 10 },
  vehicleStatsRow: { flexDirection: "row", gap: 8, marginTop: 20, justifyContent: "space-between" },
  vehicleStatCard: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  vehicleStatValue: { fontSize: 22, fontWeight: "800", color: "#fff" },
  vehicleStatLabel: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.95)", marginTop: 4 },
});