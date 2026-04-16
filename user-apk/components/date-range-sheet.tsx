import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "@/components/ui";
import { colors } from "@/theme/colors";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type Props = {
  open: boolean;
  title: string;
  subtitle: string;
  fromDate: string;
  toDate: string;
  onChangeFrom: (value: string) => void;
  onChangeTo: (value: string) => void;
  onClose: () => void;
  onApply: () => void;
  onClear: () => void;
  canApply: boolean;
};

function parseDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return null;
  }
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildMonthDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const days: Array<Date | null> = [];
  const leading = (firstDay.getDay() + 6) % 7;

  for (let index = 0; index < leading; index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    days.push(new Date(month.getFullYear(), month.getMonth(), day));
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}

export function DateRangeSheet({
  open,
  title,
  subtitle,
  fromDate,
  toDate,
  onChangeFrom,
  onChangeTo,
  onClose,
  onApply,
  onClear,
  canApply
}: Props) {
  const [activeField, setActiveField] = useState<"from" | "to">("from");
  const today = new Date();
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initial = parseDateInput(toDate) ?? parseDateInput(fromDate) ?? new Date();
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });
  const [pickerMode, setPickerMode] = useState<"month" | "year" | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const initial = parseDateInput(activeField === "from" ? fromDate : toDate) ?? parseDateInput(toDate) ?? parseDateInput(fromDate) ?? new Date();
    setVisibleMonth(new Date(initial.getFullYear(), initial.getMonth(), 1));
    setPickerMode(null);
  }, [activeField, fromDate, open, toDate]);

  const days = useMemo(() => buildMonthDays(visibleMonth), [visibleMonth]);
  const selectedFrom = parseDateInput(fromDate);
  const selectedTo = parseDateInput(toDate);
  const visibleYears = useMemo(() => {
    const currentYear = today.getFullYear();
    return Array.from({ length: 8 }, (_, index) => currentYear - 7 + index);
  }, [today]);
  const canGoNextMonth = visibleMonth < currentMonth;

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={open}>
      <View style={styles.overlay}>
        <Pressable onPress={onClose} style={styles.backdrop} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons color="#111827" name="close" size={20} />
            </Pressable>
          </View>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <View style={styles.fieldRow}>
            <Pressable onPress={() => setActiveField("from")} style={[styles.fieldCard, activeField === "from" && styles.fieldCardActive]}>
              <Text style={styles.fieldLabel}>From</Text>
              <Text style={styles.fieldValue}>{fromDate || "Select start date"}</Text>
            </Pressable>
            <Pressable onPress={() => setActiveField("to")} style={[styles.fieldCard, activeField === "to" && styles.fieldCardActive]}>
              <Text style={styles.fieldLabel}>To</Text>
              <Text style={styles.fieldValue}>{toDate || "Select end date"}</Text>
            </Pressable>
          </View>

          <View style={styles.controlsRow}>
            <Pressable onPress={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))} style={styles.arrowButton}>
              <Ionicons color={colors.primaryDark} name="chevron-back" size={18} />
            </Pressable>
            <Pressable onPress={() => setPickerMode((current) => (current === "month" ? null : "month"))} style={styles.selectorButton}>
              <Text style={styles.selectorText}>{MONTHS[visibleMonth.getMonth()]}</Text>
              <Ionicons color={colors.primaryDark} name="chevron-down" size={14} />
            </Pressable>
            <Pressable onPress={() => setPickerMode((current) => (current === "year" ? null : "year"))} style={styles.selectorButton}>
              <Text style={styles.selectorText}>{visibleMonth.getFullYear()}</Text>
              <Ionicons color={colors.primaryDark} name="chevron-down" size={14} />
            </Pressable>
            <Pressable disabled={!canGoNextMonth} onPress={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))} style={[styles.arrowButton, !canGoNextMonth && styles.arrowButtonDisabled]}>
              <Ionicons color={canGoNextMonth ? colors.primaryDark : "#98a2b3"} name="chevron-forward" size={18} />
            </Pressable>
          </View>

          {pickerMode === "month" ? (
            <View style={styles.selectorGrid}>
              {MONTHS.map((month, index) => (
                (() => {
                  const monthDate = new Date(visibleMonth.getFullYear(), index, 1);
                  const disabled = monthDate > currentMonth;
                  return (
                <Pressable
                  key={month}
                  disabled={disabled}
                  onPress={() => {
                    setVisibleMonth(new Date(visibleMonth.getFullYear(), index, 1));
                    setPickerMode(null);
                  }}
                  style={[styles.selectorChip, visibleMonth.getMonth() === index && styles.selectorChipActive, disabled && styles.selectorChipDisabled]}
                >
                  <Text style={[styles.selectorChipText, visibleMonth.getMonth() === index && styles.selectorChipTextActive, disabled && styles.selectorChipTextDisabled]}>{month}</Text>
                </Pressable>
                  );
                })()
              ))}
            </View>
          ) : null}

          {pickerMode === "year" ? (
            <View style={styles.selectorGrid}>
              {visibleYears.map((year) => (
                <Pressable
                  key={year}
                  disabled={year > today.getFullYear()}
                  onPress={() => {
                    setVisibleMonth(new Date(year, visibleMonth.getMonth(), 1));
                    setPickerMode(null);
                  }}
                  style={[styles.selectorChip, visibleMonth.getFullYear() === year && styles.selectorChipActive, year > today.getFullYear() && styles.selectorChipDisabled]}
                >
                  <Text style={[styles.selectorChipText, visibleMonth.getFullYear() === year && styles.selectorChipTextActive, year > today.getFullYear() && styles.selectorChipTextDisabled]}>{year}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <View style={styles.weekdays}>
            {WEEKDAYS.map((day) => (
              <Text key={day} style={styles.weekday}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {days.map((day, index) => {
              if (!day) {
                return <View key={`empty-${index}`} style={styles.dayCell} />;
              }

              const dateValue = formatDate(day);
              const isSelected = dateValue === fromDate || dateValue === toDate;
              const isInRange = selectedFrom && selectedTo && day >= selectedFrom && day <= selectedTo;
              const isToday = dateValue === formatDate(new Date());
              const isFuture = day > today;

              return (
                <Pressable
                  key={dateValue}
                  disabled={isFuture}
                  onPress={() => {
                    if (activeField === "from") {
                      onChangeFrom(dateValue);
                    } else {
                      onChangeTo(dateValue);
                    }
                  }}
                  style={[styles.dayCell, isInRange && styles.dayCellRange, isSelected && styles.dayCellSelected, isToday && !isSelected && styles.todayCell, isFuture && styles.dayCellDisabled]}
                >
                  <Text style={[styles.dayText, isSelected && styles.dayTextSelected, isFuture && styles.dayTextDisabled]}>{day.getDate()}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.hint}>{canApply ? "Search dabane ke baad selected range ka data dikhega." : "Start aur end date calendar se select karo."}</Text>

          <View style={styles.actions}>
            <Pressable onPress={onClear} style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Show Today</Text>
            </Pressable>
            <PrimaryButton icon="search-outline" label="Search" onPress={onApply} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(15,23,42,0.42)" },
  sheet: {
    minHeight: "74%",
    maxHeight: "86%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 18,
    gap: 14
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  title: { color: "#111827", fontSize: 18, fontWeight: "800" },
  subtitle: { color: "#667085", fontSize: 13, lineHeight: 20 },
  closeButton: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#f2f4f7" },
  fieldRow: { flexDirection: "row", gap: 10 },
  fieldCard: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: "#dbe1ea", backgroundColor: "#f8fafc", padding: 12, gap: 4 },
  fieldCardActive: { borderColor: colors.primary, backgroundColor: "#eef4ff" },
  fieldLabel: { color: "#667085", fontSize: 12, fontWeight: "700" },
  fieldValue: { color: "#111827", fontSize: 14, fontWeight: "700" },
  controlsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  arrowButton: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft },
  arrowButtonDisabled: { opacity: 0.45 },
  selectorButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dbe1ea",
    backgroundColor: "#f8fafc",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6
  },
  selectorText: { color: "#111827", fontSize: 13, fontWeight: "700" },
  selectorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  selectorChip: {
    width: "23%",
    minHeight: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dbe1ea",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc"
  },
  selectorChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  selectorChipDisabled: { opacity: 0.4 },
  selectorChipText: { color: "#111827", fontSize: 12, fontWeight: "700" },
  selectorChipTextActive: { color: colors.surface },
  selectorChipTextDisabled: { color: "#98a2b3" },
  weekdays: { flexDirection: "row", justifyContent: "space-between" },
  weekday: { width: "14.28%", textAlign: "center", color: "#667085", fontSize: 12, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap", rowGap: 6 },
  dayCell: { width: "14.28%", aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: 12 },
  dayCellRange: { backgroundColor: "#eef4ff" },
  dayCellSelected: { backgroundColor: colors.primary },
  todayCell: { borderWidth: 1, borderColor: colors.primary },
  dayCellDisabled: { opacity: 0.35 },
  dayText: { color: "#111827", fontSize: 14, fontWeight: "700" },
  dayTextSelected: { color: colors.surface },
  dayTextDisabled: { color: "#98a2b3" },
  hint: { color: "#667085", fontSize: 12, fontWeight: "600" },
  actions: { marginTop: "auto", gap: 12 },
  secondaryButton: { minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: "#d0d5dd", alignItems: "center", justifyContent: "center" },
  secondaryText: { color: "#344054", fontSize: 14, fontWeight: "700" }
});
