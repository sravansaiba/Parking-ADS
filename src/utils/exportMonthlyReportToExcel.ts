import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { MonthlyReportData } from '../types/reports';

export const exportMonthlyReportToExcel = async (
  reportData: MonthlyReportData
): Promise<void> => {
  try {
    const workbook = XLSX.utils.book_new();

    /* -------------------- Daily Breakdown Sheet -------------------- */
    const dailyRows = reportData.dailyRows.map((r) => ({
      'S.No.': r.sNo,
      Date: r.dateStr,
      'Vehicles In': r.vehiclesIn,
      'Vehicles Out': r.vehiclesOut,
      'Cash (₹)': r.cash,
      'UPI (₹)': r.upi,
      'Total (₹)': r.total,
    }));

    // Add Month Total footer row
    dailyRows.push({
      'S.No.': 0 as any,
      Date: 'MONTH TOTAL',
      'Vehicles In': reportData.monthTotal.totalIn,
      'Vehicles Out': reportData.monthTotal.totalOut,
      'Cash (₹)': reportData.monthTotal.totalCash,
      'UPI (₹)': reportData.monthTotal.totalUpi,
      'Total (₹)': reportData.monthTotal.grandTotal,
    });

    const dailySheet = XLSX.utils.json_to_sheet(dailyRows);
    dailySheet['!cols'] = [
      { wch: 8 },
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      dailySheet,
      'Monthly Daily Report'
    );

    /* -------------------- Summary Sheet -------------------- */
    const summaryRows: any[] = [
      { Metric: 'Month', Value: reportData.monthName },
      { Metric: 'Report Generated On', Value: new Date().toLocaleString() },
      { Metric: '', Value: '' },
      { Metric: 'Total Sessions', Value: reportData.summary.totalSessions },
      { Metric: 'Total Revenue (₹)', Value: reportData.monthTotal.grandTotal },
      { Metric: 'Cash Payments (₹)', Value: reportData.monthTotal.totalCash },
      { Metric: 'Online Payments (₹)', Value: reportData.monthTotal.totalUpi },
      { Metric: '', Value: '' },
      { Metric: 'Cars', Value: reportData.summary.vehicleBreakdown.Car || 0 },
      { Metric: 'Bikes', Value: reportData.summary.vehicleBreakdown.Bike || 0 },
      { Metric: 'EVs', Value: reportData.summary.vehicleBreakdown.EV || 0 },
      { Metric: 'Autos', Value: reportData.summary.vehicleBreakdown.Auto || 0 },
    ];

    const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
    summarySheet['!cols'] = [{ wch: 24 }, { wch: 24 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    /* -------------------- Write & Share File -------------------- */
    const base64 = XLSX.write(workbook, {
      type: 'base64',
      bookType: 'xlsx',
    });

    const safeMonth = reportData.monthName.replace(/\s+/g, '_').toLowerCase();
    const outputFileName = `parking_monthly_report_${safeMonth}.xlsx`;
    const fileUri = `${FileSystem.documentDirectory}${outputFileName}`;

    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: `Parking Report - ${reportData.monthName}`,
        UTI: 'com.microsoft.excel.xlsx',
      });
    }
  } catch (error) {
    console.error('Excel monthly export failed:', error);
    throw error;
  }
};
