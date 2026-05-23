import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { changeAdminPassword } from "../../../api/users/api";

const STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;

type FieldConfig = {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
};

export default function ChangePassword() {
  const navigation = useNavigation<any>();

  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = async () => {
    if (!currentPass || !newPass || !confirmPass) {
      Alert.alert("Validation", "All fields are required.");
      return;
    }
    if (newPass.length < 6) {
      Alert.alert("Validation", "New password must be at least 6 characters.");
      return;
    }
    if (newPass !== confirmPass) {
      Alert.alert("Validation", "New passwords do not match.");
      return;
    }
    if (newPass === currentPass) {
      Alert.alert(
        "Validation",
        "New password must be different from your current password."
      );
      return;
    }

    setLoading(true);
    try {
      await changeAdminPassword(currentPass, newPass);
      Alert.alert("Password Updated", "Your password has been changed successfully.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const fields: FieldConfig[] = [
    {
      label: "Current Password",
      placeholder: "Enter your current password",
      value: currentPass,
      onChange: setCurrentPass,
      show: showCurrent,
      onToggle: () => setShowCurrent((v) => !v),
    },
    {
      label: "New Password",
      placeholder: "Min 6 characters",
      value: newPass,
      onChange: setNewPass,
      show: showNew,
      onToggle: () => setShowNew((v) => !v),
    },
    {
      label: "Confirm New Password",
      placeholder: "Repeat your new password",
      value: confirmPass,
      onChange: setConfirmPass,
      show: showConfirm,
      onToggle: () => setShowConfirm((v) => !v),
    },
  ];

  // Inline password strength indicator
  const getStrength = (pass: string): { label: string; color: string; width: string } => {
    if (pass.length === 0) return { label: "", color: "#e5e7eb", width: "0%" };
    if (pass.length < 6) return { label: "Too short", color: "#ef4444", width: "25%" };
    if (pass.length < 8) return { label: "Weak", color: "#f97316", width: "50%" };
    if (/[A-Z]/.test(pass) && /[0-9]/.test(pass))
      return { label: "Strong", color: "#16a34a", width: "100%" };
    return { label: "Medium", color: "#eab308", width: "75%" };
  };

  const strength = getStrength(newPass);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#f4f6fb" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Hero ── */}
        <View style={styles.heroCard}>
          <View style={styles.heroIconWrap}>
            <Ionicons name="shield-checkmark" size={30} color="#e65d0d" />
          </View>
          <Text style={styles.heroTitle}>Secure Your Account</Text>
          <Text style={styles.heroSub}>
            Choose a strong password that you don't use anywhere else.
          </Text>
        </View>

        {/* ── Form Card ── */}
        <View style={styles.formCard}>
          {fields.map((field, idx) => (
            <View key={idx} style={{ marginBottom: 16 }}>
              <Text style={styles.label}>{field.label}</Text>
              <View style={styles.passRow}>
                <TextInput
                  style={[styles.input, styles.passInput]}
                  placeholder={field.placeholder}
                  placeholderTextColor="#9ca3af"
                  value={field.value}
                  onChangeText={field.onChange}
                  secureTextEntry={!field.show}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType={idx < fields.length - 1 ? "next" : "done"}
                  onSubmitEditing={
                    idx === fields.length - 1 ? handleChange : undefined
                  }
                />
                <TouchableOpacity
                  onPress={field.onToggle}
                  style={styles.eyeBtn}
                >
                  <Ionicons
                    name={field.show ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#6b7280"
                  />
                </TouchableOpacity>
              </View>

              {/* Password strength bar — only for new password field */}
              {idx === 1 && newPass.length > 0 && (
                <View style={styles.strengthWrap}>
                  <View style={styles.strengthBar}>
                    <View
                      style={[
                        styles.strengthFill,
                        {
                          width: strength.width as any,
                          backgroundColor: strength.color,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.strengthLabel, { color: strength.color }]}>
                    {strength.label}
                  </Text>
                </View>
              )}

              {/* Match indicator — for confirm field */}
              {idx === 2 && confirmPass.length > 0 && (
                <Text
                  style={[
                    styles.matchLabel,
                    {
                      color:
                        confirmPass === newPass ? "#16a34a" : "#ef4444",
                    },
                  ]}
                >
                  {confirmPass === newPass
                    ? "✓ Passwords match"
                    : "✗ Passwords do not match"}
                </Text>
              )}
            </View>
          ))}

          <TouchableOpacity
            style={[styles.submitBtn, loading && { opacity: 0.65 }]}
            onPress={handleChange}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="lock-closed" size={16} color="#fff" />
                <Text style={styles.submitText}>Update Password</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Tips ── */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Password Tips</Text>
          {[
            "Use at least 8 characters",
            "Mix uppercase and lowercase letters",
            "Include numbers and symbols",
            "Avoid using personal information",
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Ionicons name="checkmark-circle" size={15} color="#16a34a" />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: STATUS_BAR_HEIGHT + 16,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1f2937",
  },
  scroll: {
    padding: 16,
    paddingBottom: 50,
  },
  heroCard: {
    backgroundColor: "#fff7f3",
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fde8da",
  },
  heroIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "#fde8da",
    elevation: 2,
    shadowColor: "#e65d0d",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 19,
  },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  passRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    backgroundColor: "#f9fafb",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: "#111827",
  },
  passInput: {
    flex: 1,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderRightWidth: 0,
  },
  eyeBtn: {
    height: 46,
    paddingHorizontal: 14,
    backgroundColor: "#f9fafb",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  strengthWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 8,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    backgroundColor: "#e5e7eb",
    borderRadius: 2,
    overflow: "hidden",
  },
  strengthFill: {
    height: "100%",
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: "600",
    minWidth: 55,
  },
  matchLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 5,
  },
  submitBtn: {
    backgroundColor: "#e65d0d",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  submitText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  tipsCard: {
    backgroundColor: "#f0fdf4",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#15803d",
    marginBottom: 10,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  tipText: {
    fontSize: 13,
    color: "#374151",
  },
});