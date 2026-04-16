import { useEffect, useState } from "react";
import { Link, router } from "expo-router";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SurfaceCard } from "@/components/ui";
import { useAppState } from "@/lib/app-state";
import { colors } from "@/theme/colors";

export default function LoginScreen() {
  const { login, isAuthenticated, loading } = useAppState();
  const isWeb = Platform.OS === "web";
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const normalizedPhone = phone.replace(/[^0-9]/g, "");
  const hasValidPhone = normalizedPhone.length === 10;
  const hasPassword = password.trim().length > 0;

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.replace("/(tabs)");
    }
  }, [loading, isAuthenticated]);

  return (
    <View style={styles.page}>
      {isWeb ? (
        <View style={[styles.hero, styles.heroWeb]}>
          <Text style={styles.brand}>Real Matka</Text>
          <Text style={styles.tagline}>Secure login for wallet, bids, charts, and market play.</Text>
        </View>
      ) : (
        <LinearGradient colors={["#1e3a8a", "#2563eb", "#60a5fa"]} style={styles.hero}>
          <Text style={styles.brand}>Real Matka</Text>
          <Text style={styles.tagline}>Secure login for wallet, bids, charts, and market play.</Text>
        </LinearGradient>
      )}

      <View style={[styles.content, isWeb && styles.contentWeb]}>
        <SurfaceCard>
          <Text style={styles.title}>Login</Text>
          <Text style={styles.subtitle}>Use your registered phone number and password to continue.</Text>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              keyboardType="phone-pad"
              maxLength={10}
              onChangeText={(value) => {
                setPhone(value.replace(/[^0-9]/g, ""));
                setError("");
              }}
              placeholder="Enter phone number"
              placeholderTextColor="#94a3b8"
              style={styles.input}
              value={phone}
            />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              onChangeText={setPassword}
              onFocus={() => setError("")}
              placeholder="Enter password"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              style={styles.input}
              value={password}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={async () => {
              if (!hasValidPhone) {
                setError("Valid 10 digit phone number dalo.");
                return;
              }
              if (!hasPassword) {
                setError("Password dalo.");
                return;
              }
              try {
                setSubmitting(true);
                setError("");
                await login(normalizedPhone, password.trim());
                router.replace("/(tabs)");
              } catch (loginError) {
                setError(loginError instanceof Error ? loginError.message : "Login failed");
              } finally {
                setSubmitting(false);
              }
            }}
            disabled={submitting || !hasValidPhone || !hasPassword}
            style={[styles.primaryButton, (submitting || !hasValidPhone || !hasPassword) && styles.disabled]}
          >
            {submitting ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryText}>Continue</Text>}
          </Pressable>

          <Link href="/auth/register" style={styles.link}>
            Create new account
          </Link>

          <Link href="/auth/otp-login" style={styles.link}>
            Login with OTP
          </Link>

          <Link href="/auth/forgot-password" style={styles.link}>
            Forgot password
          </Link>
        </SurfaceCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background
  },
  hero: {
    paddingTop: 64,
    paddingBottom: 84,
    paddingHorizontal: 22
  },
  heroWeb: {
    backgroundColor: colors.primary,
    paddingBottom: 44
  },
  brand: {
    color: colors.surface,
    fontSize: 30,
    fontWeight: "900"
  },
  tagline: {
    marginTop: 10,
    maxWidth: 280,
    color: "rgba(255,255,255,0.9)",
    lineHeight: 20
  },
  content: {
    marginTop: -42,
    paddingHorizontal: 16,
    paddingBottom: 32
  },
  contentWeb: {
    maxWidth: 480,
    width: "100%",
    alignSelf: "center"
  },
  title: {
    color: "#111827",
    fontSize: 24,
    fontWeight: "800"
  },
  subtitle: {
    color: "#64748b",
    lineHeight: 20
  },
  fieldWrap: {
    gap: 8
  },
  label: {
    color: "#0f172a",
    fontWeight: "700"
  },
  input: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dbe1ea",
    paddingHorizontal: 14,
    color: "#111827",
    backgroundColor: "#f8fafc"
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  disabled: {
    opacity: 0.7
  },
  primaryText: {
    color: colors.surface,
    fontWeight: "800",
    fontSize: 15
  },
  error: {
    color: "#dc2626",
    fontWeight: "600"
  },
  link: {
    color: colors.primary,
    fontWeight: "700",
    textAlign: "center"
  }
});
