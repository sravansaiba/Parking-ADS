import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { ParkingSession, ReportSummary, ReportFilters } from '../types/reports';

interface PDFExportOptions {
  sessions: ParkingSession[];
  summary: ReportSummary;
  filters: ReportFilters;
  fileName?: string;
}

export const exportToPDF = async (options: PDFExportOptions): Promise<void> => {
  try {
    const { sessions, summary, filters, fileName } = options;

    // Generate HTML content
    const htmlContent = generateHTMLReport(sessions, summary, filters);

    // Generate PDF using expo-print
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    // Share PDF
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Export Parking Report',
        UTI: 'com.adobe.pdf',
      });
    } else {
      console.log('PDF saved at:', uri);
      throw new Error('Sharing is not available on this device');
    }
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw error;
  }
};

const generateHTMLReport = (
  sessions: ParkingSession[],
  summary: ReportSummary,
  filters: ReportFilters
): string => {
  const sessionRows = sessions
    .map((session, index) => {
      const startTime = session.start_time ? new Date(session.start_time) : null;
      const endTime = session.end_time ? new Date(session.end_time) : null;

      // Calculate duration
      let duration = '-';
      if (startTime && endTime) {
        const diffMs = endTime.getTime() - startTime.getTime();
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        duration =
          days > 0 ? `${days}d ${hours}h ${minutes}m` : `${hours}h ${minutes}m`;
      }

      return `
        <tr>
          <td>${index + 1}</td>
          <td>${startTime ? formatDate(startTime) : '-'}</td>
          <td>${session.qr_id || '-'}</td>
          <td>${session.vehicle_type || '-'}</td>
          <td>${session.vehicle_number || '-'}</td>
          <td>${startTime ? formatDateTime(startTime) : '-'}</td>
          <td>${endTime ? formatDateTime(endTime) : '-'}</td>
          <td>${duration}</td>
          <td>${session.payment_type || '-'}</td>
          <td>₹${session.total_amount || '0'}</td>
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
      <title>Parking Report</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          color: #333;
        }
        
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #2196F3;
          padding-bottom: 15px;
        }
        
        .header h1 {
          color: #2196F3;
          font-size: 24px;
          margin-bottom: 10px;
        }
        
        .header p {
          color: #666;
          font-size: 14px;
        }
        
        .summary {
          background: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
          margin-bottom: 20px;
        }
        
        .summary h2 {
          margin-bottom: 15px;
          font-size: 18px;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-bottom: 15px;
        }
        
        .summary-item {
          padding: 8px;
          background: white;
          border-radius: 3px;
        }
        
        .summary-label {
          font-size: 12px;
          color: #666;
          margin-bottom: 3px;
        }
        
        .summary-value {
          font-size: 16px;
          font-weight: bold;
          color: #2196F3;
        }
        
        .vehicle-breakdown {
          padding: 10px;
          background: white;
          border-radius: 3px;
        }
        
        .vehicle-breakdown-label {
          font-size: 12px;
          color: #666;
          margin-bottom: 5px;
        }
        
        .vehicle-breakdown-value {
          font-size: 14px;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 9px;
        }
        
        th {
          background: #2196F3;
          color: white;
          padding: 8px 4px;
          text-align: left;
          font-weight: bold;
          font-size: 10px;
        }
        
        td {
          padding: 6px 4px;
          border-bottom: 1px solid #ddd;
        }
        
        tr:nth-child(even) {
          background: #f9f9f9;
        }
        
        .footer {
          margin-top: 30px;
          text-align: center;
          font-size: 12px;
          color: #666;
          border-top: 1px solid #ddd;
          padding-top: 15px;
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
        <h1>Parking Report</h1>
        <p>Period: ${formatDate(filters.startDate)} to ${formatDate(filters.endDate)}</p>
        <p>Generated on: ${formatDateTime(new Date())}</p>
      </div>
      
      <div class="summary">
        <h2>Summary</h2>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-label">Total Sessions</div>
            <div class="summary-value">${summary.totalSessions}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Total Revenue</div>
            <div class="summary-value">₹${summary.totalRevenue.toFixed(2)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Cash Payments</div>
            <div class="summary-value">₹${summary.cashAmount.toFixed(2)}</div>
          </div>
          <div class="summary-item">
            <div class="summary-label">Online Payments</div>
            <div class="summary-value">₹${summary.onlineAmount.toFixed(2)}</div>
          </div>
        </div>
        <div class="vehicle-breakdown">
          <div class="vehicle-breakdown-label">Vehicle Distribution</div>
          <div class="vehicle-breakdown-value">
            Cars: <strong>${summary.vehicleBreakdown.Car}</strong> | 
            Bikes: <strong>${summary.vehicleBreakdown.Bike}</strong> | 
            EVs: <strong>${summary.vehicleBreakdown.EV}</strong> | 
            Autos: <strong>${summary.vehicleBreakdown.Auto}</strong> |
          </div>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>S.No</th>
            <th>Date</th>
            <th>QR ID</th>
            <th>Vehicle</th>
            <th>Number / Name </th>
            <th>In Time</th>
            <th>Out Time</th>
            <th>Duration</th>
            <th>Payment</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          ${sessionRows}
        </tbody>
      </table>
      
      <div class="footer">
        <p>This is a computer-generated report. No signature required.</p>
        <p>Average Session Duration: ${Math.round(summary.averageSessionDuration)} minutes</p>
      </div>
    </body>
    </html>
  `;
};

// Helper functions
const formatDate = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

const formatDateTime = (date: Date): string => {
  const formattedDate = formatDate(date);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${formattedDate} ${displayHours}:${minutes} ${ampm}`;
};

const formatDateForFile = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${year}${month}${day}`;
};