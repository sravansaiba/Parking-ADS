// src/api/qrcodes/api.ts

import { supabase } from "../../services/supabase";
import { QR_ROUTES } from "./routes";
import { PAGINATION } from "../../utils/config";

// ----------------------------
// Generate QR Codes (RPC)
// ----------------------------

export async function generateCards(tenantId: string, count: number) {
  const { data, error } = await supabase.rpc("generate_qr_codes", {
    _tenant_id: tenantId,
    _count: count,
  });

  if (error) throw error;

  return data;
}

export async function fetchCards(
  tenantId: string,
  page: number = 1,
  limit: number = PAGINATION.LIMIT,
  options?: { status?: "all" | "active" | "inactive"; search?: string }
) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query: any = supabase
    .from(QR_ROUTES.LIST)
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (options?.status && options.status !== "all") {
    const isActive = options.status === "active";
    query = query.eq("active", isActive);
  }

  if (options?.search && options.search.trim().length > 0) {
    const q = options.search.trim();
    query = query.ilike("code_text", `%${q}%`);
  }

  const { data, error, count } = await query.range(from, to);

  if (error) throw error;

  return {
    items: (data as any[]) || [],
    count: (count as number) || 0,
  };
}
// ----------------------------
// Search QR codes
// ----------------------------
export async function searchCards(tenantId: string, query: string) {
  const { data, error } = await supabase
    .from(QR_ROUTES.LIST)
    .select("*")
    .eq("tenant_id", tenantId)
    .ilike("code_text", `%${query}%`)
    .order("code_text", { ascending: true });

  if (error) throw error;
  return data || [];
}

// ----------------------------
// Fetch a single QR card
// ----------------------------
export async function fetchCardById(id: string) {
  const { data, error } = await supabase
    .from(QR_ROUTES.LIST)
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

// ----------------------------
// Delete QR code
// ----------------------------
export async function deleteCard(id: string) {
  const { error } = await supabase
    .from(QR_ROUTES.LIST)
    .delete()
    .eq("id", id);

  if (error) throw error;

  return true;
}

// ----------------------------
// Fetch tenant description (Terms & Conditions)
// ----------------------------
export async function fetchTenantDetails(tenantId: string) {
  const { data, error } = await supabase
    .from(QR_ROUTES.TENANTS)
    .select("id, name, description, address")
    .eq("id", tenantId)
    .single();

  if (error) throw error;
  return data;
}


export async function toggleCardStatus(id: string, currentStatus: boolean) {
  const { error } = await supabase
    .from(QR_ROUTES.LIST)
    .update({ active: !currentStatus })
    .eq("id", id);

  if (error) throw error;

  return true;
}


export async function fetchAllCards(tenantId: string) {
  const { data, error } = await supabase
    .from(QR_ROUTES.LIST)
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

// ----------------------------
// Update Tenant Terms & Conditions
// ----------------------------
export async function updateTenantDescription(
  tenantId: string,
  description: any
) {
  const { data, error } = await supabase
    .from(QR_ROUTES.TENANTS)
    .update({ description })
    .eq("id", tenantId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchCardCounts(tenantId: string) {
  const totalRes = await supabase
    .from(QR_ROUTES.LIST)
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId);

  if (totalRes.error) throw totalRes.error;

  const activeRes = await supabase
    .from(QR_ROUTES.LIST)
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("active", true);

  if (activeRes.error) throw activeRes.error;

  const inactiveRes = await supabase
    .from(QR_ROUTES.LIST)
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("active", false);

  if (inactiveRes.error) throw inactiveRes.error;

  return {
    total: totalRes.count || 0,
    active: activeRes.count || 0,
    inactive: inactiveRes.count || 0,
  };
}



