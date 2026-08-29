import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  ToastAndroid,
  ActivityIndicator,
} from "react-native";
import { endParkingSession } from "../../../api/sessions/api";
import pricingApi from "../../../api/rules/api";
import { useAuthStore } from "../../../store/authStore";
import { supabase } from "../../../services/supabase";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  session?: any;
  sessionId?: string;
  isLostCard?: boolean;
  onSuccess: () => void;
  onCancel?: () => void;
};

export default function EndParkingForm({
  session,
  sessionId,
  isLostCard,
  onSuccess,
  onCancel,
}: Props) {
  const { user } = useAuthStore();
  const navigation = useNavigation<any>();

  const [fullSession, setFullSession] = useState<any>(session);
  const activeSession = isLostCard ? fullSession : session;

  const [endTime] = useState(new Date());

  const [amountStr, setAmountStr] = useState<string>("");
  const [calculatedAmount, setCalculatedAmount] = useState<number>(0);
  // Commented out for Adilabad App (Editing disabled, collect as per calculation only)
  // const [isAmountEditable, setIsAmountEditable] = useState(false);
  // const [wasAmountEdited, setWasAmountEdited] = useState(false);
  const isAmountEditable = false;
  const wasAmountEdited = false;

  const [paymentMode, setPaymentMode] = useState<"single" | "split">("single");
  const [singlePaymentType, setSinglePaymentType] = useState<"cash" | "upi">(
    "cash",
  );
  const [singleAmountReceived, setSingleAmountReceived] = useState<string>("");
  const [cashAmount, setCashAmount] = useState<string>("");
  const [upiAmount, setUpiAmount] = useState<string>("");

  const [ending, setEnding] = useState(false);
  const isSubmitted = useRef(false);

  const amount = parseFloat(amountStr) || 0;
  const singleReceived = parseFloat(singleAmountReceived) || 0;
  const cash = parseFloat(cashAmount) || 0;
  const upi = parseFloat(upiAmount) || 0;

  const returnCash =
    paymentMode === "single"
      ? Math.max(singleReceived - amount, 0)
      : Math.max(cash + upi - amount, 0);

  // ─── Load session if lost card ─────────────────────────────────────────────
  useEffect(() => {
    if (!isLostCard || !sessionId) return;
    const loadSession = async () => {
      const { data, error } = await supabase
        .from("parking_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();
      if (error) {
        Alert.alert("Error", "Unable to load session");
        return;
      }
      setFullSession(data);
    };
    loadSession();
  }, [isLostCard, sessionId]);

  // ─── Auto-calculate price ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user || !activeSession || !activeSession.vehicle_type /* || isAmountEditable */) {
      return;
    }
    const calculate = async () => {
      try {
        const start = new Date(activeSession.start_time).getTime();
        const end = endTime.getTime();
        const minutes = Math.max(Math.ceil((end - start) / 60000), 1);

        const price = await pricingApi.calculatePrice(
          user.tenant_id as string,
          activeSession.vehicle_type,
          minutes,
        );

        setCalculatedAmount(price);
        setAmountStr(String(price));
      } catch (e) {
        console.log("Price error:", e);
      }
    };
    calculate();
  }, [activeSession, endTime, user /* , isAmountEditable */]);

  // ─── Sync single received when amount or mode changes ─────────────────────
  useEffect(() => {
    if (paymentMode === "single") {
      setSingleAmountReceived(amountStr);
    }
  }, [amountStr, paymentMode]);

  // ─── Submit ────────────────────────────────────────────────────────────────
  const handleEnd = async () => {
    if (ending || isSubmitted.current) return;

    if (amountStr === "" || isNaN(amount)) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    setEnding(true);
    try {
      const { data: latest, error: checkError } = await supabase
        .from("parking_sessions")
        .select("id, status")
        .eq("id", activeSession.id)
        .single();

      if (checkError || !latest || latest.status !== "ACTIVE") {
        Alert.alert("Error", "This session has already been ended.");
        onSuccess();
        return;
      }

      let payments: { type: string; amount: number }[] = [];

      if (paymentMode === "single") {
        if (singleReceived < amount) {
          Alert.alert("Error", "Received amount is less than bill amount");
          setEnding(false);
          return;
        }
        payments = [{ type: singlePaymentType, amount }];
      } else {
        if (Math.abs(cash + upi - amount) > 0.01) {
          Alert.alert("Error", "Split amount must match bill amount");
          setEnding(false);
          return;
        }
        if (cash > 0) payments.push({ type: "cash", amount: cash });
        if (upi > 0) payments.push({ type: "upi", amount: upi });
      }

      let paymentType: "CASH" | "UPI" | "PARTIAL" =
        paymentMode === "single"
          ? singlePaymentType === "cash"
            ? "CASH"
            : "UPI"
          : "PARTIAL";

      await endParkingSession({
        session_id: activeSession.id,
        total_amount: amount,
        payment_type: paymentType,
        payment_info: {
          payments,
          return_cash: returnCash,
          original_amount: calculatedAmount > 0 ? calculatedAmount : amount,
        },
        // is_amount_edited: wasAmountEdited,
        is_amount_edited: false,
      });

      isSubmitted.current = true;

      if (Platform.OS === "android") {
        ToastAndroid.show("Parking ended successfully 🚗", ToastAndroid.SHORT);
      }

      Alert.alert("Success", "Parking ended successfully", [
        { text: "OK", onPress: () => onSuccess() },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to end session");
      setEnding(false);
    }
  };

  const confirmEndParking = () => {
    if (ending) return;
    Alert.alert(
      "Confirm End Parking",
      "Are you sure you want to end parking?",
      [
        { text: "No", style: "cancel" },
        { text: "Yes", onPress: handleEnd },
      ],
    );
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
    else navigation.goBack();
  };

  if (!activeSession) {
    return (
      <Text style={{ marginTop: 40, textAlign: "center" }}>Loading...</Text>
    );
  }

  const formatDate = (date: Date) => {
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
  };

  const formatTime = (date: Date) => {
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  };

  const formatDuration = (start: string | Date, end: string | Date): string => {
    if (!start || !end) return "-";
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const diffMs = Math.max(0, endTime - startTime);

    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days} ${days === 1 ? "Day" : "Days"}`);
    if (hours > 0) parts.push(`${hours} ${hours === 1 ? "Hour" : "Hours"}`);
    if (minutes > 0 || (days === 0 && hours === 0)) {
      parts.push(`${minutes} ${minutes === 1 ? "Minute" : "Minutes"}`);
    }

    return parts.join(", ");
  };

  return (
    <View style={styles.card}>
      {/* Row 1: QR ID + Vehicle Type */}
      <View style={styles.row}>
        <View style={styles.halfCell}>
          <Text style={styles.label}>QR ID</Text>
          <TextInput
            value={activeSession.qr_id?.split("-")[1]}
            editable={false}
            style={styles.inputDisabled}
            autoComplete="off"
            textContentType="none"
            importantForAutofill="no"
          />
        </View>
        <View style={styles.halfCell}>
          <Text style={styles.label}>Vehicle Type</Text>
          <TextInput
            value={activeSession.vehicle_type}
            editable={false}
            style={styles.inputDisabled}
            autoComplete="off"
            textContentType="none"
            importantForAutofill="no"
          />
        </View>
      </View>

      {/* Vehicle Number / Name */}
      <Text style={styles.label}>Vehicle Number / Name</Text>
      <TextInput
        value={activeSession.vehicle_number}
        editable={false}
        style={styles.inputDisabled}
        autoComplete="off"
        textContentType="none"
        importantForAutofill="no"
      />

      {/* Start Time + End Time */}
      <View style={styles.row}>
        <View style={styles.halfCell}>
          <Text style={styles.label}>Start Time</Text>
          <View style={styles.displayBox}>
            <Text style={styles.dateText}>
              {formatDate(new Date(activeSession.start_time))}
            </Text>
            <Text style={styles.timeText}>
              {formatTime(new Date(activeSession.start_time))}
            </Text>
          </View>
        </View>

        <View style={styles.halfCell}>
          <Text style={styles.label}>End Time</Text>
          <View style={styles.displayBox}>
            <Text style={styles.dateText}>{formatDate(endTime)}</Text>
            <Text style={styles.timeText}>{formatTime(endTime)}</Text>
          </View>
        </View>
      </View>

      {/* Duration */}
      <Text style={styles.label}>Duration</Text>
      <View style={styles.durationBox}>
        <Ionicons name="time-outline" size={18} color="#7C3AED" />
        <Text style={styles.durationValueText}>
          {formatDuration(activeSession.start_time, endTime)}
        </Text>
      </View>

      {/* Payment Type */}
      <Text style={styles.label}>Payment Type</Text>
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            styles.toggleBtnLeft,
            paymentMode === "single" && styles.toggleBtnActive,
          ]}
          onPress={() => setPaymentMode("single")}
        >
          <Text
            style={[
              styles.toggleText,
              paymentMode === "single" && styles.toggleTextActive,
            ]}
          >
            Single
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            styles.toggleBtnRight,
            paymentMode === "split" && styles.toggleBtnActive,
          ]}
          onPress={() => setPaymentMode("split")}
        >
          <Text
            style={[
              styles.toggleText,
              paymentMode === "split" && styles.toggleTextActive,
            ]}
          >
            Split
          </Text>
        </TouchableOpacity>
      </View>

      {/* Payment Method (single) */}
      {paymentMode === "single" && (
        <>
          <Text style={styles.label}>Payment Method</Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                styles.toggleBtnLeft,
                singlePaymentType === "cash" && styles.toggleBtnActive,
              ]}
              onPress={() => setSinglePaymentType("cash")}
            >
              <Text
                style={[
                  styles.toggleText,
                  singlePaymentType === "cash" && styles.toggleTextActive,
                ]}
              >
                Cash
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                styles.toggleBtnRight,
                singlePaymentType === "upi" && styles.toggleBtnActive,
              ]}
              onPress={() => setSinglePaymentType("upi")}
            >
              <Text
                style={[
                  styles.toggleText,
                  singlePaymentType === "upi" && styles.toggleTextActive,
                ]}
              >
                UPI
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Split amounts */}
      {paymentMode === "split" && (
        <View style={styles.row}>
          <View style={styles.halfCell}>
            <Text style={styles.label}>Cash Amount</Text>
            <TextInput
              keyboardType="numeric"
              value={cashAmount}
              onChangeText={(v) => {
                if (v === "" || /^\d*\.?\d*$/.test(v)) setCashAmount(v);
              }}
              placeholder="0"
              style={styles.input}
            />
          </View>
          <View style={styles.halfCell}>
            <Text style={styles.label}>UPI Amount</Text>
            <TextInput
              keyboardType="numeric"
              value={upiAmount}
              onChangeText={(v) => {
                if (v === "" || /^\d*\.?\d*$/.test(v)) setUpiAmount(v);
              }}
              placeholder="0"
              style={styles.input}
            />
          </View>
        </View>
      )}

      {/* Amount */}
      <Text style={styles.label}>Amount</Text>
      <View style={styles.amountRow}>
        <TextInput
          keyboardType="numeric"
          value={amountStr}
          editable={false}
          /*
          editable={isAmountEditable}
          onChangeText={(v) => {
            if (v === "" || /^\d*\.?\d*$/.test(v)) {
              setAmountStr(v);
              setWasAmountEdited(true);
            }
          }}
          */
          style={[
            styles.input,
            styles.inputDisabled,
            /* !isAmountEditable && styles.inputDisabled, */
            { flex: 1, fontWeight: "800", fontSize: 18, color: "#111827" },
          ]}
        />
        {/* Commented out Edit Button for Adilabad App (Only collect calculated amount) */}
        {/*
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => {
            if (isAmountEditable) setWasAmountEdited(true);
            setIsAmountEditable((prev) => !prev);
          }}
        >
          <Text style={styles.editBtnText}>
            {isAmountEditable ? "Lock" : "Edit"}
          </Text>
        </TouchableOpacity>
        */}
      </View>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={handleCancel}
          disabled={ending}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.endBtn, ending && { opacity: 0.7 }]}
          onPress={confirmEndParking}
          disabled={ending}
        >
          {ending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.endText}>End</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    marginTop: -10,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  halfCell: {
    flex: 1,
  },
  displayBox: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#f9fafb",
  },

  dateText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },

  timeText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  label: {
    fontSize: 11,
    color: "#000000",
    marginTop: 10,
    marginBottom: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
  },
  inputDisabled: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    backgroundColor: "#f3f4f6",
    color: "#374151",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  editBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  returnCashHint: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
    color: "#16a34a",
  },
  toggleContainer: {
    flexDirection: "row",
    borderRadius: 10,
    backgroundColor: "#f3f4f6",
    padding: 3,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleBtnLeft: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  toggleBtnRight: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: "#baa8fdff",
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  toggleTextActive: {
    color: "#111827",
    fontWeight: "700",
  },
  durationBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3E8FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
  },
  durationValueText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6D28D9",
    flex: 1,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
  },
  cancelText: {
    fontWeight: "800",
    color: "#111827",
    fontSize: 15,
  },
  endBtn: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#f97316",
    alignItems: "center",
  },
  endText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 15,
  },
});
