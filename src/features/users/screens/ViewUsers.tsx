import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from "react-native";

export default function ViewUsers() {
  const users = [
    { id: 1, email: "rahulgurudu2001@gmail.com" },
  ];

  const renderItem = ({ item }: any) => (
    <View style={styles.row}>
      <Text style={styles.serial}>{item.id}</Text>
      <Text style={styles.email}>{item.email}</Text>
      <TouchableOpacity style={styles.delBtn}>
        <Text style={styles.delText}>Delete User</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>#</Text>
        <Text style={styles.header}>User Name</Text>
        <Text style={styles.header}>Action</Text>
      </View>

      <View style={styles.separator} />

      <FlatList
        data={users}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 15,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  header: {
    fontSize: 18,
    fontWeight: "700",
    color: "#000",
  },
  separator: {
    height: 2,
    backgroundColor: "#ddd",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  serial: {
    width: "10%",
    fontSize: 17,
    color: "#000",
  },
  email: {
    width: "60%",
    fontSize: 16,
    color: "#000",
  },
  delBtn: {
    backgroundColor: "green",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  delText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
