export interface ParkingSession {
  id: string;
  qr_id: string;
  vehicle_type: string | null;
  vehicle_number: string | null;
  person_name: string | null;
  start_time: string | null;
  end_time: string | null;
  status: 'ACTIVE' | 'COMPLETED';
  payment_type: string | null;
  total_amount: number | null; 
  tenant_id: string;
  payment_info?: {
    payments?: {
      type: 'cash' | 'upi';
      amount: number;
    }[];
    return_cash?: number;
    original_amount?: number;
  };
  is_amount_edited?: boolean;
}

export interface ReportFilters {
  startDate: Date;
  endDate: Date;
  vehicleType: VehicleType;
  paymentType: PaymentType;
  status: SessionStatus;
}

export type VehicleType = 'ALL' | 'Car' | 'Bike' | 'EV' | 'Auto';
export type PaymentType = 'ALL' | 'cash' | 'online';
export type SessionStatus = 'ALL' | 'COMPLETED' | 'ACTIVE';

export interface ReportSummary {
  totalSessions: number;
  totalRevenue: number;
  cashAmount: number;
  onlineAmount: number;
  vehicleBreakdown: VehicleBreakdown;
  averageSessionDuration: number;
}

export interface VehicleBreakdown {
  Car: number;
  Bike: number;
  EV: number;
  Auto: number;
}

export interface DailyRevenue {
  date: string;
  cash: number;
  online: number;
  total: number;
}

export interface HourlyTraffic {
  hour: number;
  count: number;
}

export interface AnalyticsData {
  dailyRevenue: DailyRevenue[];
  vehicleDistribution: { label: string; value: number; color: string }[];
  hourlyTraffic: HourlyTraffic[];
  paymentSplit: { label: string; value: number; color: string }[];
  summary: ReportSummary;
}

export interface ExportData {
  sessions: ParkingSession[];
  summary: ReportSummary;
  filters: ReportFilters;
  generatedAt: string;
}

export interface DeleteOptions {
  startDate?: string | Date;
  endDate?: string | Date;
  olderThanDays?: number;
  status: string;
  dryRun: boolean;
}


export interface DeleteResult {
  deletedCount: number;
  remainingCount: number;
  spaceFreed: number;
}

export interface MonthlyDailyRow {
  sNo: number;
  dateStr: string;
  rawDate: string;
  vehiclesIn: number;
  vehiclesOut: number;
  cash: number;
  upi: number;
  total: number;
}

export interface MonthlyReportData {
  monthName: string;
  startDate: Date;
  endDate: Date;
  generatedAt: Date;
  summary: ReportSummary;
  dailyRows: MonthlyDailyRow[];
  monthTotal: {
    totalIn: number;
    totalOut: number;
    totalCash: number;
    totalUpi: number;
    grandTotal: number;
  };
}