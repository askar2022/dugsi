import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { colors } from "@/lib/theme";

export function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function Kicker({ children }: { children: string }) {
  return <Text style={styles.kicker}>{children}</Text>;
}

export function Title({ children }: { children: string }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Copy({ children }: { children: string }) {
  return <Text style={styles.copy}>{children}</Text>;
}

export function Field(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.muted} {...props} style={[styles.input, props.style]} />;
}

export function Button({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable style={[styles.button, disabled && styles.buttonOff]} onPress={onPress} disabled={disabled}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export function StatusText({ status, label }: { status: string; label: string }) {
  const color =
    status === "paid" || status === "present" || status === "on_track" || status === "done"
      ? colors.paid
      : status === "due" || status === "needs_help" || status === "needs_practice"
        ? colors.due
        : status === "late" || status === "absent" || status === "off_track"
          ? colors.late
          : colors.muted;
  return <Text style={[styles.status, { color }]}>{label}</Text>;
}

export function Row({ title, meta, right }: { title: string; meta?: string; right?: string }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {meta ? <Text style={styles.rowMeta}>{meta}</Text> : null}
      </View>
      {right ? <Text style={styles.rowRight}>{right}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    gap: 10,
  },
  kicker: {
    color: colors.gold,
    letterSpacing: 2,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  title: {
    color: colors.green,
    fontSize: 26,
    fontWeight: "700",
  },
  copy: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 21,
  },
  input: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.ink,
    fontSize: 16,
  },
  button: {
    backgroundColor: colors.green,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonOff: { opacity: 0.5 },
  buttonText: { color: colors.white, fontWeight: "700", fontSize: 16 },
  status: { fontWeight: "700" },
  row: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowTitle: { color: colors.ink, fontWeight: "700", fontSize: 16 },
  rowMeta: { color: colors.muted, marginTop: 2 },
  rowRight: { color: colors.green, fontWeight: "700" },
});
