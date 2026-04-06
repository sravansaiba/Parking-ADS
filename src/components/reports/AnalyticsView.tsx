import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BarChart, PieChart, LineChart } from 'react-native-gifted-charts';
import { reportsApi } from '../../api/reports/api';
import { ReportFilters, AnalyticsData } from '../../types/reports';

interface AnalyticsViewProps {
  tenantId: string;
  filters: ReportFilters;
}

const { width } = Dimensions.get('window');
const chartWidth = width - 64;

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ tenantId, filters }) => {
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    loadAnalyticsData();
  }, [filters]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const data = await reportsApi.getAnalyticsData(tenantId, filters);
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#080808" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (!analyticsData) {
    return (
      <View style={styles.emptyContainer}>
        <Icon name="chart-line" size={80} color="#BDBDBD" />
        <Text style={styles.emptyTitle}>No Analytics Data</Text>
        <Text style={styles.emptySubtitle}>
          No data available for the selected period
        </Text>
      </View>
    );
  }

  const { dailyRevenue, vehicleDistribution, hourlyTraffic, paymentSplit, summary } = analyticsData;

  // Prepare chart data
  const dailyRevenueChartData = dailyRevenue.map((day) => ({
    value: day.total,
    label: new Date(day.date).getDate().toString(),
    frontColor: '#FF9800',
    gradientColor: '#FFB74D',
    topLabelComponent: () => (
      <Text style={styles.chartTopLabel}>₹{day.total.toFixed(0)}</Text>
    ),
  }));

  const hourlyTrafficData = hourlyTraffic
    .filter((h) => h.count > 0)
    .map((hour) => ({
      value: hour.count,
      label: `${hour.hour}h`,
      dataPointText: hour.count.toString(),
    }));

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Key Metrics */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconContainer}>
            <Icon name="gauge" size={20} color="#FF9800" />
          </View>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
        </View>
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { backgroundColor: '#FFF3E0' }]}>
            <View style={styles.metricIconContainer}>
              <Icon name="car-multiple" size={24} color="#FF9800" />
            </View>
            <Text style={styles.metricValue}>{summary.totalSessions}</Text>
            <Text style={[styles.metricLabel, { paddingLeft: 10 }]}>Sessions</Text>
          </View>
          
          <View style={[styles.metricCard, { backgroundColor: '#E8F5E9' }]}>
            <View style={[styles.metricIconContainer, { backgroundColor: '#C8E6C9' }]}>
              <Icon name="cash-multiple" size={24} color="#4CAF50" />
            </View>
            <Text style={[styles.metricValue, { color: '#4CAF50' }]}>
              ₹{summary.totalRevenue.toFixed(0)}
            </Text>
            <Text style={[styles.metricLabel, { paddingLeft: 10 }]}>Revenue</Text>
          </View>
          
          <View style={[styles.metricCard, { backgroundColor: '#E3F2FD' }]}>
            <View style={[styles.metricIconContainer, { backgroundColor: '#BBDEFB' }]}>
              <Icon name="clock-outline" size={24} color="#2196F3" />
            </View>
            <Text style={[styles.metricValue, { color: '#2196F3' }]}>
              {Math.round(summary.averageSessionDuration)}m
            </Text>
            <Text style={[styles.metricLabel, { paddingLeft: 10 }]}>Avg Duration</Text>
          </View>
          
          <View style={[styles.metricCard, { backgroundColor: '#F3E5F5' }]}>
            <View style={[styles.metricIconContainer, { backgroundColor: '#E1BEE7' }]}>
              <Icon name="chart-line" size={24} color="#9C27B0" />
            </View>
            <Text style={[styles.metricValue, { color: '#9C27B0' }]}>
              ₹{(summary.totalRevenue / summary.totalSessions || 0).toFixed(0)}
            </Text>
            <Text style={[styles.metricLabel, { paddingLeft: 10 }]}>Avg Revenue</Text>
          </View>
        </View>
      </View>

      {/* Daily Revenue Chart */}
      {dailyRevenueChartData.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Icon name="chart-bar" size={20} color="#FF9800" />
            </View>
            <Text style={styles.sectionTitle}>Daily Revenue Trend</Text>
          </View>
          <View style={styles.chartContainer}>
            <BarChart
              data={dailyRevenueChartData}
              width={chartWidth}
              height={220}
              barWidth={28}
              spacing={16}
              roundedTop
              roundedBottom
              xAxisThickness={1}
              yAxisThickness={1}
              yAxisTextStyle={styles.axisLabel}
              xAxisLabelTextStyle={styles.axisLabel}
              noOfSections={4}
              maxValue={Math.max(...dailyRevenue.map((d) => d.total)) * 1.1}
              isAnimated
              animationDuration={800}
              barBorderRadius={4}
            />
          </View>
          <View style={styles.chartCaption}>
            <Icon name="information-outline" size={14} color="#9E9E9E" />
            <Text style={styles.chartCaptionText}>
              Daily revenue breakdown for selected period
            </Text>
          </View>
        </View>
      )}

      {/* Vehicle Distribution */}
      {vehicleDistribution.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Icon name="car-side" size={20} color="#FF9800" />
            </View>
            <Text style={styles.sectionTitle}>Vehicle Distribution</Text>
          </View>
          <View style={styles.chartContainer}>
            <PieChart
              data={vehicleDistribution}
              donut
              radius={110}
              innerRadius={70}
              innerCircleColor="#FAFAFA"
              centerLabelComponent={() => (
                <View style={styles.pieCenter}>
                  <Text style={styles.pieCenterValue}>{summary.totalSessions}</Text>
                  <Text style={styles.pieCenterLabel}>Vehicles</Text>
                </View>
              )}
            />
          </View>
          <View style={styles.legendContainer}>
            {vehicleDistribution.map((item, index) => (
              <View key={index} style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>{item.label}</Text>
                <View style={styles.legendBadge}>
                  <Text style={styles.legendBadgeText}>
                    {item.value} ({((item.value / summary.totalSessions) * 100).toFixed(1)}%)
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Payment Split */}
      {paymentSplit.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Icon name="credit-card-outline" size={20} color="#FF9800" />
            </View>
            <Text style={styles.sectionTitle}>Payment Methods</Text>
          </View>
          <View style={styles.chartContainer}>
            <PieChart
              data={paymentSplit}
              radius={110}
              innerRadius={70}
              innerCircleColor="#FAFAFA"
              donut
              centerLabelComponent={() => (
                <View style={styles.pieCenter}>
                  <Text style={styles.pieCenterValue}>
                    ₹{(summary.totalRevenue / 1000).toFixed(1)}K
                  </Text>
                  <Text style={styles.pieCenterLabel}>Total</Text>
                </View>
              )}
            />
          </View>
          <View style={styles.legendContainer}>
            {paymentSplit.map((item, index) => (
              <View key={index} style={styles.legendItem}>
                <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                <Text style={styles.legendText}>{item.label}</Text>
                <View style={styles.legendBadge}>
                  <Text style={styles.legendBadgeText}>
                    ₹{item.value.toFixed(0)} ({((item.value / summary.totalRevenue) * 100).toFixed(1)}%)
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Hourly Traffic */}
      {hourlyTrafficData.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Icon name="clock-time-four-outline" size={20} color="#FF9800" />
            </View>
            <Text style={styles.sectionTitle}>Hourly Traffic Pattern</Text>
          </View>
          <View style={styles.chartContainer}>
            <LineChart
              data={hourlyTrafficData}
              width={chartWidth}
              height={200}
              spacing={45}
              thickness={3}
              color="#FF9800"
              dataPointsColor="#FF6F00"
              dataPointsRadius={5}
              textShiftY={-8}
              textShiftX={-5}
              textFontSize={10}
              xAxisThickness={1}
              yAxisThickness={1}
              yAxisTextStyle={styles.axisLabel}
              xAxisLabelTextStyle={styles.axisLabel}
              curved
              isAnimated
              animationDuration={800}
              areaChart
              startFillColor="#FF9800"
              startOpacity={0.3}
              endOpacity={0.1}
            />
          </View>
          <View style={styles.chartCaption}>
            <Icon name="information-outline" size={14} color="#9E9E9E" />
            <Text style={styles.chartCaptionText}>
              Peak traffic hours throughout the day
            </Text>
          </View>
        </View>
      )}

      {/* Detailed Breakdown */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIconContainer}>
            <Icon name="table" size={20} color="#FF9800" />
          </View>
          <Text style={styles.sectionTitle}>Detailed Breakdown</Text>
        </View>
        
        <View style={styles.breakdownSection}>
          <Text style={styles.breakdownSectionTitle}>Vehicle Types</Text>
          <View style={styles.breakdownTable}>
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownLeft}>
                <Icon name="car" size={18} color="#FF9800" />
                <Text style={styles.breakdownLabel}>Cars</Text>
              </View>
              <Text style={styles.breakdownValue}>{summary.vehicleBreakdown.Car}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownLeft}>
                <Icon name="motorbike" size={18} color="#FF9800" />
                <Text style={styles.breakdownLabel}>Bikes</Text>
              </View>
              <Text style={styles.breakdownValue}>{summary.vehicleBreakdown.Bike}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownLeft}>
                <Icon name="ev-station" size={18} color="#4CAF50" />
                <Text style={styles.breakdownLabel}>EVs</Text>
              </View>
              <Text style={styles.breakdownValue}>{summary.vehicleBreakdown.EV}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownLeft}>
                <Icon name="rickshaw" size={18} color="#0EA5E9" />
                <Text style={styles.breakdownLabel}>Autos</Text>
              </View>
              <Text style={styles.breakdownValue}>{summary.vehicleBreakdown.AUTO}</Text>
            </View>
          </View>
        </View>

        <View style={styles.breakdownSection}>
          <Text style={styles.breakdownSectionTitle}>Payment Summary</Text>
          <View style={styles.breakdownTable}>
            <View style={[styles.breakdownRow, styles.breakdownHighlight]}>
              <View style={styles.breakdownLeft}>
                <Icon name="cash" size={18} color="#4CAF50" />
                <Text style={styles.breakdownLabelBold}>Cash Payments</Text>
              </View>
              <Text style={styles.breakdownValueBold}>
                ₹{summary.cashAmount.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.breakdownRow, styles.breakdownHighlight]}>
              <View style={styles.breakdownLeft}>
                <Icon name="contactless-payment" size={18} color="#9C27B0" />
                <Text style={styles.breakdownLabelBold}>Online Payments</Text>
              </View>
              <Text style={styles.breakdownValueBold}>
                ₹{summary.onlineAmount.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#757575',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    marginTop: 20,
    fontSize: 20,
    fontWeight: '600',
    color: '#424242',
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  sectionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
    flex: 1,
  },
  
  metricsGrid: {
    gap: 10,
  },
  metricCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 0,
  },
  metricIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFE0B2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  metricContent: {
    flex: 1,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF9800',
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 11,
    color: '#757575',
    fontWeight: '500',
  },
  chartContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  chartTopLabel: {
    fontSize: 10,
    color: '#757575',
    fontWeight: '600',
  },
  axisLabel: {
    fontSize: 10,
    color: '#9E9E9E',
  },
  chartCaption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    gap: 6,
  },
  chartCaptionText: {
    fontSize: 12,
    color: '#9E9E9E',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  pieCenter: {
    alignItems: 'center',
  },
  pieCenterValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212121',
  },
  pieCenterLabel: {
    fontSize: 12,
    color: '#757575',
    fontWeight: '500',
    marginTop: 2,
  },
  legendContainer: {
    marginTop: 24,
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#FAFAFA',
    padding: 12,
    borderRadius: 8,
  },
  legendColor: {
    width: 20,
    height: 20,
    borderRadius: 6,
    marginRight: 12,
  },
  legendText: {
    fontSize: 14,
    color: '#424242',
    fontWeight: '500',
    flex: 1,
  },
  legendBadge: {
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  legendBadgeText: {
    fontSize: 12,
    color: '#424242',
    fontWeight: '600',
  },
  breakdownSection: {
    marginTop: 16,
  },
  breakdownSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  breakdownTable: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  breakdownHighlight: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    borderBottomWidth: 0,
    marginVertical: 4,
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#616161',
    fontWeight: '500',
  },
  breakdownLabelBold: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#424242',
  },
  breakdownValueBold: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
  },
  bottomPadding: {
    height: 24,
  },
});

export default AnalyticsView;