import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { childName, type ParentChild } from "@/lib/family";
import { colors } from "@/lib/theme";

export function ChildPicker({
  children,
  childId,
  onSelect,
}: {
  children: ParentChild[];
  childId: string | null;
  onSelect: (id: string) => void;
}) {
  if (children.length === 0) return null;
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Select a child from the list</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {children.map((child) => {
          const active = child.id === childId;
          return (
            <Pressable
              key={child.id}
              onPress={() => onSelect(child.id)}
              style={[styles.chip, active && styles.chipOn]}
            >
              <Text style={[styles.chipText, active && styles.chipTextOn]}>{childName(child)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  label: { color: colors.muted, fontSize: 14, fontWeight: "600" },
  row: { gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipOn: { backgroundColor: colors.green, borderColor: colors.green },
  chipText: { color: colors.green, fontWeight: "700" },
  chipTextOn: { color: colors.white },
});
