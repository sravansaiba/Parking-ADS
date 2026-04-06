import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  ToastAndroid,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCardStore } from "../cardStore";

const QUICK_COUNTS = [50, 100, 200, 300, 500];

const GenerateCard: React.FC = () => {
  const { generateCards, totalCards, qrCodes } = useCardStore();

  const [count, setCount] = useState("");
  const [selectedQuick, setSelectedQuick] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const lastCode =
    qrCodes.length > 0 ? qrCodes[0].code_text : null;

  const handleQuickSelect = (value: number) => {
    setSelectedQuick(value);
    setCount(String(value));
  };

  const handleGenerate = () => {
    const num = parseInt(count);

    if (!count || isNaN(num) || num <= 0) {
      Alert.alert("Error", "Please enter a valid number");
      return;
    }

    if (num > 2000) {
      Alert.alert(
        "Large Generation",
        "You are generating over 2000 cards. This may take a moment. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Continue", onPress: () => doGenerate(num) },
        ]
      );
    } else {
      doGenerate(num);
    }
  };

  const doGenerate = async (num: number) => {
    const tenantId = "b457b988-9952-4dbe-9a6d-6fa1385a7785";

    try {
      setIsGenerating(true);
      await generateCards(tenantId, num);

      if (Platform.OS === 'android') {
        ToastAndroid.show(
          `Successfully generated ${num} new card(s)!`,
          ToastAndroid.LONG
        );
      } else {
        Alert.alert("Success", `Generated ${num} new card(s)!`);
      }

      setCount("");
      setSelectedQuick(null);
    } catch (error) {
      Alert.alert("Error", "Failed to generate cards.");
    } finally {
      setIsGenerating(false);
    }
  };

  const parsedCount = parseInt(count);
  const hasValidCount = !!count && !isNaN(parsedCount) && parsedCount > 0;
  const disabled = !hasValidCount || isGenerating;

  return (
    <View style={styles.container}>
      {/* INFO CARD */}
      <View style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Ionicons name="information-circle" size={24} color="#F97316" />
          <Text style={styles.infoTitle}>Card Information</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Total Cards:</Text>
          <Text style={styles.infoValue}>{totalCards}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Last Generated Code:</Text>
          <Text style={[styles.infoValue, { color: "#10B981" }]}>
            {lastCode ? lastCode.replace('APK-', '') : 'None'}
          </Text>
        </View>
      </View>

      {/* QUICK BUTTONS */}
      <Text style={styles.sectionTitle}>Quick Generate</Text>
      <View style={styles.quickButtonsContainer}>
        {QUICK_COUNTS.map((qty) => (
          <TouchableOpacity
            key={qty}
            style={[
              styles.quickButton,
              selectedQuick === qty && styles.quickButtonActive,
            ]}
            onPress={() => handleQuickSelect(qty)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.quickButtonText,
                selectedQuick === qty && styles.quickButtonTextActive,
              ]}
            >
              {qty}
            </Text>
            <Text
              style={[
                styles.quickButtonLabel,
                selectedQuick === qty && styles.quickButtonLabelActive,
              ]}
            >
              Cards
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* CUSTOM INPUT */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
        Custom Count
      </Text>

      <View style={styles.inputBox}>
        <Ionicons name="calculator-outline" size={20} color="#F97316" />
        <TextInput
          style={styles.input}
          placeholder="Enter number of cards"
          placeholderTextColor="#94A3B8"
          keyboardType="number-pad"
          value={count}
          onChangeText={(t) => {
            setCount(t);
            setSelectedQuick(null);
          }}
        />
      </View>

      {/* PREVIEW */}
      {count !== "" && !isNaN(parseInt(count)) && parseInt(count) > 0 && (
        <View style={styles.previewBox}>
          <Ionicons name="eye-outline" size={22} color="#F97316" />
          <Text style={styles.previewText}>
            Will generate{" "}
            <Text style={styles.previewNumber}>{count}</Text> new cards
          </Text>
        </View>
      )}

      {/* GENERATE BUTTON */}
      <TouchableOpacity
        style={[
          styles.generateButton,
          disabled && styles.generateButtonDisabled,
        ]}
        onPress={handleGenerate}
        disabled={disabled}
        activeOpacity={0.8}
      >
        {isGenerating ? (
          <>
            <ActivityIndicator color="#FFFFFF" size="small" />
            <Text style={styles.generateButtonText}>Generating…</Text>
          </>
        ) : (
          <>
            <Ionicons name="add-circle" size={22} color="#FFFFFF" />
            <Text style={styles.generateButtonText}>Generate Cards</Text>
          </>
        )}
      </TouchableOpacity>

      {/* WARNING */}
      <View style={styles.warningBox}>
        <Ionicons name="alert-circle-outline" size={20} color="#F59E0B" />
        <Text style={styles.warningText}>
          Generated cards are immediately stored in the database. Don't forget
          to download them for printing.
        </Text>
      </View>
   </View>
  );
};

export default GenerateCard;

const styles = StyleSheet.create({
 container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: 16,
    paddingBottom: 40,
  },

  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },

  infoCard: {
    backgroundColor: "#FFF7ED",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FDBA74",
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: "#F97316",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },

  infoHeader: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 8,
    marginBottom: 12,
  },

  infoTitle: { 
    fontSize: 16, 
    fontWeight: "700", 
    color: "#F97316",
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    paddingVertical: 4,
  },

  infoLabel: { 
    color: "#78716C", 
    fontSize: 14,
    fontWeight: "500",
  },

  infoValue: { 
    fontSize: 16, 
    fontWeight: "700", 
    color: "#0F172A",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },

  quickButtonsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  quickButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 16,
    flexGrow: 1,
    minWidth: "45%",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },

  quickButtonActive: {
    backgroundColor: "#F97316",
    borderColor: "#F97316",
    ...Platform.select({
      ios: {
        shadowColor: "#F97316",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },

  quickButtonText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },

  quickButtonTextActive: { 
    color: "#FFFFFF",
  },

  quickButtonLabel: {
    fontSize: 12,
    marginTop: 4,
    color: "#64748B",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  quickButtonLabelActive: {
    color: "#FFFFFF",
  },

  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },

  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 14,
    paddingHorizontal: 12,
    color: "#0F172A",
    fontWeight: "500",
  },

  previewBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    padding: 14,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "#FDBA74",
  },

  previewText: { 
    color: "#78716C",
    fontSize: 14,
    fontWeight: "500",
  },

  previewNumber: { 
    fontWeight: "800", 
    color: "#F97316",
    fontSize: 16,
  },

  generateButton: {
    marginTop: 24,
    backgroundColor: "#F97316",
    padding: 18,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#F97316",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  generateButtonDisabled: {
    backgroundColor: "#D1D5DB",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.1,
      },
      android: {
        elevation: 1,
      },
    }),
  },

  generateButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFBEB",
    padding: 14,
    marginTop: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
    gap: 10,
  },

  warningText: {
    fontSize: 13,
    color: "#92400E",
    flex: 1,
    lineHeight: 20,
    fontWeight: "500",
  },
});