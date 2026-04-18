import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AppScreen, BackHeader } from "@/components/ui";
import { useAppState } from "@/lib/app-state";
import { formatApiError } from "@/lib/api";
import { colors } from "@/theme/colors";

export default function ResetPasswordScreen() {
  const { updatePassword } = useAppState();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <View style={styles.page}>
      <BackHeader title="Update Password" subtitle={undefined} />
      <AppScreen showPromo={false}>
        <Text style={styles.heading}>Update Password</Text>

        <View style={styles.inputRow}>
          <TextInput onChangeText={setCurrentPassword} placeholder="Enter current password" placeholderTextColor="#98a2b3" secureTextEntry style={styles.input} value={currentPassword} />
          <Ionicons color="#6366f1" name="eye-outline" size={18} />
        </View>
        <View style={styles.inputRow}>
          <TextInput onChangeText={setPassword} placeholder="Enter password" placeholderTextColor="#98a2b3" secureTextEntry style={styles.input} value={password} />
          <Ionicons color="#6366f1" name="eye-outline" size={18} />
        </View>
        <View style={styles.inputRow}>
          <TextInput onChangeText={setConfirmPassword} placeholder="Enter confirm password" placeholderTextColor="#98a2b3" secureTextEntry style={styles.input} value={confirmPassword} />
          <Ionicons color="#6366f1" name="eye-outline" size={18} />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}

        <Pressable
          onPress={async () => {
            try {
              setSubmitting(true);
              setError("");
              setMessage("");
              await updatePassword(currentPassword, password, confirmPassword);
              setCurrentPassword("");
              setPassword("");
              setConfirmPassword("");
              setMessage("Password updated successfully.");
            } catch (updateError) {
              setError(formatApiError(updateError, "Unable to update password"));
            } finally {
              setSubmitting(false);
            }
          }}
          style={[styles.primary, submitting && styles.disabled]}
        >
          {submitting ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryText}>Update Password</Text>}
        </Pressable>
      </AppScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background
  },
  heading: {
    textAlign: "center",
    color: "#111827",
    fontSize: 22,
    fontWeight: "900"
  },
  inputRow: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#dbe1ea",
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  input: {
    flex: 1,
    color: "#111827"
  },
  primary: {
    minHeight: 50,
    borderRadius: 999,
    backgroundColor: "#273caa",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8
  },
  disabled: {
    opacity: 0.7
  },
  primaryText: {
    color: colors.surface,
    fontWeight: "800"
  },
  error: {
    color: "#dc2626",
    fontWeight: "600"
  },
  success: {
    color: "#16a34a",
    fontWeight: "600"
  }
});
