
"use client";
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  SafeAreaView,
  Animated,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../../../services/supabase";
import { useAuthStore } from "../../../store/authStore";

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { setUser } = useAuthStore();

  // Animated button scale
  const buttonScale = useState(new Animated.Value(1))[0];

  const signIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Required", "Please enter email and password");
      return;
    }

    setLoading(true);

    // Button press animation
    Animated.spring(buttonScale, {
      toValue: 0.96,
      friction: 8,
      useNativeDriver: true,
    }).start();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      const user = data.user;

      if (user) {
        setUser({
          id: user.id,
          email: user.email ?? null,
          tenant_id: user.user_metadata?.tenant_id,
          name: user.user_metadata?.name,
          role: user.user_metadata?.role,
        });
      }
    } catch (err: any) {
      Alert.alert("Login Failed", err.message || "Invalid credentials");
    } finally {
      setLoading(false);

      // Reset button animation
      Animated.spring(buttonScale, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.content}>
            {/* Login Form */}
            <View >
              <Text style={styles.formTitle}>Welcome Back</Text>
              <Text style={styles.formSubtitle}>Sign in to continue</Text>
                        

              {/* Email */}
              <View style={styles.inputContainer}>
                <Feather name="mail" size={20} color="#f97316" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                  returnKeyType="next"
                  importantForAutofill="yes"
                />
              </View>

              {/* Password */}
              <View style={styles.inputContainer}>
                <Feather name="lock" size={20} color="#f97316" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={signIn}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                >
                  <Feather
                    name={showPassword ? "eye" : "eye-off"}
                    size={20}
                    color="#f97316"
                  />
                </TouchableOpacity>
              </View>

              {/* Sign In Button */}
              <TouchableOpacity
                style={[styles.signInButton, loading && styles.buttonDisabled]}
                onPress={signIn}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <LinearGradient
                    colors={loading ? ["#d1d5db", "#d1d5db"] : ["#f97316", "#ea580c"]}
                    style={styles.buttonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.buttonText}>
                      {loading ? "Signing in..." : "Sign In"}
                    </Text>
                  </LinearGradient>
                </Animated.View>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  tenantName: {
    fontSize: 38,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 8,
    fontWeight: "500",
  },
  form: {
    backgroundColor: "#ffffff",
    borderRadius: 28,
    padding: 36,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 8,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  formSubtitle: {
    fontSize: 15,
    color: "#6b7280",
    marginBottom: 32,
    textAlign: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#e5e7eb",
    paddingHorizontal: 18,
    marginBottom: 20,
  },
  inputIcon: {
    marginRight: 14,
  },
  input: {
    flex: 1,
    color: "#111827",
    fontSize: 16,
    paddingVertical: 18,
  },
  forgotLink: {
    alignSelf: "flex-end",
    marginBottom: 32,
  },
  forgotText: {
    color: "#f97316",
    fontSize: 14,
    fontWeight: "600",
  },
  signInButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  footer: {
    marginTop: 40,
    alignItems: "center",
  },
  footerText: {
    color: "#9ca3af",
    fontSize: 13,
  },
});