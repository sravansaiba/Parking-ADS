import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { MonthlyReportData } from '../types/reports';

export const exportMonthlyReportToPDF = async (
  reportData: MonthlyReportData
): Promise<void> => {
  try {
    const htmlContent = generateMonthlyHTMLReport(reportData);

    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    const safeMonth = reportData.monthName.replace(/\s+/g, '_').toLowerCase();
    const targetFileName = `parking_monthly_report_${safeMonth}.pdf`;
    const targetUri = `${FileSystem.documentDirectory}${targetFileName}`;

    await FileSystem.copyAsync({
      from: uri,
      to: targetUri,
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(targetUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Parking Report - ${reportData.monthName}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      console.log('PDF saved at:', targetUri);
      throw new Error('Sharing is not available on this device');
    }
  } catch (error) {
    console.error('Error exporting monthly report to PDF:', error);
    throw error;
  }
};

const formatCurrency = (amount: number): string => {
  return '₹' + Number(amount || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });
};

const formatCurrencyWithDecimals = (amount: number): string => {
  return '₹' + Number(amount || 0).toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });
};

const formatDate = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const formatDateTime = (date: Date): string => {
  const formattedDate = formatDate(date);
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const hourStr = String(hours).padStart(2, '0');
  return `${formattedDate} ${hourStr}:${minutes} ${ampm}`;
};

const generateMonthlyHTMLReport = (report: MonthlyReportData): string => {
  const {
    monthName,
    startDate,
    endDate,
    generatedAt,
    summary,
    dailyRows,
    monthTotal,
  } = report;

  const rowsHTML = dailyRows
    .map((row) => {
      return `
        <tr>
          <td style="text-align: center;">${row.sNo}.</td>
          <td style="text-align: center;">${row.dateStr}</td>
          <td style="text-align: center;">${row.vehiclesIn}</td>
          <td style="text-align: center;">${row.vehiclesOut}</td>
          <td style="text-align: right; padding-right: 14px;">${formatCurrency(row.cash)}</td>
          <td style="text-align: right; padding-right: 14px;">${formatCurrency(row.upi)}</td>
          <td style="text-align: right; padding-right: 14px; font-weight: 600;">${formatCurrency(row.total)}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Parking Report - ${monthName}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        body {
          background-color: #ffffff;
          padding: 24px;
          color: #1e293b;
        }

        .header {
          text-align: center;
          padding-bottom: 12px;
          border-bottom: 3px solid #0284c7;
          margin-bottom: 20px;
        }

        .header h1 {
          font-size: 26px;
          font-weight: 800;
          color: #0369a1;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
          text-transform: uppercase;
        }

        .header p {
          font-size: 13px;
          font-weight: 600;
          color: #334155;
          margin-bottom: 4px;
        }

        .header .sub-date {
          font-size: 12px;
          font-weight: 500;
          color: #64748b;
        }

        .section-title {
          font-size: 15px;
          font-weight: 800;
          color: #0284c7;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 14px;
        }

        .summary-card {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .icon-box {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: bold;
          flex-shrink: 0;
        }

        .icon-blue { background-color: #e0f2fe; color: #0284c7; }
        .icon-green { background-color: #dcfce7; color: #16a34a; }
        .icon-cyan { background-color: #cffafe; color: #0891b2; }
        .icon-purple { background-color: #f3e8ff; color: #9333ea; }
        .icon-orange { background-color: #ffedd5; color: #ea580c; }

        .card-info {
          display: flex;
          flex-direction: column;
        }

        .card-label {
          font-size: 12px;
          color: #64748b;
          font-weight: 600;
          margin-bottom: 2px;
        }

        .card-val-blue { font-size: 20px; font-weight: 800; color: #0369a1; }
        .card-val-green { font-size: 20px; font-weight: 800; color: #16a34a; }
        .card-val-cyan { font-size: 20px; font-weight: 800; color: #0284c7; }
        .card-val-purple { font-size: 20px; font-weight: 800; color: #9333ea; }

        .vehicle-bar {
          background-color: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 24px;
        }

        .vehicle-text {
          font-size: 13px;
          color: #334155;
          font-weight: 500;
        }

        .vehicle-title {
          font-size: 13px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 2px;
        }

        .table-banner {
          background-color: #ea580c;
          color: #ffffff;
          padding: 10px 16px;
          border-radius: 8px 8px 0 0;
          text-align: center;
          font-weight: 800;
          font-size: 14px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          border-left: 1px solid #e2e8f0;
          border-right: 1px solid #e2e8f0;
        }

        th {
          background-color: #0284c7;
          color: #ffffff;
          font-size: 12px;
          font-weight: 700;
          padding: 10px 8px;
          text-align: center;
          border-right: 1px solid rgba(255,255,255,0.2);
        }

        th:last-child {
          border-right: none;
        }

        td {
          padding: 8px 8px;
          font-size: 12px;
          color: #1e293b;
          border-bottom: 1px solid #e2e8f0;
          border-right: 1px solid #f1f5f9;
        }

        td:last-child {
          border-right: none;
        }

        tr:nth-child(even) {
          background-color: #f8fafc;
        }

        .footer-row {
          background-color: #ea580c !important;
          color: #ffffff !important;
          font-weight: 800;
        }

        .footer-row td {
          color: #ffffff !important;
          padding: 12px 8px;
          font-size: 13px;
          font-weight: 800;
          border-bottom: none;
          border-right: 1px solid rgba(255,255,255,0.25);
        }

        .footer-row td:last-child {
          border-right: none;
        }

        .footer-note {
          text-align: center;
          margin-top: 16px;
          font-size: 11px;
          color: #94a3b8;
          font-style: italic;
        }

        @media print {
          body {
            padding: 10px;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>PARKING REPORT</h1>
        <p>Period: ${formatDate(startDate)} to ${formatDate(endDate)}</p>
        <div class="sub-date">Generated on: ${formatDateTime(generatedAt)}</div>
      </div>

      <div class="section-title">SUMMARY</div>

      <div class="summary-grid">
        <div class="summary-card">
          <div class="icon-box icon-blue">🅿</div>
          <div class="card-info">
            <span class="card-label">Total Sessions</span>
            <span class="card-val-blue">${summary.totalSessions}</span>
          </div>
        </div>

        <div class="summary-card">
          <div class="icon-box icon-green">₹</div>
          <div class="card-info">
            <span class="card-label">Total Revenue</span>
            <span class="card-val-green">${formatCurrencyWithDecimals(monthTotal.grandTotal)}</span>
          </div>
        </div>

        <div class="summary-card">
          <div class="icon-box icon-cyan">💵</div>
          <div class="card-info">
            <span class="card-label">Cash Payments</span>
            <span class="card-val-cyan">${formatCurrencyWithDecimals(monthTotal.totalCash)}</span>
          </div>
        </div>

        <div class="summary-card">
          <div class="icon-box icon-purple">📱</div>
          <div class="card-info">
            <span class="card-label">Online Payments</span>
            <span class="card-val-purple">${formatCurrencyWithDecimals(monthTotal.totalUpi)}</span>
          </div>
        </div>
      </div>

      <div class="vehicle-bar">
        <div class="icon-box icon-orange">🚗</div>
        <div class="card-info">
          <div class="vehicle-title">Vehicle Statistics</div>
          <div class="vehicle-text">
            Cars: <b>${summary.vehicleBreakdown.Car || 0}</b> &nbsp;|&nbsp; 
            Bikes: <b>${summary.vehicleBreakdown.Bike || 0}</b> &nbsp;|&nbsp; 
            EVs: <b>${summary.vehicleBreakdown.EV || 0}</b> &nbsp;|&nbsp; 
            Autos: <b>${summary.vehicleBreakdown.Auto || 0}</b>
          </div>
        </div>
      </div>

      <div class="table-banner">
        PARKING DAILY REPORT &mdash; ${monthName.toUpperCase()}
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 7%;">S.No.</th>
            <th style="width: 22%;">Date</th>
            <th style="width: 14%;">Vehicles In</th>
            <th style="width: 15%;">Vehicles Out</th>
            <th style="width: 14%;">Cash (₹)</th>
            <th style="width: 14%;">UPI (₹)</th>
            <th style="width: 14%;">Total (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHTML}
          <tr class="footer-row">
            <td colspan="2" style="text-align: center; font-size: 13px;">MONTH TOTAL</td>
            <td style="text-align: center;">${monthTotal.totalIn}</td>
            <td style="text-align: center;">${monthTotal.totalOut}</td>
            <td style="text-align: right; padding-right: 14px;">${formatCurrency(monthTotal.totalCash)}</td>
            <td style="text-align: right; padding-right: 14px;">${formatCurrency(monthTotal.totalUpi)}</td>
            <td style="text-align: right; padding-right: 14px;">${formatCurrency(monthTotal.grandTotal)}</td>
          </tr>
        </tbody>
      </table>

      <div class="footer-note">
        Note: Computer-generated summary report.
      </div>
    </body>
    </html>
  `;
};
