import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { supabase } from '../../../services/supabase';

export default function ForgotPasswordScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const sendReset = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'yourapp://reset-password', 
      });
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'If that email is registered, a password reset link has been sent.');
        navigation.goBack();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.info}>Enter your email and we will send a reset link.</Text>
      <TextInput style={styles.input} placeholder="you@domain.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Button title={loading ? 'Sending...' : 'Send reset link'} onPress={sendReset} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1, justifyContent: 'center' },
  info: { marginBottom: 10, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#e2e2e2', padding: 10, borderRadius: 6, marginBottom: 12 },
});
