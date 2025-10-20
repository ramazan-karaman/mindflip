import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import PracticeModeCard from "../components/practiceModeCard";
import { PracticeRoute } from "../types/entities";

const { width, height } = Dimensions.get("window");


const practiceModes = [
  { id: "1", title: "Klasik", route: "/pratik/classic" as const, color: "#2196F3", icon: "book" },
  { id: "2", title: "Eşleştirme", route: "/pratik/match" as const, color: "#FF9800", icon: "git-compare" },
  { id: "3", title: "True / False", route: "/pratik/truefalse" as const, color: "#4CAF50", icon: "checkmark-done" },
  { id: "4", title: "Harf sıralama", route: "/pratik/order" as const, color: "#9C27B0", icon: "text" },
  { id: "5", title: "Çoktan seçmeli", route: "/pratik/multiple" as const, color: "#F44336", icon: "list" },
  { id: "6", title: "Rastgele ?", route: "/pratik/random" as const, color: "#009688", icon: "shuffle" },
];

export default function PracticeScreen() {
  const router = useRouter();
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const [search, setSearch] = useState("");

  const handlePress = (route: PracticeRoute) => {
    router.push(`${route}?deckId=${deckId}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.deckName}>Deste 1</Text>
        <TextInput
          placeholder="Search..."
          style={styles.search}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.grid}>
        {practiceModes.map((mode) => (
          <PracticeModeCard
            key={mode.id}
            title={mode.title}
            route={mode.route}
            color={mode.color}
            icon={mode.icon}
            onPress={handlePress}
          />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 60,
    justifyContent: "space-between",
  },
  deckName: { fontSize: 20, fontWeight: "bold" },
  search: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 8,
    width: width * 0.7,
    backgroundColor: "#fff",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
});
