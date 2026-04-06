import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { ParkingSession, ReportSummary, ReportFilters } from '../types/reports';

interface ExcelExportOptions {
  sessions: ParkingSession[];
  summary: ReportSummary;
  filters: ReportFilters;
  fileName?: string;
}

export const exportToExcel = async ({
  sessions,
  summary,
  filters,
  fileName,
}: ExcelExportOptions): Promise<void> => {
  try {
    /* -------------------- Workbook -------------------- */
    const workbook = XLSX.utils.book_new();

    /* -------------------- Sessions Sheet -------------------- */
    const sessionRows = sessions.map((s, index) => {
      const start = s.start_time ? new Date(s.start_time) : null;
      const end = s.end_time ? new Date(s.end_time) : null;

      let duration = '-';
      if (start && end) {
        const diff = end.getTime() - start.getTime();
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        duration = `${h}h ${m}m`;
      }

      return {
        'S.No': index + 1,
        Date: start ? formatDate(start) : '-',
        'QR ID': s.qr_id ?? '-',
        'Vehicle Type': s.vehicle_type ?? '-',
        'Vehicle Number / Name': s.vehicle_number ?? '-',
        'In Time': start ? formatDateTime(start) : '-',
        'Out Time': end ? formatDateTime(end) : '-',
        Duration: duration,
        'Payment Type': s.payment_type ?? '-',
        'Amount (₹)': s.total_amount ?? 0,
      };
    });

    const sessionSheet = XLSX.utils.json_to_sheet(sessionRows);
    sessionSheet['!cols'] = [
      { wch: 6 },
      { wch: 12 },
      { wch: 18 },
      { wch: 14 },
      { wch: 16 },
      { wch: 20 },
      { wch: 18 },
      { wch: 18 },
      { wch: 12 },
      { wch: 14 },
      { wch: 10 },
    ];

    XLSX.utils.book_append_sheet(workbook, sessionSheet, 'Parking Sessions');

    /* -------------------- Summary Sheet -------------------- */
    const summarySheet = XLSX.utils.json_to_sheet([
      { Metric: 'Report Period', Value: `${formatDate(filters.startDate)} to ${formatDate(filters.endDate)}` },
      { Metric: '', Value: '' },
      { Metric: 'Total Sessions', Value: summary.totalSessions },
      { Metric: 'Total Revenue', Value: `₹${summary.totalRevenue.toFixed(2)}` },
      { Metric: 'Cash Payments', Value: `₹${summary.cashAmount.toFixed(2)}` },
      { Metric: 'Online Payments', Value: `₹${summary.onlineAmount.toFixed(2)}` },
      { Metric: '', Value: '' },
      { Metric: 'Cars', Value: summary.vehicleBreakdown.Car },
      { Metric: 'Bikes', Value: summary.vehicleBreakdown.Bike },
      { Metric: 'EVs', Value: summary.vehicleBreakdown.EV },
      { Metric: 'Autos', Value: summary.vehicleBreakdown.AUTO },
      { Metric: 'Avg Duration', Value: `${Math.round(summary.averageSessionDuration)} min` },
    ]);

    summarySheet['!cols'] = [{ wch: 26 }, { wch: 26 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    /* -------------------- Write File -------------------- */
    const base64 = XLSX.write(workbook, {
      type: 'base64',
      bookType: 'xlsx',
    });

    const outputFileName =
      fileName ?? `parking_report_${formatDateForFile(new Date())}.xlsx`;

    const fileUri = `${FileSystem.documentDirectory}${outputFileName}`;

    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    /* -------------------- Share -------------------- */
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Export Parking Report',
        UTI: 'com.microsoft.excel.xlsx',
      });
    }
  } catch (error) {
    console.error('Excel export failed:', error);
    throw error;
  }
};

/* -------------------- Helpers -------------------- */
const formatDate = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}-${String(
    d.getMonth() + 1
  ).padStart(2, '0')}-${d.getFullYear()}`;

const formatDateTime = (d: Date) => {
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${formatDate(d)} ${h % 12 || 12}:${m} ${ap}`;
};

const formatDateForFile = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(
    d.getDate()
  ).padStart(2, '0')}`;
