import { useEffect, useState } from "react";
import { Link, router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { AppScreen, SurfaceCard } from "@/components/ui";
import { useAppState } from "@/lib/app-state";
import { api } from "@/lib/api";
import { clearStoredReferralCode, normalizeReferralCode, readStoredReferralCode, writeStoredReferralCode } from "@/lib/referral-storage";
import { colors } from "@/theme/colors";

export default function RegisterScreen() {
  const { register } = useAppState();
  const params = useLocalSearchParams<{ ref?: string; referenceCode?: string; referralCode?: string }>();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [referenceCode, setReferenceCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [registered, setRegistered] = useState(false);
  const incomingReferralCode = normalizeReferralCode(params.ref ?? params.referenceCode ?? params.referralCode);
  const downloadUrl = String(process.env.EXPO_PUBLIC_DOWNLOAD_URL || process.env.EXPO_PUBLIC_APP_DOWNLOAD_URL || "").trim();
  const normalizedPhone = phone.replace(/[^0-9]/g, "");
  const normalizedOtp = otp.replace(/[^0-9]/g, "");
  const normalizedFirstName = firstName.trim();
  const normalizedLastName = lastName.trim();
  const hasValidFirstName = normalizedFirstName.length >= 2;
  const hasValidLastName = normalizedLastName.length >= 2;
  const hasValidPhone = normalizedPhone.length === 10;
  const hasValidOtp = normalizedOtp.length === 6;
  const hasValidPassword = password.trim().length >= 4;
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  useEffect(() => {
    let active = true;

    void (async () => {
      if (incomingReferralCode) {
        setReferenceCode(incomingReferralCode);
        await writeStoredReferralCode(incomingReferralCode);
        return;
      }

      const storedCode = await readStoredReferralCode();
      if (active && storedCode && !referenceCode) {
        setReferenceCode(storedCode);
      }
    })();

    return () => {
      active = false;
    };
  }, [incomingReferralCode, referenceCode]);

  return (
    <View style={styles.page}>
      <View style={styles.hero}>
        <Text style={styles.brand}>Real Matka</Text>
        <Text style={styles.tagline}>Register with mobile number and password. OTP verification required hai.</Text>
      </View>

      <AppScreen padded={false} showPromo={false}>
        <View style={styles.content}>
          <SurfaceCard>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Reference code optional hai. Account create karne se pehle mobile OTP verify karna hoga.</Text>
            {referenceCode ? <Text style={styles.autoReferralHint}>Referral code auto-filled hai. Is account par yehi code apply hoga.</Text> : null}

            <View style={styles.fieldWrap}>
              <Text style={styles.label}>First Name</Text>
              <TextInput
                onChangeText={(value) => {
                  setFirstName(value);
                  setError("");
                }}
                placeholder="Enter first name"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                value={firstName}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Last Name</Text>
              <TextInput
                onChangeText={(value) => {
                  setLastName(value);
                  setError("");
                }}
                placeholder="Enter last name"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                value={lastName}
              />
            </View>

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

            <Pressable
              onPress={async () => {
                if (!hasValidFirstName) {
                  setError("Valid first name dalo.");
                  return;
                }
                if (!hasValidLastName) {
                  setError("Valid last name dalo.");
                  return;
                }
                if (!hasValidPhone) {
                  setError("Valid 10 digit phone number dalo.");
                  return;
                }
                try {
                  setSendingOtp(true);
                  setError("");
                  setSuccess("");
                  const response = await api.requestOtp(normalizedPhone, "register");
                  setSuccess(response.provider === "twilio" ? "Registration OTP SMS successfully sent." : "Registration OTP generated successfully.");
                } catch (otpError) {
                  setError(otpError instanceof Error ? otpError.message : "Unable to send registration OTP");
                } finally {
                  setSendingOtp(false);
                }
              }}
              disabled={sendingOtp || !hasValidFirstName || !hasValidLastName || !hasValidPhone}
              style={[styles.secondaryButton, (sendingOtp || !hasValidFirstName || !hasValidLastName || !hasValidPhone) && styles.disabled]}
            >
              {sendingOtp ? <ActivityIndicator color="#111827" /> : <Text style={styles.secondaryText}>Send OTP</Text>}
            </Pressable>

            <View style={styles.fieldWrap}>
              <Text style={styles.label}>OTP</Text>
              <TextInput
                keyboardType="number-pad"
                maxLength={6}
                onChangeText={(value) => {
                  setOtp(value.replace(/[^0-9]/g, ""));
                  setError("");
                }}
                placeholder="Enter 6 digit OTP"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                value={otp}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                onChangeText={setPassword}
                placeholder="Enter password"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                style={styles.input}
                value={password}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                onChangeText={setConfirmPassword}
                placeholder="Confirm password"
                placeholderTextColor="#94a3b8"
                secureTextEntry
                style={styles.input}
                value={confirmPassword}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Reference Code (Optional)</Text>
              <TextInput
                autoCapitalize="characters"
                onChangeText={(value) => {
                  const normalized = normalizeReferralCode(value);
                  setReferenceCode(normalized);
                  void writeStoredReferralCode(normalized);
                }}
                placeholder="Enter reference code if you have one"
                placeholderTextColor="#94a3b8"
                style={styles.input}
                value={referenceCode}
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            {success ? <Text style={styles.success}>{success}</Text> : null}
            {registered ? (
              <View style={styles.nextStepsWrap}>
                <Pressable onPress={() => router.push("/auth/login")} style={styles.primaryButton}>
                  <Text style={styles.primaryText}>Go to Login</Text>
                </Pressable>
                {downloadUrl ? (
                  <Pressable
                    onPress={() => {
                      void Linking.openURL(downloadUrl);
                    }}
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryText}>Download App</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            <Pressable
              onPress={async () => {
                if (!hasValidFirstName) {
                  setError("Valid first name dalo.");
                  return;
                }
                if (!hasValidLastName) {
                  setError("Valid last name dalo.");
                  return;
                }
                if (!hasValidPhone) {
                  setError("Valid 10 digit phone number dalo.");
                  return;
                }
                if (!hasValidOtp) {
                  setError("Valid 6 digit OTP dalo.");
                  return;
                }
                if (!hasValidPassword) {
                  setError("Password kam se kam 4 characters ka hona chahiye.");
                  return;
                }
                if (!passwordsMatch) {
                  setError("Password aur confirm password same dalo.");
                  return;
                }
                try {
                  setSubmitting(true);
                  setError("");
                  setSuccess("");
                  await register(normalizedFirstName, normalizedLastName, normalizedPhone, normalizedOtp, password.trim(), confirmPassword.trim(), referenceCode);
                  await clearStoredReferralCode();
                  setRegistered(true);
                  setSuccess("Phone verified. Account created successfully. Ab aap direct login kar sakte ho.");
                  setFirstName("");
                  setLastName("");
                  setPhone("");
                  setOtp("");
                  setPassword("");
                  setConfirmPassword("");
                  setReferenceCode("");
                } catch (registrationError) {
                  setError(registrationError instanceof Error ? registrationError.message : "Registration failed");
                } finally {
                  setSubmitting(false);
                }
              }}
              style={[styles.primaryButton, (submitting || registered || !hasValidFirstName || !hasValidLastName || !hasValidPhone || !hasValidOtp || !hasValidPassword || !passwordsMatch) && styles.disabled]}
              disabled={registered || submitting || !hasValidFirstName || !hasValidLastName || !hasValidPhone || !hasValidOtp || !hasValidPassword || !passwordsMatch}
            >
              {submitting ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryText}>Create Account</Text>}
            </Pressable>

            <Link href="/auth/login" style={styles.link}>
              Already have an account? Login
            </Link>
          </SurfaceCard>
        </View>
      </AppScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background
  },
  hero: {
    paddingTop: 52,
    paddingBottom: 48,
    paddingHorizontal: 22,
    backgroundColor: "#ffffff"
  },
  brand: {
    color: "#111827",
    fontSize: 30,
    fontWeight: "900"
  },
  tagline: {
    marginTop: 10,
    maxWidth: 320,
    color: "#6b7280",
    lineHeight: 20
  },
  content: {
    marginTop: 0,
    paddingHorizontal: 16,
    paddingBottom: 32
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
  autoReferralHint: {
    color: "#15803d",
    fontWeight: "700",
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
  secondaryButton: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#dbe1ea",
    alignItems: "center",
    justifyContent: "center"
  },
  secondaryText: {
    color: "#111827",
    fontWeight: "800",
    fontSize: 15
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
  success: {
    color: "#15803d",
    fontWeight: "600"
  },
  nextStepsWrap: {
    gap: 10
  },
  link: {
    color: colors.primary,
    fontWeight: "700",
    textAlign: "center"
  }
});
