import { useEffect, useState } from "react";
import { Link, router } from "expo-router";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AppScreen, SurfaceCard } from "@/components/ui";
import { useAppState } from "@/lib/app-state";
import { api, formatApiError } from "@/lib/api";
import { colors } from "@/theme/colors";

export default function OtpLoginScreen() {
  const { otpLogin, isAuthenticated, loading } = useAppState();
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const normalizedPhone = phone.replace(/[^0-9]/g, "");
  const normalizedOtp = otp.replace(/[^0-9]/g, "");
  const hasValidPhone = normalizedPhone.length === 10;
  const hasValidOtp = normalizedOtp.length === 6;

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/(tabs)");
    }
  }, [loading, isAuthenticated]);

  return (
    <View style={styles.page}>
      <LinearGradient colors={[colors.gradientStart, colors.gradientEnd]} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.hero}>
        <Image source={require("../../assets/images/adaptive-icon.png")} style={styles.logo} resizeMode="contain" />
        <Text style={styles.tagline}>OTP se fast login karo. Phone number verify hone ke baad direct access mil jayega.</Text>
      </LinearGradient>

      <AppScreen padded={false} showPromo={false}>
        <View style={styles.content}>
          <SurfaceCard>
            <Text style={styles.title}>OTP Login</Text>
            <Text style={styles.subtitle}>Phone number dalo, OTP lo, phir login karo.</Text>

            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              keyboardType="phone-pad"
              maxLength={10}
              onChangeText={(value) => {
                setPhone(value.replace(/[^0-9]/g, ""));
                setError("");
              }}
              style={styles.input}
              value={phone}
              placeholder="Enter phone number"
              placeholderTextColor="#94a3b8"
            />

            <Pressable
              disabled={sendingOtp || !hasValidPhone}
              style={[styles.secondaryButton, (sendingOtp || !hasValidPhone) && styles.disabled]}
              onPress={async () => {
                if (!hasValidPhone) {
                  setError("Valid 10 digit phone number dalo.");
                  return;
                }
                try {
                  setSendingOtp(true);
                  setError("");
                  setMessage("");
                  const response = await api.requestOtp(phone, "login");
                  setMessage(response.provider === "twilio" ? "OTP SMS successfully sent." : "OTP generated successfully.");
                } catch (otpError) {
                  setError(formatApiError(otpError, "Unable to send OTP"));
                } finally {
                  setSendingOtp(false);
                }
              }}
            >
              <Text style={styles.secondaryText}>Send OTP</Text>
            </Pressable>

            <Text style={styles.label}>OTP</Text>
            <TextInput
              keyboardType="number-pad"
              maxLength={6}
              onChangeText={(value) => {
                setOtp(value.replace(/[^0-9]/g, ""));
                setError("");
              }}
              style={styles.input}
              value={otp}
              placeholder="Enter 6 digit OTP"
              placeholderTextColor="#94a3b8"
            />

            {message ? <Text style={styles.success}>{message}</Text> : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
            onPress={async () => {
              if (!hasValidPhone) {
                setError("Valid 10 digit phone number dalo.");
                return;
              }
              if (!hasValidOtp) {
                setError("Valid 6 digit OTP dalo.");
                return;
              }
              try {
                setLoggingIn(true);
                setError("");
                await otpLogin(normalizedPhone, normalizedOtp);
                router.replace("/(tabs)");
              } catch (loginError) {
                setError(formatApiError(loginError, "OTP login failed"));
              } finally {
                setLoggingIn(false);
                }
              }}
              disabled={loggingIn || sendingOtp || !hasValidPhone || !hasValidOtp}
              style={[styles.primaryButton, (loggingIn || sendingOtp || !hasValidPhone || !hasValidOtp) && styles.disabled]}
            >
              {loggingIn ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryText}>Login with OTP</Text>}
            </Pressable>

            <Link href="/auth/login" style={styles.link}>
              Back to password login
            </Link>
          </SurfaceCard>
        </View>
      </AppScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  hero: { paddingTop: 52, paddingBottom: 48, paddingHorizontal: 22, backgroundColor: colors.gradientStart },
  logo: { width: 280, height: 110, marginTop: 20, marginBottom: 0 },
  tagline: { maxWidth: 320, color: colors.whiteOverlayTextStrong, lineHeight: 20, marginTop: -14 },
  content: { marginTop: 0, paddingHorizontal: 16, paddingBottom: 32 },
  title: { color: "#111827", fontSize: 24, fontWeight: "800" },
  subtitle: { color: "#64748b", lineHeight: 20 },
  label: { color: "#0f172a", fontWeight: "700" },
  input: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: "#dbe1ea", paddingHorizontal: 14, color: "#111827", backgroundColor: "#f8fafc" },
  primaryButton: { minHeight: 48, borderRadius: 999, backgroundColor: "#111827", alignItems: "center", justifyContent: "center" },
  secondaryButton: { minHeight: 46, borderRadius: 14, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#dbe1ea", alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#ffffff", fontWeight: "800", fontSize: 15 },
  secondaryText: { color: "#111827", fontWeight: "800" },
  disabled: { opacity: 0.7 },
  error: { color: "#dc2626", fontWeight: "600" },
  success: { color: "#16a34a", fontWeight: "600" },
  link: { color: "#111827", fontWeight: "700", textAlign: "center" }
});
