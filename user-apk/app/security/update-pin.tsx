import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { AppScreen, BackHeader } from "@/components/ui";
import { useAppState } from "@/lib/app-state";
import { colors } from "@/theme/colors";

export default function UpdatePinScreen() {
  const { updateMpin } = useAppState();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function appendDigit(digit: string) {
    if (pin.length < 4) {
      setPin((current) => `${current}${digit}`);
      return;
    }
    if (confirmPin.length < 4) {
      setConfirmPin((current) => `${current}${digit}`);
    }
  }

  function backspace() {
    if (confirmPin.length > 0) {
      setConfirmPin((current) => current.slice(0, -1));
      return;
    }
    if (pin.length > 0) {
      setPin((current) => current.slice(0, -1));
    }
  }

  return (
    <View style={styles.page}>
      <BackHeader title="Update PIN" subtitle={undefined} />
      <AppScreen showPromo={false}>
        <Text style={styles.heading}>Update MPIN</Text>

        <Text style={styles.label}>New MPIN</Text>
        <View style={styles.pinWrap}>
          {[0, 1, 2, 3].map((index) => (
            <View key={`pin-${index}`} style={styles.pinCell}>
              <Text style={styles.pinText}>{pin[index] ? "*" : ""}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.label}>Confirm MPIN</Text>
        <View style={styles.pinWrap}>
          {[0, 1, 2, 3].map((index) => (
            <View key={`confirm-${index}`} style={styles.pinCell}>
              <Text style={styles.pinText}>{confirmPin[index] ? "*" : ""}</Text>
            </View>
          ))}
        </View>

        <View style={styles.keypad}>
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "X", "0", "⌫"].map((key) => (
            <Pressable
              key={key}
              onPress={() => {
                if (key === "X") {
                  setPin("");
                  setConfirmPin("");
                  return;
                }
                if (key === "⌫") {
                  backspace();
                  return;
                }
                appendDigit(key);
              }}
              style={styles.key}
            >
              <Text style={styles.keyText}>{key}</Text>
            </Pressable>
          ))}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}

        <Pressable
          onPress={async () => {
            try {
              setSubmitting(true);
              setError("");
              setMessage("");
              await updateMpin(pin, confirmPin);
              setPin("");
              setConfirmPin("");
              setMessage("PIN updated successfully.");
            } catch (updateError) {
              setError(updateError instanceof Error ? updateError.message : "Unable to update PIN");
            } finally {
              setSubmitting(false);
            }
          }}
          style={[styles.primary, submitting && styles.disabled]}
        >
          {submitting ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryText}>Update MPIN</Text>}
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
  label: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "700"
  },
  pinWrap: {
    minHeight: 64,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "#273caa",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: colors.surface
  },
  pinCell: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#eef2f7",
    alignItems: "center",
    justifyContent: "center"
  },
  pinText: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "800"
  },
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between"
  },
  key: {
    width: "30%",
    minHeight: 42,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center"
  },
  keyText: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "700"
  },
  primary: {
    minHeight: 50,
    borderRadius: 999,
    backgroundColor: "#273caa",
    alignItems: "center",
    justifyContent: "center"
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
