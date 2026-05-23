// import React from "react";
// import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
// import { useNavigation } from "@react-navigation/native";

// export default function UsersHome() {
//   const navigation = useNavigation();

//   return (
//     <View style={styles.container}>
//       <TouchableOpacity
//         style={styles.box}
//         onPress={() => navigation.navigate("AddUser")}
//       >
//         <Text style={styles.text}>Add User</Text>
//       </TouchableOpacity>

//       <TouchableOpacity
//         style={styles.box}
//         onPress={() => navigation.navigate("ViewUsers")}
//       >
//         <Text style={styles.text}>View User List</Text>
//       </TouchableOpacity>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: "center",
//     backgroundColor: "#fff",
//     padding: 20,
//   },
//   box: {
//     backgroundColor: "#f0f0f0",
//     padding: 20,
//     borderRadius: 10,
//     borderWidth: 1,
//     borderColor: "#ccc",
//     marginBottom: 16,
//   },
//   text: {
//     fontSize: 18,
//     textAlign: "center",
//     fontWeight: "600",
//     color: "#000",
//   },
// });



import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  RefreshControl,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuthStore } from "../../../store/authStore";
import {
  getStaffUsers,
  createStaffUser,
  deleteStaffUser,
  updateStaffUser,
  updateStaffPassword,
  StaffUser,
} from "../../../api/users/api";

const STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0;

const PAGE_SIZE_OPTIONS = [5, 10, 15, 20];
const DEFAULT_PAGE_SIZE = 10;

export default function UserHome() {
  const navigation = useNavigation<any>();
  const user = useAuthStore((s) => s.user);

  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  // Delete confirm modal
  const [deleteTarget, setDeleteTarget] = useState<StaffUser | null>(null);
  const [editTarget, setEditTarget] = useState<StaffUser | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<StaffUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const fetchUsers = useCallback(async () => {
    if (!user?.tenant_id) return;
    try {
      const data = await getStaffUsers(user.tenant_id);
      setUsers(data);
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  }, [user?.tenant_id]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUsers();
    setRefreshing(false);
  };

  const totalRecords = users.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const paginatedUsers = users.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const resetForm = () => {
    setName("");
    setPhone("");
    setEmail("");
    setPassword("");
    setShowPass(false);
  };

  const openEditModal = (staff: StaffUser) => {
    setEditTarget(staff);
    setEditName(staff.name ?? "");
    setEditPhone(staff.phone ?? "");
    setEditEmail(staff.email ?? "");
  };

  const closeEditModal = () => {
    setEditTarget(null);
    setEditName("");
    setEditPhone("");
    setEditEmail("");
  };

  const openPasswordModal = (staff: StaffUser) => {
    setPasswordTarget(staff);
    setNewPassword("");
    setConfirmNewPassword("");
  };

  const closePasswordModal = () => {
    setPasswordTarget(null);
    setNewPassword("");
    setConfirmNewPassword("");
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert("Validation", "Name is required.");
      return;
    }
    if (!email.trim()) {
      Alert.alert("Validation", "Email is required.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert("Validation", "Please enter a valid email address.");
      return;
    }
    if (!password || password.length < 6) {
      Alert.alert("Validation", "Password must be at least 6 characters.");
      return;
    }
    if (!user?.tenant_id) return;

    setSubmitting(true);
    try {
      await createStaffUser(
        user.tenant_id,
        name.trim(),
        phone.trim(),
        email.trim(),
        password
      );
      Alert.alert("Success", `${name.trim()} has been added to your team.`);
      resetForm();
      setShowForm(false);
      await fetchUsers();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    setDeleteTarget(null);
    try {
      await deleteStaffUser(deleteTarget.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editTarget) return;
    if (!editName.trim()) {
      Alert.alert("Validation", "Name is required.");
      return;
    }
    if (!editEmail.trim()) {
      Alert.alert("Validation", "Email is required.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editEmail.trim())) {
      Alert.alert("Validation", "Please enter a valid email address.");
      return;
    }

    setSavingEdit(true);
    try {
      await updateStaffUser(editTarget.id, {
        name: editName,
        phone: editPhone,
        email: editEmail,
      });
      closeEditModal();
      await fetchUsers();
      Alert.alert("Updated", "Staff details updated successfully.");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSavePassword = async () => {
    if (!passwordTarget) return;
    if (!newPassword || newPassword.length < 6) {
      Alert.alert("Validation", "Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert("Validation", "Passwords do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      await updateStaffPassword(passwordTarget.id, newPassword);
      closePasswordModal();
      Alert.alert("Password Updated", "The staff password has been changed.");
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setSavingPassword(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const onPageSizeChange = (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
    setDropdownOpen(false);
  };

  const renderPaginationBar = () => (
    <View style={styles.paginationBar}>
      <View style={styles.dropdownWrapper}>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setDropdownOpen((v) => !v)}
          activeOpacity={0.8}
        >
          <Text style={styles.dropdownValue}>{pageSize}</Text>
          <Ionicons
            name={dropdownOpen ? "chevron-up" : "chevron-down"}
            size={13}
            color="#f97316"
          />
        </TouchableOpacity>

        {dropdownOpen && (
          <View style={styles.dropdownMenu}>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <TouchableOpacity
                key={size}
                onPress={() => onPageSizeChange(size)}
                style={[
                  styles.dropdownItem,
                  pageSize === size && styles.dropdownItemActive,
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    pageSize === size && styles.dropdownItemTextActive,
                  ]}
                >
                  {size}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <Text style={styles.perPageLabel}>/ page</Text>
      <View style={{ flex: 1 }} />

      <Text style={styles.totalCount}>
        <Text style={styles.totalCountBold}>{totalRecords}</Text> total
      </Text>

      <View style={{ flex: 1 }} />

      <View style={styles.pageNavRow}>
        <TouchableOpacity
          onPress={() => setCurrentPage((p) => p - 1)}
          disabled={currentPage === 1}
          style={[styles.navBtn, currentPage === 1 && styles.navBtnDisabled]}
        >
          <Ionicons
            name="chevron-back"
            size={15}
            color={currentPage === 1 ? "#d1d5db" : "#f97316"}
          />
        </TouchableOpacity>

        <Text style={styles.pageInfo}>
          <Text style={styles.pageInfoBold}>{currentPage}</Text>
          <Text style={styles.pageInfoSlash}> / </Text>
          <Text style={styles.pageInfoBold}>{totalPages}</Text>
        </Text>

        <TouchableOpacity
          onPress={() => setCurrentPage((p) => p + 1)}
          disabled={currentPage === totalPages}
          style={[
            styles.navBtn,
            currentPage === totalPages && styles.navBtnDisabled,
          ]}
        >
          <Ionicons
            name="chevron-forward"
            size={15}
            color={currentPage === totalPages ? "#d1d5db" : "#f97316"}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#f4f6fb" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Staff Members</Text>
        <TouchableOpacity
          style={[styles.addBtn, showForm && styles.addBtnActive]}
          onPress={() => {
            resetForm();
            setShowForm((v) => !v);
          }}
        >
          <Ionicons
            name={showForm ? "close" : "person-add-outline"}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#e65d0d"]}
            tintColor="#e65d0d"
          />
        }
      >
        {/* ── Create User Form ── */}
        {showForm && (
          <View style={styles.formCard}>
            <View style={styles.formTitleRow}>
              <Ionicons name="person-add" size={18} color="#e65d0d" />
              <Text style={styles.formTitle}>Add New Staff</Text>
            </View>

            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Ravi Kumar"
              placeholderTextColor="#9ca3af"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="next"
            />

            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 9876543210"
              placeholderTextColor="#9ca3af"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              returnKeyType="next"
            />

            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. ravi@example.com"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />

            <Text style={styles.label}>Password *</Text>
            <View style={styles.passRow}>
              <TextInput
                style={[styles.input, styles.passInput]}
                placeholder="Min 6 characters"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleCreate}
              />
              <TouchableOpacity
                onPress={() => setShowPass((v) => !v)}
                style={styles.eyeBtn}
              >
                <Ionicons
                  name={showPass ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  resetForm();
                  setShowForm(false);
                }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, submitting && { opacity: 0.65 }]}
                onPress={handleCreate}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={styles.submitText}>Create User</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Users List Header ── */}
        {/* <View style={styles.listHeader}>
          <Text style={styles.sectionTitle}>
            Team Members
          </Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{users.length}</Text>
          </View>
        </View> */}

        {/* ── Loading State ── */}
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color="#e65d0d" size="large" />
            <Text style={styles.loadingText}>Loading staff...</Text>
          </View>
        ) : users.length === 0 ? (
          /* ── Empty State ── */
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="people-outline" size={44} color="#d1d5db" />
            </View>
            <Text style={styles.emptyText}>No staff users yet</Text>
            <Text style={styles.emptySubText}>
              Tap the{" "}
              <Text style={{ color: "#e65d0d", fontWeight: "700" }}>+</Text>{" "}
              button above to add your first staff member.
            </Text>
          </View>
        ) : (
          /* ── User Cards ── */
          paginatedUsers.map((u) => (
            <View key={u.id} style={styles.userCard}>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{u.name}</Text>
                <Text style={styles.userPhone}>
                  {u.phone ? u.phone : "No phone"}
                </Text>
                <Text style={styles.userEmail}>
                  {u.email ? u.email : "No email"}
                </Text>
                <Text style={styles.userDate}>
                  Added {formatDate(u.created_at)}
                </Text>
              </View>

              <View style={styles.userRight}>
                {deletingId === u.id ? (
                  <ActivityIndicator
                    size="small"
                    color="#ef4444"
                    style={{ marginTop: 2 }}
                  />
                ) : (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      onPress={() => openEditModal(u)}
                      style={styles.actionBtn}
                    >
                      <Ionicons name="create-outline" size={15} color="#2563eb" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => openPasswordModal(u)}
                      style={styles.actionBtn}
                    >
                      <Ionicons name="key-outline" size={15} color="#d97706" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setDeleteTarget(u)}
                      style={styles.deleteBtn}
                    >
                      <Ionicons name="trash-outline" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          ))
        )}

        {!loading && users.length > 0 && renderPaginationBar()}
      </ScrollView>

      {/* ── Delete Confirmation Modal ── */}
      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconWrap}>
              <Ionicons name="warning-outline" size={32} color="#ef4444" />
            </View>
            <Text style={styles.modalTitle}>Delete User?</Text>
            <Text style={styles.modalText}>
              <Text style={{ fontWeight: "700", color: "#111827" }}>
                {deleteTarget?.name}
              </Text>{" "}
              will be permanently removed from your team and will lose all
              access. This cannot be undone.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDeleteTarget(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDeleteBtn}
                onPress={handleDeleteConfirm}
              >
                <Text style={styles.modalDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!editTarget}
        transparent
        animationType="fade"
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheetContent}>
            <Text style={styles.sheetTitle}>Edit Staff Details</Text>

            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Enter full name"
              placeholderTextColor="#9ca3af"
            />

            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="Enter phone number"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={styles.input}
              value={editEmail}
              onChangeText={setEditEmail}
              placeholder="Enter email"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={closeEditModal}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={handleSaveEdit}
                disabled={savingEdit}
              >
                {savingEdit ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalPrimaryText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!passwordTarget}
        transparent
        animationType="fade"
        onRequestClose={closePasswordModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheetContent}>
            <Text style={styles.sheetTitle}>Set New Password</Text>
            <Text style={styles.sheetSubtext}>
              Update password for {passwordTarget?.name}
            </Text>

            <Text style={styles.label}>New Password *</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Min 6 characters"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>Confirm Password *</Text>
            <TextInput
              style={styles.input}
              value={confirmNewPassword}
              onChangeText={setConfirmNewPassword}
              placeholder="Repeat password"
              placeholderTextColor="#9ca3af"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={closePasswordModal}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={handleSavePassword}
                disabled={savingPassword}
              >
                {savingPassword ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalPrimaryText}>Update</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: STATUS_BAR_HEIGHT + 16,
    paddingBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    flexDirection: "row",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "800",
    color: "#1f2937",
  },
  addBtn: {
    backgroundColor: "#e65d0d",
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addBtnActive: {
    backgroundColor: "#6b7280",
  },
  scroll: {
    padding: 16,
    paddingBottom: 50,
  },
  // ── Form ──
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 1,
    borderColor: "#fde8da",
  },
  formTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: "#f9fafb",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: "#111827",
    marginBottom: 14,
  },
  passRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  passInput: {
    flex: 1,
    marginBottom: 0,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderRightWidth: 0,
  },
  eyeBtn: {
    height: 46,
    paddingHorizontal: 14,
    backgroundColor: "#f9fafb",
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  formActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e65d0d",
    flexDirection: "row",
    gap: 6,
  },
  submitText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  // ── List ──
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
  },
  countBadge: {
    backgroundColor: "#e65d0d",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 26,
    alignItems: "center",
  },
  countText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  centerBox: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "#9ca3af",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 50,
    paddingHorizontal: 20,
    gap: 10,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#9ca3af",
  },
  emptySubText: {
    fontSize: 13,
    color: "#d1d5db",
    textAlign: "center",
    lineHeight: 20,
  },
  userCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  userInfo: {
    flex: 1,
    paddingRight: 10,
  },
  userName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 1,
  },
  userPhone: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 1,
  },
  userEmail: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 1,
  },
  userDate: {
    fontSize: 10,
    color: "#9ca3af",
  },
  userRight: {
    alignItems: "flex-end",
    justifyContent: "center",
    minWidth: 118,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  // ── Delete Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
  },
  modalIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  modalText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 22,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
  },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#ef4444",
  },
  modalDeleteText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  modalPrimaryBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#e65d0d",
  },
  modalPrimaryText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  paginationBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    marginBottom: 8,
  },
  dropdownWrapper: {
    position: "relative",
    zIndex: 10,
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff7f0",
    borderWidth: 1,
    borderColor: "#f97316",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dropdownValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#f97316",
  },
  dropdownMenu: {
    position: "absolute",
    bottom: 38,
    left: 0,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    overflow: "hidden",
    minWidth: 64,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    zIndex: 20,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dropdownItemActive: {
    backgroundColor: "#fff7f0",
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  dropdownItemTextActive: {
    color: "#f97316",
  },
  perPageLabel: {
    fontSize: 12,
    color: "#9ca3af",
    marginLeft: 6,
  },
  totalCount: {
    fontSize: 13,
    color: "#6b7280",
  },
  totalCountBold: {
    fontWeight: "800",
    color: "#111827",
  },
  pageNavRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  navBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#fff7f0",
    borderWidth: 1,
    borderColor: "#f97316",
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnDisabled: {
    backgroundColor: "#f9fafb",
    borderColor: "#e5e7eb",
  },
  pageInfo: {
    fontSize: 13,
    color: "#6b7280",
    minWidth: 36,
    textAlign: "center",
  },
  pageInfoBold: {
    fontWeight: "800",
    color: "#111827",
    fontSize: 13,
  },
  pageInfoSlash: {
    color: "#d1d5db",
    fontSize: 13,
  },
  sheetContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 380,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
  sheetSubtext: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 14,
  },
});
