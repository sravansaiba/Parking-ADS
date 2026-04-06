import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

export default function AddUser() {
  const [email, setEmail] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");

  const [emailErr, setEmailErr] = useState("");
  const [firstErr, setFirstErr] = useState("");
  const [lastErr, setLastErr] = useState("");

  const onAdd = () => {
    let valid = true;

    if (!email) {
      setEmailErr("User emailid is required.");
      valid = false;
    } else setEmailErr("");

    if (!first) {
      setFirstErr("User First Name is required.");
      valid = false;
    } else setFirstErr("");

    if (!last) {
      setLastErr("User Last Name is required.");
      valid = false;
    } else setLastErr("");

    if (!valid) return;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Add User</Text>

      <Text style={styles.label}>User email ID</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter user email id (Only gmail ID supported)"
        value={email}
        onChangeText={setEmail}
        placeholderTextColor="#777"
      />
      {emailErr ? <Text style={styles.error}>{emailErr}</Text> : null}

      <Text style={styles.label}>First Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter User First Name"
        value={first}
        onChangeText={setFirst}
        placeholderTextColor="#777"
      />
      {firstErr ? <Text style={styles.error}>{firstErr}</Text> : null}

      <Text style={styles.label}>Last Name</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter User Last Name"
        value={last}
        onChangeText={setLast}
        placeholderTextColor="#777"
      />
      {lastErr ? <Text style={styles.error}>{lastErr}</Text> : null}

      <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
        <Text style={styles.addText}>Add ✓</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  heading: {
    fontSize: 35,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 30,
    color: "#000",
  },
  label: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 5,
    color: "green",
  },
  input: {
    borderWidth: 2,
    borderColor: "green",
    borderRadius: 8,
    paddingHorizontal: 15,
    height: 50,
    backgroundColor: "#fff",
  },
  error: {
    fontSize: 15,
    marginTop: 4,
    color: "#000",
  },
  addBtn: {
    backgroundColor: "green",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 25,
  },
  addText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
});
