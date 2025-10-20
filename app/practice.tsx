import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

// type tanımlaması
type PracticeRoute =
  | "/pratik/classic"
  | "/pratik/match"
  | "/pratik/truefalse"
  | "/pratik/order"
  | "/pratik/multiple"
  | "/pratik/random";

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
  const {deckId}= useLocalSearchParams<{deckId: string}>();
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
        {practiceModes.map((mode) => {
          const scale = useSharedValue(1);

          const animatedStyle = useAnimatedStyle(() => ({
            transform: [{ scale: scale.value }],
          }));

          const onCardPress = () => {
            // önce animasyon
            scale.value = withTiming(1.05, { duration: 150 }, () => {
              scale.value = withTiming(1, { duration: 150 });
            });
            // sonra küçük delay ile yönlendirme
            setTimeout(() => handlePress(mode.route), 200);
          };

          return (
            <Animated.View
              key={mode.id}
              style={[styles.card, { backgroundColor: mode.color }, animatedStyle]}
            >
              <TouchableOpacity onPress={onCardPress} style={styles.cardBtn}>
                <Ionicons
                  name={mode.icon as any}
                  size={28}
                  color="#fff"
                  style={{ marginBottom: 8 }}
                />
                <Text style={styles.cardText}>{mode.title}</Text>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
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
  card: {
    width: width * 0.42,
    height: height * 0.15,
    borderRadius: 16,
    marginBottom: 16,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardBtn: { flex: 1, justifyContent: "center", alignItems: "center" },
  cardText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
});
