import { supabase, supabaseAdmin } from "../../services/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────
export type StaffUser = {
  id: string;
  name: string;
  phone: string | null;
  role: string;
  created_at: string;
  email?: string;
};

// ─── List all staff users for this tenant ────────────────────────────────────
export const getStaffUsers = async (tenantId: string): Promise<StaffUser[]> => {
  const { data, error } = await supabase
    .from("app_users")
    .select("id, name, phone, role, created_at,email")
    .eq("tenant_id", tenantId)
    .eq("role", "staff")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as StaffUser[];
};

// ─── Create a new staff user (email auto-confirmed via service role) ──────────
export const createStaffUser = async (
  tenantId: string,
  name: string,
  phone: string,
  email: string,
  password: string
): Promise<string> => {
  // Step 1: Create auth user via Admin API — no confirmation email sent
  const { data: adminData, error: adminError } =
    await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true, // ← auto-confirm, no email verification needed
    });

  if (adminError) throw new Error(adminError.message);
  if (!adminData?.user) throw new Error("Failed to create auth user.");

  const userId = adminData.user.id;

  // Step 2: Insert into app_users with tenant link
  const { error: insertError } = await supabase.from("app_users").insert({
    id: userId,
    tenant_id: tenantId,
    name: name.trim(),
    phone: phone.trim() || null,
    email: email.trim().toLowerCase(),
    role: "staff",
  });

  if (insertError) {
    // Rollback: delete the auth user we just created
    await supabaseAdmin.auth.admin.deleteUser(userId);
    throw new Error(insertError.message);
  }

  return userId;
};

// ─── Delete a staff user from BOTH auth.users AND app_users ──────────────────
export const deleteStaffUser = async (userId: string): Promise<void> => {
  // Step 1: Delete from app_users (FK constraint — do this first)
  const { error: appUserError } = await supabase
    .from("app_users")
    .delete()
    .eq("id", userId);

  if (appUserError) throw new Error(appUserError.message);

  // Step 2: Hard delete from auth.users via Admin API
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (authError) throw new Error(authError.message);
};

export const updateStaffUser = async (
  userId: string,
  payload: {
    name: string;
    phone: string;
    email: string;
  }
): Promise<void> => {
  const nextEmail = payload.email.trim().toLowerCase();

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    {
      email: nextEmail,
      user_metadata: {
        name: payload.name.trim(),
        role: "staff",
      },
    }
  );

  if (authError) throw new Error(authError.message);

  const { error: appUserError } = await supabase
    .from("app_users")
    .update({
      name: payload.name.trim(),
      phone: payload.phone.trim() || null,
      email: nextEmail,
    })
    .eq("id", userId);

  if (appUserError) throw new Error(appUserError.message);
};

export const updateStaffPassword = async (
  userId: string,
  newPassword: string
): Promise<void> => {
  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) throw new Error(error.message);
};

// ─── Change admin's own password ──────────────────────────────────────────────
export const changeAdminPassword = async (
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  // Step 1: Get current user's email
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user?.email) {
    throw new Error("Unable to get current user. Please re-login.");
  }

  const email = userData.user.email;

  // Step 2: Re-authenticate with current password to verify identity
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });

  if (signInError) throw new Error("Current password is incorrect.");

  // Step 3: Update to new password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) throw new Error(updateError.message);
};
