import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, api, setAuthFailureListener, type BankAccount, type BidEntry, type SessionUser, type WalletEntry } from "@/lib/api";
import { readStoredMpinConfigured, writeStoredMpinConfigured } from "@/lib/security-storage";
import { clearStoredSessionToken, readStoredSessionToken, writeStoredSessionToken } from "@/lib/session-storage";

type DraftBid = {
  market: string;
  boardLabel: string;
  sessionType: "Open" | "Close" | "NA";
  items: Array<{ digit: string; points: number; gameType: string }>;
};

type AppStateValue = {
  currentUser: SessionUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  sessionToken: string;
  walletBalance: number;
  walletEntries: WalletEntry[];
  bids: BidEntry[];
  bankAccounts: BankAccount[];
  draftBid: DraftBid | null;
  login: (phone: string, password: string) => Promise<void>;
  otpLogin: (phone: string, otp: string) => Promise<void>;
  register: (firstName: string, lastName: string, phone: string, otp: string, password: string, confirmPassword: string, referenceCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  reloadSessionData: (options?: { force?: boolean }) => Promise<void>;
  updatePassword: (currentPassword: string, password: string, confirmPassword: string) => Promise<void>;
  updateMpin: (pin: string, confirmPin: string) => Promise<void>;
  verifyMpin: (pin: string) => Promise<void>;
  addBankAccount: (accountNumber: string, holderName: string, ifsc: string) => Promise<void>;
  requestWithdrawOtp: (amount: number) => Promise<{ sent: boolean; expiresAt: string; provider: string; devCode: string | null }>;
  confirmWithdraw: (amount: number, otp: string) => Promise<void>;
  setDraftBid: (draft: DraftBid | null) => void;
  submitDraftBid: () => Promise<void>;
};

const AppStateContext = createContext<AppStateValue | null>(null);
const SESSION_REFRESH_STALE_MS = 15_000;

function ensureMessage(value: unknown, fallback: string) {
  return value instanceof Error ? value.message : fallback;
}

function mergeUser(baseUser: SessionUser | null, nextUser: SessionUser | null, walletBalance: number) {
  if (!nextUser) {
    return null;
  }

  return {
    ...baseUser,
    ...nextUser,
    walletBalance
  };
}

function isAuthFailure(error: unknown) {
  if (error instanceof ApiError) {
    return error.isAuthError;
  }

  return String(ensureMessage(error, "")).toLowerCase().includes("unauthorized");
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [sessionToken, setSessionToken] = useState("");
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletEntries, setWalletEntries] = useState<WalletEntry[]>([]);
  const [bids, setBids] = useState<BidEntry[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [draftBid, setDraftBid] = useState<DraftBid | null>(null);
  const lastSessionReloadAtRef = useRef(0);
  const sessionReloadPromiseRef = useRef<Promise<void> | null>(null);

  const clearSession = useCallback(async () => {
    setSessionToken("");
    setCurrentUser(null);
    setWalletBalance(0);
    setWalletEntries([]);
    setBids([]);
    setBankAccounts([]);
    setDraftBid(null);
    lastSessionReloadAtRef.current = 0;
    sessionReloadPromiseRef.current = null;
    await clearStoredSessionToken();
  }, []);

  const hydrateSession = useCallback(
    async (token: string) => {
      const me = await api.me(token);
      const [walletHistory, bidHistory, bankList, mpinConfigured] = await Promise.all([
        api.walletHistory(token),
        api.bidHistory(token),
        api.listBankAccounts(token),
        readStoredMpinConfigured(me.id)
      ]);

      const resolvedBalance = typeof me.walletBalance === "number" ? me.walletBalance : 0;
      const mergedUser = {
        ...me,
        hasMpin: Boolean(me.hasMpin || mpinConfigured),
        walletBalance: resolvedBalance
      };

      setSessionToken(token);
      setCurrentUser(mergedUser);
      setWalletBalance(resolvedBalance);
      setWalletEntries(walletHistory);
      setBids(bidHistory);
      setBankAccounts(bankList);
      lastSessionReloadAtRef.current = Date.now();
    },
    []
  );

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const storedToken = await readStoredSessionToken();
        if (!active) {
          return;
        }

        if (!storedToken) {
          setLoading(false);
          return;
        }

        await hydrateSession(storedToken);
      } catch {
        if (active) {
          await clearSession();
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [clearSession, hydrateSession]);

  useEffect(() => {
    let clearing = false;

    setAuthFailureListener(() => {
      if (clearing) {
        return;
      }

      clearing = true;
      void clearSession().finally(() => {
        clearing = false;
      });
    });

    return () => {
      setAuthFailureListener(null);
    };
  }, [clearSession]);

  const login = useCallback(
    async (phone: string, password: string) => {
      const response = await api.login(phone, password);
      await writeStoredSessionToken(response.token);
      await hydrateSession(response.token);
    },
    [hydrateSession]
  );

  const otpLogin = useCallback(
    async (phone: string, otp: string) => {
      const response = await api.otpLogin(phone, otp);
      await writeStoredSessionToken(response.token);
      await hydrateSession(response.token);
    },
    [hydrateSession]
  );

  const register = useCallback(
    async (firstName: string, lastName: string, phone: string, otp: string, password: string, confirmPassword: string, referenceCode = "") => {
      await api.register(firstName, lastName, phone, otp, password, confirmPassword, referenceCode);
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      if (sessionToken) {
        await api.logout(sessionToken);
      }
    } catch {
      // Ignore logout network failure and clear local session anyway.
    } finally {
      await clearSession();
    }
  }, [clearSession, sessionToken]);

  const reloadSessionData = useCallback(async (options?: { force?: boolean }) => {
    if (!sessionToken) {
      return;
    }

    const force = Boolean(options?.force);
    if (!force && Date.now() - lastSessionReloadAtRef.current < SESSION_REFRESH_STALE_MS) {
      return;
    }

    if (sessionReloadPromiseRef.current) {
      return sessionReloadPromiseRef.current;
    }

    sessionReloadPromiseRef.current = (async () => {
      try {
        const [me, walletHistory, bidHistory, bankList] = await Promise.all([
          api.me(sessionToken),
          api.walletHistory(sessionToken),
          api.bidHistory(sessionToken),
          api.listBankAccounts(sessionToken)
        ]);

        const resolvedBalance = typeof me.walletBalance === "number" ? me.walletBalance : walletBalance;
        setCurrentUser((existing) => mergeUser(existing, me, resolvedBalance));
        setWalletBalance(resolvedBalance);
        setWalletEntries(walletHistory);
        setBids(bidHistory);
        setBankAccounts(bankList);
        lastSessionReloadAtRef.current = Date.now();
      } catch (error) {
        if (isAuthFailure(error)) {
          await clearSession();
        }
        throw error;
      } finally {
        sessionReloadPromiseRef.current = null;
      }
    })();

    return sessionReloadPromiseRef.current;
  }, [clearSession, sessionToken, walletBalance]);

  const updatePassword = useCallback(
    async (currentPassword: string, password: string, confirmPassword: string) => {
      if (!sessionToken) {
        throw new Error("Login required");
      }
      try {
        await api.updatePassword(sessionToken, currentPassword, password, confirmPassword);
      } catch (error) {
        if (isAuthFailure(error)) {
          await clearSession();
        }
        throw error;
      }
    },
    [clearSession, sessionToken]
  );

  const updateMpin = useCallback(
    async (pin: string, confirmPin: string) => {
      if (!sessionToken || !currentUser) {
        throw new Error("Login required");
      }

      try {
        await api.updateMpin(sessionToken, pin, confirmPin);
      } catch (error) {
        if (isAuthFailure(error)) {
          await clearSession();
        }
        throw error;
      }
      await writeStoredMpinConfigured(currentUser.id, true);
      setCurrentUser((existing) => (existing ? { ...existing, hasMpin: true } : existing));
    },
    [clearSession, currentUser, sessionToken]
  );

  const verifyMpin = useCallback(
    async (pin: string) => {
      if (!sessionToken) {
        throw new Error("Login required");
      }

      try {
        await api.verifyMpin(sessionToken, pin);
      } catch (error) {
        if (isAuthFailure(error)) {
          await clearSession();
        }
        throw error;
      }
    },
    [clearSession, sessionToken]
  );

  const addBankAccount = useCallback(
    async (accountNumber: string, holderName: string, ifsc: string) => {
      if (!sessionToken) {
        throw new Error("Login required");
      }

      let account: BankAccount;
      try {
        account = await api.addBankAccount(sessionToken, accountNumber, holderName, ifsc);
      } catch (error) {
        if (isAuthFailure(error)) {
          await clearSession();
        }
        throw error;
      }
      setBankAccounts((existing) => [account, ...existing.filter((item) => item.id !== account.id)]);
    },
    [clearSession, sessionToken]
  );

  const requestWithdrawOtp = useCallback(
    async (amount: number) => {
      if (!sessionToken) {
        throw new Error("Login required");
      }

      try {
        return await api.requestWithdrawOtp(sessionToken, amount);
      } catch (error) {
        if (isAuthFailure(error)) {
          await clearSession();
        }
        throw error;
      }
    },
    [clearSession, sessionToken]
  );

  const confirmWithdraw = useCallback(
    async (amount: number, otp: string) => {
      if (!sessionToken) {
        throw new Error("Login required");
      }

      let entry: WalletEntry;
      try {
        entry = await api.confirmWithdraw(sessionToken, amount, otp);
      } catch (error) {
        if (isAuthFailure(error)) {
          await clearSession();
        }
        throw error;
      }
      setWalletEntries((existing) => [entry, ...existing]);
      await reloadSessionData({ force: true });
    },
    [clearSession, reloadSessionData, sessionToken]
  );

  const submitDraftBid = useCallback(async () => {
    if (!sessionToken) {
      throw new Error("Login required");
    }
    if (!draftBid || !draftBid.items.length) {
      throw new Error("No bid selected");
    }

    try {
      await api.placeBids(sessionToken, draftBid);
    } catch (error) {
      if (isAuthFailure(error)) {
        await clearSession();
      }
      throw error;
    }
    setDraftBid(null);
    await reloadSessionData({ force: true });
  }, [clearSession, draftBid, reloadSessionData, sessionToken]);

  const value = useMemo<AppStateValue>(
    () => ({
      currentUser,
      loading,
      isAuthenticated: Boolean(sessionToken && currentUser),
      sessionToken,
      walletBalance,
      walletEntries,
      bids,
      bankAccounts,
      draftBid,
      login,
      otpLogin,
      register,
      logout,
      reloadSessionData,
      updatePassword,
      updateMpin,
      verifyMpin,
      addBankAccount,
      requestWithdrawOtp,
      confirmWithdraw,
      setDraftBid,
      submitDraftBid
    }),
    [
      addBankAccount,
      bankAccounts,
      bids,
      currentUser,
      draftBid,
      loading,
      login,
      logout,
      otpLogin,
      confirmWithdraw,
      register,
      reloadSessionData,
      requestWithdrawOtp,
      sessionToken,
      submitDraftBid,
      updateMpin,
      updatePassword,
      verifyMpin,
      walletBalance,
      walletEntries
    ]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppState must be used inside AppStateProvider");
  }
  return context;
}
