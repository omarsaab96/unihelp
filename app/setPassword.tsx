import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { setInvitedUserPassword } from "../src/api";

export default function SetPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const styles = useMemo(() => styling(colorScheme, insets), [colorScheme, insets]);
  const { token } = useLocalSearchParams<{ token?: string }>();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (typeof token !== "string" || token.length === 0) {
      Alert.alert("Invalid link", "This invite link is missing required information.");
      return;
    }

    if (password.trim().length < 6) {
      Alert.alert("Password too short", "Use at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Passwords do not match");
      return;
    }

    setSaving(true);
    try {
      const data = await setInvitedUserPassword({ token, password });
      if (data?.error) {
        Alert.alert("Error", data.error);
        return;
      }

      router.replace({
        pathname: "/login",
        params: { email: data?.email, invited: "1" },
      });
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to set password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.appContainer}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Set Your Password</Text>
        <Text style={styles.subtitle}>
          Finish your Unihelp account setup by creating a password.
        </Text>

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="New password"
          placeholderTextColor={colorScheme === "dark" ? "#9ca3af" : "#6b7280"}
          secureTextEntry
          style={styles.input}
        />

        <TextInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Repeat password"
          placeholderTextColor={colorScheme === "dark" ? "#9ca3af" : "#6b7280"}
          secureTextEntry
          style={styles.input}
        />

        <TouchableOpacity style={styles.primaryButton} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryButtonText}>Save password</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styling = (colorScheme: string | null, insets: any) =>
  StyleSheet.create({
    appContainer: {
      flex: 1,
      backgroundColor: colorScheme === "dark" ? "#111827" : "#f4f3e9",
      paddingHorizontal: 20,
      justifyContent: "center",
      paddingBottom: Math.max(24, insets.bottom + 12),
    },
    card: {
      borderRadius: 24,
      padding: 22,
      backgroundColor: colorScheme === "dark" ? "#131d33" : "#ffffff",
      borderWidth: 1,
      borderColor: colorScheme === "dark" ? "#243047" : "#e5e7eb",
    },
    title: {
      fontSize: 30,
      color: colorScheme === "dark" ? "#fff" : "#111827",
      fontFamily: "Manrope_700Bold",
      marginBottom: 8,
    },
    subtitle: {
      color: colorScheme === "dark" ? "#9ca3af" : "#6b7280",
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 20,
      fontFamily: "Manrope_500Medium",
    },
    input: {
      borderWidth: 1,
      borderColor: colorScheme === "dark" ? "#243047" : "#d1d5db",
      borderRadius: 18,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 14,
      backgroundColor: colorScheme === "dark" ? "#0f172a" : "#f9fafb",
      color: colorScheme === "dark" ? "#fff" : "#111827",
      fontFamily: "Manrope_500Medium",
    },
    primaryButton: {
      marginTop: 8,
      backgroundColor: "#2563eb",
      borderRadius: 18,
      paddingVertical: 15,
      alignItems: "center",
    },
    primaryButtonText: {
      color: "#fff",
      fontSize: 16,
      fontFamily: "Manrope_700Bold",
    },
  });
