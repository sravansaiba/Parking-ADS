// import { supabase } from '../../services/supabase';
// import {
//   ParkingSession,
//   ReportFilters,
//   ReportSummary,
//   VehicleBreakdown,
//   AnalyticsData,
//   DailyRevenue,
//   HourlyTraffic,
//   DeleteOptions,
//   DeleteResult,
// } from '../../types/reports';

// export const reportsApi = {
//   /**
//    * Get parking sessions with filters
//    */
//   getSessions: async (
//     tenantId: string,
//     filters: ReportFilters
//   ): Promise<ParkingSession[]> => {
//     try {
//       let query = supabase
//         .from('parking_sessions')
//         .select('*')
//         .eq('tenant_id', tenantId)
//         .gte('start_time', filters.startDate.toISOString())
//         .lte('start_time', filters.endDate.toISOString())
//         .order('start_time', { ascending: false });

//       // Apply status filter
//       if (filters.status !== 'ALL') {
//         query = query.eq('status', filters.status);
//       }

//       // Apply vehicle type filter
//       if (filters.vehicleType !== 'ALL') {
//         query = query.eq('vehicle_type', filters.vehicleType);
//       }

//       // Apply payment type filter
//       if (filters.paymentType !== 'ALL') {
//         query = query.eq('payment_type', filters.paymentType);
//       }

//       const { data, error } = await query;

//       if (error) throw error;
//       return data || [];
//     } catch (error) {
//       console.error('Error fetching sessions:', error);
//       throw error;
//     }
//   },

//   /**
//    * Get completed sessions for reports (excludes ACTIVE)
//    */
//   getCompletedSessions: async (
//     tenantId: string,
//     filters: ReportFilters
//   ): Promise<ParkingSession[]> => {
//     try {
//       let query = supabase
//         .from('parking_sessions')
//         .select('*')
//         .eq('tenant_id', tenantId)
//         .eq('status', 'COMPLETED')
//         .gte('start_time', filters.startDate.toISOString())
//         .lte('start_time', filters.endDate.toISOString())
//         .order('start_time', { ascending: false });

//       if (filters.vehicleType !== 'ALL') {
//         query = query.eq('vehicle_type', filters.vehicleType);
//       }

//       if (filters.paymentType !== 'ALL') {
//         query = query.eq('payment_type', filters.paymentType);
//       }

//       const { data, error } = await query;

//       if (error) throw error;
//       return data || [];
//     } catch (error) {
//       console.error('Error fetching completed sessions:', error);
//       throw error;
//     }
//   },

//   /**
//    * Calculate report summary
//    */
//   calculateSummary: (sessions: ParkingSession[]): ReportSummary => {
//     const summary: ReportSummary = {
//       totalSessions: sessions.length,
//       totalRevenue: 0,
//       cashAmount: 0,
//       onlineAmount: 0,
//       vehicleBreakdown: { Car: 0, Bike: 0, EV: 0, Cycle: 0 },
//       averageSessionDuration: 0,
//     };

//     let totalDuration = 0;

//     sessions.forEach((session) => {
//       // Calculate revenue
//       const amount = parseFloat(session.amount || '0');
//       summary.totalRevenue += amount;

//       if (session.payment_type === 'cash') {
//         summary.cashAmount += amount;
//       } else if (session.payment_type === 'online') {
//         summary.onlineAmount += amount;
//       }

//       // Count vehicle types
//       if (session.vehicle_type && session.vehicle_type in summary.vehicleBreakdown) {
//         summary.vehicleBreakdown[session.vehicle_type as keyof VehicleBreakdown]++;
//       }

//       // Calculate duration
//       if (session.start_time && session.end_time) {
//         const start = new Date(session.start_time).getTime();
//         const end = new Date(session.end_time).getTime();
//         totalDuration += (end - start) / (1000 * 60); // minutes
//       }
//     });

//     summary.averageSessionDuration =
//       sessions.length > 0 ? totalDuration / sessions.length : 0;

//     return summary;
//   },

//   /**
//    * Get analytics data for charts
//    */
//   getAnalyticsData: async (
//     tenantId: string,
//     filters: ReportFilters
//   ): Promise<AnalyticsData> => {
//     try {
//       const sessions = await reportsApi.getCompletedSessions(tenantId, filters);
//       const summary = reportsApi.calculateSummary(sessions);

//       // Daily revenue breakdown
//       const dailyRevenueMap = new Map<string, DailyRevenue>();
      
//       sessions.forEach((session) => {
//         if (session.start_time) {
//           const date = new Date(session.start_time).toISOString().split('T')[0];
//           const amount = parseFloat(session.amount || '0');
          
//           if (!dailyRevenueMap.has(date)) {
//             dailyRevenueMap.set(date, { date, cash: 0, online: 0, total: 0 });
//           }
          
//           const dayData = dailyRevenueMap.get(date)!;
//           dayData.total += amount;
          
//           if (session.payment_type === 'cash') {
//             dayData.cash += amount;
//           } else if (session.payment_type === 'online') {
//             dayData.online += amount;
//           }
//         }
//       });

//       const dailyRevenue = Array.from(dailyRevenueMap.values()).sort(
//         (a, b) => a.date.localeCompare(b.date)
//       );

//       // Vehicle distribution
//       const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'];
//       const vehicleDistribution = Object.entries(summary.vehicleBreakdown)
//         .filter(([_, count]) => count > 0)
//         .map(([label, value], index) => ({
//           label,
//           value,
//           color: colors[index % colors.length],
//         }));

//       // Hourly traffic pattern
//       const hourlyTrafficMap = new Map<number, number>();
      
//       sessions.forEach((session) => {
//         if (session.start_time) {
//           const hour = new Date(session.start_time).getHours();
//           hourlyTrafficMap.set(hour, (hourlyTrafficMap.get(hour) || 0) + 1);
//         }
//       });

//       const hourlyTraffic: HourlyTraffic[] = Array.from(
//         { length: 24 },
//         (_, i) => ({
//           hour: i,
//           count: hourlyTrafficMap.get(i) || 0,
//         })
//       );

//       // Payment split
//       const paymentSplit = [
//         {
//           label: 'Cash',
//           value: summary.cashAmount,
//           color: '#4CAF50',
//         },
//         {
//           label: 'Online',
//           value: summary.onlineAmount,
//           color: '#2196F3',
//         },
//       ].filter((item) => item.value > 0);

//       return {
//         dailyRevenue,
//         vehicleDistribution,
//         hourlyTraffic,
//         paymentSplit,
//         summary,
//       };
//     } catch (error) {
//       console.error('Error getting analytics data:', error);
//       throw error;
//     }
//   },

//   /**
//    * Delete old records (data cleanup)
//    */
//   deleteOldRecords: async (
//     tenantId: string,
//     options: DeleteOptions
//   ): Promise<DeleteResult> => {
//     try {
//       const cutoffDate = new Date();
//       cutoffDate.setDate(cutoffDate.getDate() - options.olderThanDays);

//       // First, count records to be deleted
//       let countQuery = supabase
//         .from('parking_sessions')
//         .select('*', { count: 'exact', head: true })
//         .eq('tenant_id', tenantId)
//         .lt('start_time', cutoffDate.toISOString());

//       if (options.status !== 'ALL') {
//         countQuery = countQuery.eq('status', options.status);
//       }

//       const { count: deleteCount, error: countError } = await countQuery;

//       if (countError) throw countError;

//       const deletedCount = deleteCount || 0;

//       // If dry run, just return the count
//       if (options.dryRun) {
//         return {
//           deletedCount,
//           remainingCount: 0,
//           spaceFreed: deletedCount * 0.3, // Approximate KB per record
//         };
//       }

//       // Perform actual deletion
//       let deleteQuery = supabase
//         .from('parking_sessions')
//         .delete()
//         .eq('tenant_id', tenantId)
//         .lt('start_time', cutoffDate.toISOString());

//       if (options.status !== 'ALL') {
//         deleteQuery = deleteQuery.eq('status', options.status);
//       }

//       const { error: deleteError } = await deleteQuery;

//       if (deleteError) throw deleteError;

//       // Count remaining records
//       const { count: remainingCount, error: remainingError } = await supabase
//         .from('parking_sessions')
//         .select('*', { count: 'exact', head: true })
//         .eq('tenant_id', tenantId);

//       if (remainingError) throw remainingError;

//       return {
//         deletedCount,
//         remainingCount: remainingCount || 0,
//         spaceFreed: deletedCount * 0.3,
//       };
//     } catch (error) {
//       console.error('Error deleting old records:', error);
//       throw error;
//     }
//   },

//   /**
//    * Get database storage info
//    */
//   getStorageInfo: async (tenantId: string): Promise<{
//     totalRecords: number;
//     activeRecords: number;
//     completedRecords: number;
//     estimatedSizeMB: number;
//     oldestRecord: string | null;
//   }> => {
//     try {
//       const { count: totalRecords, error: totalError } = await supabase
//         .from('parking_sessions')
//         .select('*', { count: 'exact', head: true })
//         .eq('tenant_id', tenantId);

//       if (totalError) throw totalError;

//       const { count: activeRecords, error: activeError } = await supabase
//         .from('parking_sessions')
//         .select('*', { count: 'exact', head: true })
//         .eq('tenant_id', tenantId)
//         .eq('status', 'ACTIVE');

//       if (activeError) throw activeError;

//       const { data: oldest, error: oldestError } = await supabase
//         .from('parking_sessions')
//         .select('start_time')
//         .eq('tenant_id', tenantId)
//         .order('start_time', { ascending: true })
//         .limit(1)
//         .single();

//       if (oldestError && oldestError.code !== 'PGRST116') throw oldestError;

//       return {
//         totalRecords: totalRecords || 0,
//         activeRecords: activeRecords || 0,
//         completedRecords: (totalRecords || 0) - (activeRecords || 0),
//         estimatedSizeMB: ((totalRecords || 0) * 0.3) / 1024,
//         oldestRecord: oldest?.start_time || null,
//       };
//     } catch (error) {
//       console.error('Error getting storage info:', error);
//       throw error;
//     }
//   },
// };



import { supabase } from '../../services/supabase';
import {
  ParkingSession,
  ReportFilters,
  ReportSummary,
  VehicleBreakdown,
  AnalyticsData,
  DailyRevenue,
  HourlyTraffic,
  DeleteOptions,
  DeleteResult,
  MonthlyReportData,
  MonthlyDailyRow,
} from '../../types/reports';

export const reportsApi = {
  /**
   * Get parking sessions with filters
   */
  getSessions: async (
    tenantId: string,
    filters: ReportFilters
  ): Promise<ParkingSession[]> => {
    try {
      // VALIDATION: Check if tenantId is valid
      if (!tenantId || tenantId === 'undefined' || tenantId === 'null') {
        console.error('Invalid tenantId provided:', tenantId);
        throw new Error('Valid tenant ID is required');
      }

      let query = supabase
        .from('parking_sessions')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('start_time', filters.startDate.toISOString())
        .lte('start_time', filters.endDate.toISOString())
        .order('start_time', { ascending: false });

      // Apply status filter
      if (filters.status !== 'ALL') {
        query = query.eq('status', filters.status);
      }

      // Apply vehicle type filter
      if (filters.vehicleType !== 'ALL') {
        query = query.eq('vehicle_type', filters.vehicleType);
      }

      // Apply payment type filter
      if (filters.paymentType !== 'ALL') {
        query = query.eq('payment_type', filters.paymentType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching sessions:', error);
      throw error;
    }
  },

  /**
   * Get completed sessions for reports (excludes ACTIVE)
   */
  getCompletedSessions: async (
    tenantId: string,
    filters: ReportFilters
  ): Promise<ParkingSession[]> => {
    try {
      // VALIDATION: Check if tenantId is valid
      if (!tenantId || tenantId === 'undefined' || tenantId === 'null') {
        console.error('Invalid tenantId provided:', tenantId);
        throw new Error('Valid tenant ID is required');
      }

      let query = supabase
        .from('parking_sessions')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'COMPLETED')
        .gte('start_time', filters.startDate.toISOString())
        .lte('start_time', filters.endDate.toISOString())
        .order('start_time', { ascending: false });

      if (filters.vehicleType !== 'ALL') {
        query = query.eq('vehicle_type', filters.vehicleType);
      }

      if (filters.paymentType !== 'ALL') {
        query = query.eq('payment_type', filters.paymentType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching completed sessions:', error);
      throw error;
    }
  },

  /**
   * Calculate report summary
   */
  calculateSummary: (sessions: ParkingSession[]): ReportSummary => {
  const summary: ReportSummary = {
    totalSessions: sessions.length,
    totalRevenue: 0,
    cashAmount: 0,
    onlineAmount: 0,
    vehicleBreakdown: { Car: 0, Bike: 0, EV: 0, Auto: 0 },
    averageSessionDuration: 0,
  };

  let totalDuration = 0;

  sessions.forEach((session) => {
    const amount = session.total_amount ?? 0;
    const type = session.payment_type?.toUpperCase();

    // ✅ Total revenue
    summary.totalRevenue += amount;

    // ✅ PARTIAL PAYMENT
    if (type === 'PARTIAL' && session.payment_info?.payments) {
      session.payment_info.payments.forEach((p) => {
        if (p.type === 'cash') summary.cashAmount += p.amount;
        if (p.type === 'upi') summary.onlineAmount += p.amount;
      });
    }
    // ✅ NORMAL PAYMENT
    else {
      if (type === 'CASH') {
        summary.cashAmount += amount;
      } else if (type === 'UPI' || type === 'ONLINE') {
        summary.onlineAmount += amount;
      }
    }

    // ✅ Vehicle count
    if (
      session.vehicle_type &&
      session.vehicle_type in summary.vehicleBreakdown
    ) {
      summary.vehicleBreakdown[
        session.vehicle_type as keyof VehicleBreakdown
      ]++;
    }

    // ✅ Duration calculation
    if (session.start_time && session.end_time) {
      const start = new Date(session.start_time).getTime();
      const end = new Date(session.end_time).getTime();
      totalDuration += (end - start) / (1000 * 60);
    }
  });

  summary.averageSessionDuration =
    sessions.length > 0 ? totalDuration / sessions.length : 0;

  return summary;
},


  /**
   * Get analytics data for charts
   */
  getAnalyticsData: async (
    tenantId: string,
    filters: ReportFilters
  ): Promise<AnalyticsData> => {
    try {
      // VALIDATION: Check if tenantId is valid
      if (!tenantId || tenantId === 'undefined' || tenantId === 'null') {
        console.error('Invalid tenantId provided:', tenantId);
        throw new Error('Valid tenant ID is required');
      }

      const sessions = await reportsApi.getCompletedSessions(tenantId, filters);
      const summary = reportsApi.calculateSummary(sessions);

      // Daily revenue breakdown
      const dailyRevenueMap = new Map<string, DailyRevenue>();
      
      sessions.forEach((session) => {
      if (!session.start_time) return;

      const date = new Date(session.start_time)
        .toISOString()
        .split('T')[0];

      if (!dailyRevenueMap.has(date)) {
        dailyRevenueMap.set(date, { date, cash: 0, online: 0, total: 0 });
      }

      const dayData = dailyRevenueMap.get(date)!;
      const amount = session.total_amount ?? 0;
      const type = session.payment_type?.toUpperCase();

      // ✅ Total revenue
      dayData.total += amount;

      // ✅ PARTIAL PAYMENT
      if (type === 'PARTIAL' && session.payment_info?.payments) {
        session.payment_info.payments.forEach((p) => {
          if (p.type === 'cash') dayData.cash += p.amount;
          if (p.type === 'upi') dayData.online += p.amount;
        });
      }
      // ✅ NORMAL PAYMENT
      else {
        if (type === 'CASH') {
          dayData.cash += amount;
        } else if (type === 'UPI' || type === 'ONLINE') {
          dayData.online += amount;
        }
      }
    });


      const dailyRevenue = Array.from(dailyRevenueMap.values()).sort(
        (a, b) => a.date.localeCompare(b.date)
      );

      // Vehicle distribution
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'];
      const vehicleDistribution = Object.entries(summary.vehicleBreakdown)
        .filter(([_, count]) => count > 0)
        .map(([label, value], index) => ({
          label,
          value,
          color: colors[index % colors.length],
        }));

      // Hourly traffic pattern
      const hourlyTrafficMap = new Map<number, number>();
      
      sessions.forEach((session) => {
        if (session.start_time) {
          const hour = new Date(session.start_time).getHours();
          hourlyTrafficMap.set(hour, (hourlyTrafficMap.get(hour) || 0) + 1);
        }
      });

      const hourlyTraffic: HourlyTraffic[] = Array.from(
        { length: 24 },
        (_, i) => ({
          hour: i,
          count: hourlyTrafficMap.get(i) || 0,
        })
      );

      // Payment split
      const paymentSplit = [
        {
          label: 'Cash',
          value: summary.cashAmount,
          color: '#4CAF50',
        },
        {
          label: 'Online',
          value: summary.onlineAmount,
          color: '#2196F3',
        },
      ].filter((item) => item.value > 0);

      return {
        dailyRevenue,
        vehicleDistribution,
        hourlyTraffic,
        paymentSplit,
        summary,
      };
    } catch (error) {
      console.error('Error getting analytics data:', error);
      throw error;
    }
  },

  /**
   * Delete old records (data cleanup)
   */
   deleteOldRecords: async (
    tenantId: string,
    options: DeleteOptions
  ): Promise<DeleteResult> => {
    try {
      if (!tenantId || tenantId === 'undefined' || tenantId === 'null') {
        console.error('Invalid tenantId provided:', tenantId);
        throw new Error('Valid tenant ID is required');
      }

      const parseDate = (dateInput: string | Date | undefined) => {
        if (!dateInput) {
          throw new Error('Invalid date');
        }

        if (dateInput instanceof Date) {
          return dateInput;
        }

        const [year, month, day] = dateInput.split('-').map(Number);
        return new Date(year, month - 1, day);
      };

      const startDate = parseDate(options.startDate);
      const endDate = parseDate(options.endDate);

      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      let countQuery = supabase
        .from('parking_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString());

      if (options.status !== 'ALL') {
        countQuery = countQuery.eq('status', options.status);
      }

      const { count: deleteCount, error: countError } = await countQuery;
      if (countError) throw countError;

      const deletedCount = deleteCount || 0;

      if (options.dryRun) {
        return {
          deletedCount,
          remainingCount: 0,
          spaceFreed: deletedCount * 0.3,
        };
      }

      let deleteQuery = supabase
        .from('parking_sessions')
        .delete()
        .eq('tenant_id', tenantId)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString());

      if (options.status !== 'ALL') {
        deleteQuery = deleteQuery.eq('status', options.status);
      }

      const { error: deleteError } = await deleteQuery;
      if (deleteError) throw deleteError;

      const { count: remainingCount, error: remainingError } = await supabase
        .from('parking_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

      if (remainingError) throw remainingError;

      return {
        deletedCount,
        remainingCount: remainingCount || 0,
        spaceFreed: deletedCount * 0.3,
      };
    } catch (error) {
      console.error('Error deleting old records:', error);
      throw error;
    }
  },

  /**
   * Get database storage info
   */
  getStorageInfo: async (tenantId: string): Promise<{
    totalRecords: number;
    activeRecords: number;
    completedRecords: number;
    estimatedSizeMB: number;
    oldestRecord: string | null;
  }> => {
    try {
      // VALIDATION: Check if tenantId is valid
      if (!tenantId || tenantId === 'undefined' || tenantId === 'null') {
        console.error('Invalid tenantId provided:', tenantId);
        throw new Error('Valid tenant ID is required');
      }

      const { count: totalRecords, error: totalError } = await supabase
        .from('parking_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId);

      if (totalError) throw totalError;

      const { count: activeRecords, error: activeError } = await supabase
        .from('parking_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', 'ACTIVE');

      if (activeError) throw activeError;

      const { data: oldest, error: oldestError } = await supabase
        .from('parking_sessions')
        .select('start_time')
        .eq('tenant_id', tenantId)
        .order('start_time', { ascending: true })
        .limit(1)
        .single();

      if (oldestError && oldestError.code !== 'PGRST116') throw oldestError;

      return {
        totalRecords: totalRecords || 0,
        activeRecords: activeRecords || 0,
        completedRecords: (totalRecords || 0) - (activeRecords || 0),
        estimatedSizeMB: ((totalRecords || 0) * 0.3) / 1024,
        oldestRecord: oldest?.start_time || null,
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      throw error;
    }
  },

  /**
   * Get Monthly Daily Breakdown Report Data (Matching Daily Table & Top Cards)
   */
  getMonthlyReportData: async (
    tenantId: string,
    year: number,
    month: number // 0-indexed: 0 = Jan, 7 = Aug, etc.
  ): Promise<MonthlyReportData> => {
    try {
      if (!tenantId || tenantId === 'undefined' || tenantId === 'null') {
        throw new Error('Valid tenant ID is required');
      }

      const startDate = new Date(year, month, 1, 0, 0, 0, 0);
      const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
      const daysInMonth = endDate.getDate();

      const monthName = startDate.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      });

      // 1. Fetch all sessions that started in this month
      const { data: rawSessions, error } = await supabase
        .from('parking_sessions')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;
      const sessions: ParkingSession[] = rawSessions || [];

      // Also fetch sessions that completed/ended in this month
      const { data: rawEndedSessions, error: endedError } = await supabase
        .from('parking_sessions')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'COMPLETED')
        .gte('end_time', startDate.toISOString())
        .lte('end_time', endDate.toISOString());

      if (endedError) throw endedError;
      const endedSessions: ParkingSession[] = rawEndedSessions || [];

      // 2. Maps for daily in / out / payments
      const dailyInMap = new Map<string, number>();
      const dailyOutMap = new Map<string, number>();
      const dailyCashMap = new Map<string, number>();
      const dailyUpiMap = new Map<string, number>();

      const getLocalDateKey = (isoStr: string) => {
        const d = new Date(isoStr);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      // Count Vehicles In by start_time
      sessions.forEach((s) => {
        if (s.start_time) {
          const key = getLocalDateKey(s.start_time);
          dailyInMap.set(key, (dailyInMap.get(key) || 0) + 1);
        }
      });

      // Count Vehicles Out and Revenue by end_time
      endedSessions.forEach((s) => {
        if (s.end_time) {
          const key = getLocalDateKey(s.end_time);
          dailyOutMap.set(key, (dailyOutMap.get(key) || 0) + 1);

          const amount = s.total_amount ?? 0;
          const type = (s.payment_type || '').toUpperCase();

          let cAmt = 0;
          let uAmt = 0;

          if (type === 'PARTIAL' && s.payment_info?.payments) {
            s.payment_info.payments.forEach((p) => {
              const pType = (p.type || '').toLowerCase();
              const pAmount = Number(p.amount || 0);
              if (pType === 'cash') cAmt += pAmount;
              if (pType === 'upi' || pType === 'online') uAmt += pAmount;
            });
          } else if (type === 'CASH') {
            cAmt += amount;
          } else if (type === 'UPI' || type === 'ONLINE') {
            uAmt += amount;
          }

          dailyCashMap.set(key, (dailyCashMap.get(key) || 0) + cAmt);
          dailyUpiMap.set(key, (dailyUpiMap.get(key) || 0) + uAmt);
        }
      });

      // 3. Build daily rows for every day of the month (1 to daysInMonth)
      const dailyRows: MonthlyDailyRow[] = [];
      let totalIn = 0;
      let totalOut = 0;
      let totalCash = 0;
      let totalUpi = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const rowDate = new Date(year, month, day);
        const dayStr = String(day).padStart(2, '0');
        const monthNum = String(month + 1).padStart(2, '0');
        const rawDate = `${year}-${monthNum}-${dayStr}`;

        const monthShort = rowDate.toLocaleDateString('en-US', { month: 'short' });
        const dateStr = `${monthShort} ${dayStr}, ${year}`;

        const vIn = dailyInMap.get(rawDate) || 0;
        const vOut = dailyOutMap.get(rawDate) || 0;
        const cash = dailyCashMap.get(rawDate) || 0;
        const upi = dailyUpiMap.get(rawDate) || 0;
        const total = cash + upi;

        totalIn += vIn;
        totalOut += vOut;
        totalCash += cash;
        totalUpi += upi;

        dailyRows.push({
          sNo: day,
          dateStr,
          rawDate,
          vehiclesIn: vIn,
          vehiclesOut: vOut,
          cash,
          upi,
          total,
        });
      }

      // 4. Vehicle Breakdown & Summary
      const summary = reportsApi.calculateSummary(sessions);
      summary.totalRevenue = totalCash + totalUpi;
      summary.cashAmount = totalCash;
      summary.onlineAmount = totalUpi;

      return {
        monthName,
        startDate,
        endDate,
        generatedAt: new Date(),
        summary,
        dailyRows,
        monthTotal: {
          totalIn,
          totalOut,
          totalCash,
          totalUpi,
          grandTotal: totalCash + totalUpi,
        },
      };
    } catch (error) {
      console.error('Error getting monthly report data:', error);
      throw error;
    }
  },
};