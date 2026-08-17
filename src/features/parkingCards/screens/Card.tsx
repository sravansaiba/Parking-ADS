import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Animated,
  Platform,
  ScrollView,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCardStore } from "../cardStore";
import GenerateCard from "./GenerateCard";
import ViewCards from "./ViewCards";
import ScreenWrapper from "../../../components/ScreenWrapper/ScreenWrapper";
import { useAuthStore } from "../../../store/authStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
type TabType = "generate" | "view";

const tenantIdDefault = "b457b988-9952-4dbe-9a6d-6fa1385a7785";

const Card: React.FC = () => {
  const role = useAuthStore((state) => state.user?.role);
  const isStaff = role?.toLowerCase() === "staff";

  const [activeTab, setActiveTab] = useState<TabType>(isStaff ? "view" : "generate");
  const [showMenu, setShowMenu] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const pollInterval = useRef<NodeJS.Timeout | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { totalCards, activeCards, inactiveCards, fetchCards, fetchCounts } =
    useCardStore();

  useEffect(() => {
    if (isStaff && activeTab !== "view") {
      setActiveTab("view");
    }
  }, [isStaff, activeTab]);

  useEffect(() => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
      pollInterval.current = null;
    }
    fetchCounts(tenantIdDefault);

    if (activeTab === "view") {
      fetchCards(tenantIdDefault);

      pollInterval.current = setInterval(() => {
        fetchCards(tenantIdDefault);
        fetchCounts(tenantIdDefault);
      }, 8000);
    }

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
        pollInterval.current = null;
      }
    };
  }, [activeTab]);

  const onRefresh = async () => {
    if (refreshing) return;

    setRefreshing(true);

    await fetchCounts(tenantIdDefault);
    if (activeTab === "view") {
      await fetchCards(tenantIdDefault);
    }

    setRefreshing(false);
  };

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: activeTab === "generate" ? 0 : 1,
      useNativeDriver: true,
      friction: 10,
      tension: 80,
    }).start();
  }, [activeTab, slideAnim]);

  const indicatorTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, (SCREEN_WIDTH - 40) / 2],
  });

  const stats = useMemo(
    () => [
      {
        key: "total",
        label: "Total",
        value: totalCards,
        color: "#F97316",
      },
      {
        key: "active",
        label: "Active",
        value: activeCards,
        color: "#10B981",
      },
      {
        key: "inactive",
        label: "Inactive",
        value: inactiveCards,
        color: "#EF4444",
      },
    ],
    [totalCards, activeCards, inactiveCards],
  );


return (
  <ScreenWrapper>
    <View style={styles.header}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.headerRow}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Parking Cards</Text>
          <Text style={styles.subtitle}>Manage QR cards</Text>
        </View>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setShowMenu(!showMenu)}
          accessibilityLabel="Menu"
        >
          <Ionicons name="ellipsis-horizontal" size={22} color="#64748B" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        {stats.map((s) => (
          <View
            key={s.key}
            style={[styles.statCard, { borderLeftColor: s.color }]}
          >
            <Text style={styles.statLabel}>{s.label}</Text>
            <Text style={[styles.statValue, { color: s.color }]}>
              {s.value}
            </Text>
          </View>
        ))}
      </View>

      {!isStaff && (
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setActiveTab("generate")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="add-circle-outline"
              size={20}
              color={activeTab === "generate" ? "#F97316" : "#94A3B8"}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "generate" && styles.tabTextActive,
              ]}
            >
              Generate
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tab}
            onPress={() => setActiveTab("view")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="albums-outline"
              size={20}
              color={activeTab === "view" ? "#F97316" : "#94A3B8"}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "view" && styles.tabTextActive,
              ]}
            >
              View Cards
            </Text>
          </TouchableOpacity>

          <Animated.View
            style={[
              styles.indicator,
              { transform: [{ translateX: indicatorTranslateX }] },
            ]}
          />
        </View>
      )}
    </View>

    <View style={styles.content}>
      {activeTab === "generate" && !isStaff ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 30 }}
        >
          <GenerateCard />
        </ScrollView>
      ) : (
        <ViewCards 
          showMenu={showMenu} 
          setShowMenu={setShowMenu} 
        />
      )}
    </View>
  </ScreenWrapper>
);
};

export default Card;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    paddingTop: 0,
    paddingBottom: 10,
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingTop: 30,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#FAFAFA",
    borderLeftWidth: 3,
    minHeight: 58,
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
  statLabel: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    position: "relative",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
    paddingVertical: 8,
    borderRadius: 10,
    zIndex: 1,
  },
  tabText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#F97316",
  },
  indicator: {
    position: "absolute",
    left: 4,
    top: 4,
    bottom: 4,
    width: (SCREEN_WIDTH - 40) / 2,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    zIndex: 0,
    ...Platform.select({
      ios: {
        shadowColor: "#F97316",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  content: {
    flex: 1,
  },
});
