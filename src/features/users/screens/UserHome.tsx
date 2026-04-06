import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function UsersHome() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.box}
        onPress={() => navigation.navigate("AddUser")}
      >
        <Text style={styles.text}>Add User</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.box}
        onPress={() => navigation.navigate("ViewUsers")}
      >
        <Text style={styles.text}>View User List</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  box: {
    backgroundColor: "#f0f0f0",
    padding: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: 16,
  },
  text: {
    fontSize: 18,
    textAlign: "center",
    fontWeight: "600",
    color: "#000",
  },
});
