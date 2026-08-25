import { supabase } from "../../services/supabase";
import { SESSION_ROUTES } from "./routes";

export async function handleQRScan(qrId: string, tenantId: string) {
  const { data, error } = await supabase.rpc(
    SESSION_ROUTES.RPC_HANDLE_SCAN,
    {
      p_qr_id: qrId,
      p_tenant_id: tenantId,
    }
  );

  if (error) throw error;
  return data;
}

export async function startParkingSession(payload: {
  qr_id: string;
  vehicle_type: string;
  vehicle_number: string;
  person_name: string;
  tenant_id: string;
}) {
  const { data, error } = await supabase.rpc(
    SESSION_ROUTES.RPC_START,
    {
      p_qr_id: payload.qr_id,
      p_vehicle_type: payload.vehicle_type,
      p_vehicle_number: payload.vehicle_number,
      p_person_name: payload.person_name,
      p_tenant_id: payload.tenant_id,
    }
  );

  if (error) throw error;
  return data;
}

export type PaymentItem = {
  type: string;
  amount: number;
};

export async function endParkingSession(payload: {
  session_id: string;
  total_amount: number;
  payment_type: 'CASH' | 'UPI' | 'PARTIAL';  
  payment_info: {
    payments: PaymentItem[];
    return_cash?: number;
    original_amount?: number;
  };
  is_amount_edited?: boolean;
}) {
  const { data, error } = await supabase.rpc(
    SESSION_ROUTES.RPC_END,
    {
      p_session_id: payload.session_id,
      p_total_amount: payload.total_amount,
      p_payment_type: payload.payment_type,
      p_payment_info: payload.payment_info,
      p_is_amount_edited: payload.is_amount_edited ?? false,
    }
  );

  if (error) throw error;
  return data;
}


export interface GetActiveSessionsParams {
  vehicle_type?: string;
  limit?: number;
  offset?: number;
  search?: string;
}


export async function getActiveSessionsForDashboard(tenantId: string) {
  const { data, error } = await supabase
    .from("parking_sessions")
    .select("id, vehicle_type, vehicle_number, qr_id")
    .eq("tenant_id", tenantId)
    .eq("status", "ACTIVE");

  if (error) throw error;
  return data ?? [];
}

// export async function getActiveSessions(
//   tenantId: string,
//   params: GetActiveSessionsParams = {}
// ) {
//   const { vehicle_type, limit = 15, offset = 0 } = params;

//   let query = supabase
//     .from("parking_sessions")
//     .select("id, vehicle_type, vehicle_number, qr_id,start_time", {
//       count: "exact", 
//     })
//     .eq("tenant_id", tenantId)
//     .eq("status", "ACTIVE")
//     .order("start_time", { ascending: false }) 
//     .range(offset, offset + limit - 1); 

//   if (vehicle_type) {
//     query = query.eq("vehicle_type", vehicle_type);
//   }

//   const { data, error, count } = await query;
//   if (error) throw error;

//   return {
//     data: data ?? [],
//     total: count ?? 0,
//   };
// }


export async function getActiveSessions(
  tenantId: string,
  params: GetActiveSessionsParams = {}
) {
  const { vehicle_type, limit = 15, offset = 0, search } = params;

  let query = supabase
    .from("parking_sessions")
    .select("id, vehicle_type, vehicle_number, qr_id, start_time", {
      count: "exact",
    })
    .eq("tenant_id", tenantId)
    .eq("status", "ACTIVE")
    .order("start_time", { ascending: false })
    .range(offset, offset + limit - 1);

  if (vehicle_type) {
    query = query.eq("vehicle_type", vehicle_type);
  }


  if (search) {
    query = query.or(
      `vehicle_number.ilike.%${search}%,qr_id.ilike.%${search}%`
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    data: data ?? [],
    total: count ?? 0,
  };
}


export async function getLastDepartedSession(tenantId: string) {
  const { data, error } = await supabase
    .from("parking_sessions")
    .select("qr_id, vehicle_number, vehicle_type, status, end_time")
    .eq("tenant_id", tenantId)
    .eq("status", "COMPLETED")
    .order("end_time", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) return null;
  return data[0];
}



