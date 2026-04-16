import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BackHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { useAppState } from "@/lib/app-state";
import { colors } from "@/theme/colors";

type ChatMessage = {
  id: string;
  conversationId: string;
  senderRole: "user" | "support";
  senderUserId: string | null;
  text: string;
  readByUser: boolean;
  readByAdmin: boolean;
  createdAt: string;
};

const CHAT_REFRESH_INTERVAL_MS = 15_000;

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView | null>(null);
  const { sessionToken } = useAppState();
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!sessionToken) {
        return;
      }

      let active = true;
      void loadConversation(true);

      const interval = setInterval(() => {
        if (active) {
          void loadConversation(false);
        }
      }, CHAT_REFRESH_INTERVAL_MS);

      return () => {
        active = false;
        clearInterval(interval);
      };
    }, [sessionToken])
  );

  useEffect(() => {
    if (!messages.length) {
      return;
    }

    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 60);

    return () => clearTimeout(timer);
  }, [messages]);

  return (
    <View style={styles.page}>
      <BackHeader subtitle="Wallet, result, withdraw aur bid help" title="Support Chat" />

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.loadingText}>Support conversation load ho rahi hai...</Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.dateChip}>
            <Text style={styles.dateChipText}>Support Chat</Text>
          </View>

          {messages.map((message) => (
            <View
              key={message.id}
              style={[styles.messageWrap, message.senderRole === "user" ? styles.messageWrapUser : styles.messageWrapSupport]}
            >
              <View style={[styles.bubble, message.senderRole === "user" ? styles.userBubble : styles.supportBubble]}>
                <Text style={[styles.bubbleText, message.senderRole === "user" ? styles.userText : styles.supportText]}>{message.text}</Text>
                <Text style={[styles.metaText, message.senderRole === "user" ? styles.userMeta : styles.supportMeta]}>
                  {formatChatTime(message.createdAt)}
                </Text>
              </View>
            </View>
          ))}

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons color={colors.danger} name="alert-circle-outline" size={16} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}
        </ScrollView>
      )}

      <View style={[styles.footer, { bottom: keyboardHeight > 0 ? keyboardHeight + 8 : Math.max(insets.bottom + 82, 92) }]}>
        <View style={styles.inputWrap}>
          <TextInput
            blurOnSubmit={false}
            cursorColor={colors.primary}
            multiline
            onBlur={() => setFocused(false)}
            onChangeText={setDraft}
            onFocus={() => setFocused(true)}
            placeholder="Type your message"
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.primary}
            style={[styles.input, focused && styles.inputFocused]}
            value={draft}
          />
          <Pressable disabled={!draft.trim() || sending || !sessionToken} onPress={() => void handleSend()} style={[styles.sendButton, (!draft.trim() || sending) && styles.sendButtonMuted]}>
            {sending ? <ActivityIndicator color={colors.surface} size="small" /> : <Ionicons color={colors.surface} name="send" size={18} />}
          </Pressable>
        </View>
        <Text style={styles.powered}>Messages automatically refresh every few seconds</Text>
      </View>
    </View>
  );

  async function loadConversation(showLoader: boolean) {
    if (!sessionToken) {
      return;
    }

    try {
      if (showLoader) {
        setLoading(true);
      }
      const next = await api.getSupportConversation(sessionToken);
      setMessages(next.messages);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Support chat load nahi hua.");
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }

  async function handleSend() {
    if (!sessionToken || !draft.trim()) {
      return;
    }

    try {
      setSending(true);
      setError("");
      const text = draft.trim();
      setDraft("");
      await api.sendSupportMessage(sessionToken, text);
      await loadConversation(false);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Message send nahi hua.");
    } finally {
      setSending(false);
    }
  }
}

function formatChatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 24
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center"
  },
  body: { padding: 12, paddingBottom: 240, gap: 12 },
  dateChip: {
    alignSelf: "center",
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  dateChipText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: "800"
  },
  messageWrap: { width: "100%" },
  messageWrapUser: { alignItems: "flex-end" },
  messageWrapSupport: { alignItems: "flex-start" },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    maxWidth: "82%",
    gap: 8
  },
  supportBubble: { backgroundColor: colors.surface },
  userBubble: { backgroundColor: colors.primary },
  bubbleText: { lineHeight: 20 },
  supportText: { color: colors.textSecondary },
  userText: { color: colors.surface },
  metaText: { fontSize: 11 },
  supportMeta: { color: colors.textMuted },
  userMeta: { color: colors.whiteOverlayText },
  errorBox: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    backgroundColor: colors.dangerSoft,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "700"
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0
  },
  inputWrap: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  input: {
    flex: 1,
    minHeight: 54,
    maxHeight: 96,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    textAlignVertical: "top"
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceMuted
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  sendButtonMuted: {
    opacity: 0.7
  },
  powered: { textAlign: "center", color: colors.textMuted, fontSize: 12, paddingBottom: 8 }
});
