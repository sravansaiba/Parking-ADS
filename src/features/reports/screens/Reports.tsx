import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
  Modal,
  TextInput,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { reportsApi } from "../../../api/reports/api";
import { exportToExcel } from "../../../utils/exportToExcel";
import { exportToPDF } from "../../../utils/exportToPDF";
import {
  ParkingSession,
  ReportFilters,
  ReportSummary,
} from "../../../types/reports";
import TableView from "../../../components/reports/TableView";
import AnalyticsView from "../../../components/reports/AnalyticsView";
import FilterModal from "../../../components/reports/FilterModal";
import DataCleanupModal from "../../../components/reports/DataCleanupModal";
import { useAuthStore } from "../../../store/authStore";

type ViewMode = "table" | "analytics";

// Date utility functions
const getStartOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0);
};

const getEndOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
};

const Reports: React.FC = () => {
  // State Management
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [sessions, setSessions] = useState<ParkingSession[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const filteredSessions = sessions.filter((item) => {
    const query = search.toLowerCase().trim();
    if (!query) return true;
    return (
      item.qr_id?.toLowerCase().includes(query) ||
      item.vehicle_type?.toLowerCase().includes(query) ||
      item.vehicle_number?.toLowerCase().includes(query) ||
      item.person_name?.toLowerCase().includes(query)
    );
  });

  const { user } = useAuthStore();
  const tenantId = user?.tenant_id;

  const [filters, setFilters] = useState<ReportFilters>({
    startDate: getStartOfMonth(new Date()),
    endDate: getEndOfMonth(new Date()),
    vehicleType: "ALL",
    paymentType: "ALL",
    status: "COMPLETED",
  });

  // Early return for missing tenant
  if (!tenantId) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle-outline" size={64} color="#FF9800" />
        <Text style={styles.errorText}>No tenant assigned</Text>
        <Text style={styles.errorSubtext}>Please contact support</Text>
      </View>
    );
  }

  // Data Loading
  const loadReportData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await reportsApi.getCompletedSessions(tenantId, filters);
      setSessions(data);
      const summaryData = reportsApi.calculateSummary(data);
      setSummary(summaryData);
    } catch (error) {
      Alert.alert("Error", "Failed to load report data. Please try again.");
      console.error("Report loading error:", error);
    } finally {
      setLoading(false);
    }
  }, [tenantId, filters]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // Refresh Handler
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReportData();
    setRefreshing(false);
  };

  // Export Handlers
  const handleExportExcel = async () => {
    if (!summary) return;

    try {
      setExporting(true);
      setShowExportMenu(false);
      await exportToExcel({ sessions, summary, filters });
      Alert.alert("Success", "Excel report exported successfully");
    } catch (error) {
      Alert.alert(
        "Export Failed",
        "Unable to export Excel file. Please try again.",
      );
      console.error("Excel export error:", error);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!summary) return;

    try {
      setExporting(true);
      setShowExportMenu(false);
      await exportToPDF({ sessions, summary, filters });
      Alert.alert("Success", "PDF report exported successfully");
    } catch (error) {
      Alert.alert(
        "Export Failed",
        "Unable to export PDF file. Please try again.",
      );
      console.error("PDF export error:", error);
    } finally {
      setExporting(false);
    }
  };

  // Quick Filter Handler
  const handleQuickFilter = (period: "current" | "last" | "3months") => {
    const today = new Date();
    let start: Date;
    let end: Date;

    switch (period) {
      case "current":
        start = getStartOfMonth(today);
        end = getEndOfMonth(today);
        break;
      case "last":
        const lastMonth = new Date(
          today.getFullYear(),
          today.getMonth() - 1,
          1,
        );
        start = getStartOfMonth(lastMonth);
        end = getEndOfMonth(lastMonth);
        break;
      case "3months":
        start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
        end = getEndOfMonth(today);
        break;
    }

    setFilters((prev) => ({ ...prev, startDate: start, endDate: end }));
  };

  // View Mode Change Handler
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={["#0c0c0c"]}
          tintColor="#0f0f0f"
        />
      }
    >
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

        <View style={styles.header}>
          <View style={styles.headerContent}>
            {isSearching ? (
              <View style={styles.searchBarContainer}>
                <TouchableOpacity
                  onPress={() => {
                    setIsSearching(false);
                    setSearch("");
                  }}
                >
                  <Icon name="arrow-left" size={24} color="#fff" />
                </TouchableOpacity>
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search QR, Vehicle, Plate..."
                  placeholderTextColor="rgba(255,255,255,0.7)"
                  style={styles.searchInput}
                  autoFocus
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch("")}>
                    <Icon name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <>
                <View style={styles.headerLeft}>
                  <Icon name="chart-box-outline" size={28} color="#fff" />
                  <View style={styles.headerTextContainer}>
                    <Text style={styles.headerTitle}>Reports</Text>
                    <Text style={styles.headerSubtitle}>
                      Analytics & Insights
                    </Text>
                  </View>
                </View>
                <View style={styles.headerActions}>
                  <TouchableOpacity
                    style={styles.headerButton}
                    onPress={() => setIsSearching(true)}
                  >
                    <Icon name="magnify" size={22} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.headerButton,
                      sessions.length === 0 && styles.headerButtonDisabled,
                    ]}
                    onPress={() => setShowExportMenu(true)}
                    disabled={sessions.length === 0}
                  >
                    <Icon name="download" size={22} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.headerButton}
                    onPress={() => setShowCleanupModal(true)}
                  >
                    <Icon name="delete-outline" size={22} color="#fff" />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>

        {/* View Mode Selector with Filter Icon */}
        <View style={styles.viewModeContainer}>
          <View style={styles.viewModeRow}>
            <View style={styles.viewModeSelector}>
              <TouchableOpacity
                style={[
                  styles.viewModeButton,
                  viewMode === "table" && styles.viewModeButtonActive,
                ]}
                onPress={() => handleViewModeChange("table")}
                activeOpacity={0.7}
              >
                <Icon
                  name="table-large"
                  size={18}
                  color={viewMode === "table" ? "#fff" : "#666"}
                />
                <Text
                  style={[
                    styles.viewModeText,
                    viewMode === "table" && styles.viewModeTextActive,
                  ]}
                >
                  Table
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.viewModeButton,
                  viewMode === "analytics" && styles.viewModeButtonActive,
                ]}
                onPress={() => handleViewModeChange("analytics")}
                activeOpacity={0.7}
              >
                <Icon
                  name="chart-line"
                  size={18}
                  color={viewMode === "analytics" ? "#fff" : "#666"}
                />
                <Text
                  style={[
                    styles.viewModeText,
                    viewMode === "analytics" && styles.viewModeTextActive,
                  ]}
                >
                  Analytics
                </Text>
              </TouchableOpacity>
            </View>

            {/* Filter Icon - Only show in table mode */}
            {viewMode === "table" && (
              <TouchableOpacity
                style={styles.filterIconButton}
                onPress={() => setShowFilterModal(true)}
                activeOpacity={0.7}
              >
                <Icon name="filter-variant" size={20} color="#FF9800" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Summary Cards - More Compact */}
        {summary && viewMode === "table" && (
          <View style={styles.summarySection}>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <View style={styles.summaryIconContainer}>
                  <Icon name="car-multiple" size={18} color="#FF9800" />
                </View>
                <Text style={styles.summaryValue}>{summary.totalSessions}</Text>
                <Text style={styles.summaryLabel}>Sessions</Text>
              </View>

              <View style={styles.summaryCard}>
                <View
                  style={[
                    styles.summaryIconContainer,
                    { backgroundColor: "#E8F5E9" },
                  ]}
                >
                  <Icon name="cash-multiple" size={18} color="#4CAF50" />
                </View>
                <Text style={styles.summaryValue}>
                  ₹{summary.totalRevenue.toFixed(0)}
                </Text>
                <Text style={styles.summaryLabel}>Revenue</Text>
              </View>

              <View style={styles.summaryCard}>
                <View
                  style={[
                    styles.summaryIconContainer,
                    { backgroundColor: "#E3F2FD" },
                  ]}
                >
                  <Icon name="cash" size={18} color="#2196F3" />
                </View>
                <Text style={styles.summaryValue}>
                  ₹{summary.cashAmount.toFixed(0)}
                </Text>
                <Text style={styles.summaryLabel}>Cash</Text>
              </View>

              <View style={styles.summaryCard}>
                <View
                  style={[
                    styles.summaryIconContainer,
                    { backgroundColor: "#F3E5F5" },
                  ]}
                >
                  <Icon name="contactless-payment" size={18} color="#9C27B0" />
                </View>
                <Text style={styles.summaryValue}>
                  ₹{summary.onlineAmount.toFixed(0)}
                </Text>
                <Text style={styles.summaryLabel}>Online</Text>
              </View>
            </View>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#121211" />
            <Text style={styles.loadingText}>Loading reports...</Text>
          </View>
        ) : sessions.length === 0 || filteredSessions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Icon
                name={
                  search ? "database-search-outline" : "file-document-outline"
                }
                size={48}
                color={search ? "#FF9800" : "#BDBDBD"}
              />
            </View>

            <Text style={styles.emptyTitle}>
              {search ? "No Matches Found" : "No Sessions Yet"}
            </Text>

            <Text style={styles.emptySubtitle}>
              {search
                ? `We couldn't find anything matching "${search}"`
                : "There are no parking sessions recorded for this specific time period."}
            </Text>

            <TouchableOpacity
              style={[
                styles.changeFilterButton,
                search && styles.clearSearchButton,
              ]}
              onPress={() =>
                search
                  ? (setSearch(""), setIsSearching(false))
                  : setShowFilterModal(true)
              }
              activeOpacity={0.8}
            >
              <Icon
                name={search ? "refresh" : "filter-variant"}
                size={18}
                color="#fff"
              />
              <Text style={styles.changeFilterText}>
                {search ? "Reset Search" : "Adjust Filters"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.content}>
            {viewMode === "table" ? (
              <TableView
                sessions={filteredSessions}
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            ) : (
              <ScrollView
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    colors={["#0c0c0b"]}
                    tintColor="#111111"
                  />
                }
              >
                <AnalyticsView tenantId={tenantId} filters={filters} />
              </ScrollView>
            )}
          </View>
        )}

        {/* Export Menu Modal */}
        <Modal
          visible={showExportMenu}
          transparent
          animationType="slide"
          onRequestClose={() => setShowExportMenu(false)}
        >
          <TouchableOpacity
            style={styles.exportModalOverlay}
            activeOpacity={1}
            onPress={() => setShowExportMenu(false)}
          >
            <View style={styles.exportMenuContainer}>
              <View style={styles.exportMenuHeader}>
                <Text style={styles.exportMenuTitle}>Export Report</Text>
                <TouchableOpacity onPress={() => setShowExportMenu(false)}>
                  <Icon name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.exportOption}
                onPress={handleExportExcel}
                disabled={exporting}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.exportIconContainer,
                    { backgroundColor: "#E8F5E9" },
                  ]}
                >
                  <Icon name="microsoft-excel" size={28} color="#4CAF50" />
                </View>
                <View style={styles.exportOptionContent}>
                  <Text style={styles.exportOptionTitle}>Export as Excel</Text>
                  <Text style={styles.exportOptionSubtitle}>
                    Download .xlsx file
                  </Text>
                </View>
                <Icon name="chevron-right" size={24} color="#999" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.exportOption}
                onPress={handleExportPDF}
                disabled={exporting}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.exportIconContainer,
                    { backgroundColor: "#FFEBEE" },
                  ]}
                >
                  <Icon name="file-pdf-box" size={28} color="#F44336" />
                </View>
                <View style={styles.exportOptionContent}>
                  <Text style={styles.exportOptionTitle}>Export as PDF</Text>
                  <Text style={styles.exportOptionSubtitle}>
                    Download .pdf file
                  </Text>
                </View>
                <Icon name="chevron-right" size={24} color="#999" />
              </TouchableOpacity>

              {exporting && (
                <View style={styles.exportingIndicator}>
                  <ActivityIndicator color="#FF9800" size="small" />
                  <Text style={styles.exportingText}>Exporting...</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Filter Modal */}
        <FilterModal
          visible={showFilterModal}
          filters={filters}
          onApply={(newFilters) => {
            setFilters(newFilters);
            setShowFilterModal(false);
          }}
          onClose={() => setShowFilterModal(false)}
        />

        {/* Data Cleanup Modal */}
        <DataCleanupModal
          visible={showCleanupModal}
          tenantId={tenantId}
          onClose={() => setShowCleanupModal(false)}
          onCleanupComplete={loadReportData}
        />
      </View>
    </ScrollView>
  );
};

export default Reports;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 40,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: "#424242",
    fontWeight: "600",
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: "#757575",
    textAlign: "center",
  },
  header: {
    backgroundColor: "#FF9800",
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerTextContainer: {
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    marginTop: 2,
    fontWeight: "400",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },
  viewModeContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  viewModeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  viewModeSelector: {
    flexDirection: "row",
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 3,
    flex: 1,
    marginRight: 12,
  },
  viewModeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  viewModeButtonActive: {
    backgroundColor: "#FF9800",
    elevation: 2,
    shadowColor: "#FF9800",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  viewModeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  viewModeTextActive: {
    color: "#fff",
  },
  filterIconButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#FFF3E0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  summarySection: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FAFAFA",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  summaryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFF3E0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#212121",
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#757575",
    fontWeight: "500",
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: "#757575",
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    marginTop: 20,
    fontSize: 20,
    fontWeight: "600",
    color: "#424242",
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#757575",
    textAlign: "center",
    lineHeight: 20,
  },
  changeFilterButton: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF9800",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    elevation: 3,
    shadowColor: "#FF9800",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  changeFilterText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "600",
  },
  exportModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  exportMenuContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  exportMenuHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    marginBottom: 8,
  },
  exportMenuTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#212121",
  },
  exportOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    gap: 12,
  },
  exportIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  exportOptionContent: {
    flex: 1,
  },
  exportOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212121",
    marginBottom: 3,
  },
  exportOptionSubtitle: {
    fontSize: 13,
    color: "#757575",
  },
  exportingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 12,
  },
  exportingText: {
    fontSize: 14,
    color: "#FF9800",
    fontWeight: "600",
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 16,
    padding: 0,
    fontWeight: "500",
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  clearSearchButton: {
    backgroundColor: "#334155",
  },
});
