import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View
} from "react-native";
import { Menu, MenuOption, MenuOptions, MenuTrigger } from "react-native-popup-menu";
import PracticeModeCard from "../components/practiceModeCard";
import { getDecks } from "../lib/services/deckService";
import { Deck, PracticeRoute } from "../types/entities";


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
  const { deckId: initialDeckId } = useLocalSearchParams<{ deckId: string }>();
  const [deckName, setDeckName] = useState("Deste Yükleniyor...");
  const [allDecks, setAllDecks] = useState<Deck[]>([]);
  const [activeDeckId, setActiveDeckId] = useState<number | null>(null);

  useEffect(() => {
    if (initialDeckId) {
      setActiveDeckId(parseInt(initialDeckId));
    }
  }, [initialDeckId]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const decks = await getDecks();
        setAllDecks(decks);

        if (activeDeckId) {
          const currentDeck = decks.find(d => d.id === activeDeckId);
          if (currentDeck) {
            setDeckName(currentDeck.name);
          } else {
            setDeckName("Bilinmeyen Deste");
          }
        }
      } catch (error) {
        console.error("Deste bilgileri alınırken hata:", error);
        setDeckName("Hata");
      }
    };
    loadData();
  }, [activeDeckId]);

  const handlePress = (route: PracticeRoute) => {
    router.push(`${route}?deckId=${activeDeckId}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Menu>
          <MenuTrigger>
            <View style={styles.deckNameContainer}>
              <Text style={styles.deckName}>{deckName}</Text>
              <Ionicons name="chevron-down" size={24} color="#333" />
            </View>
          </MenuTrigger>
          <MenuOptions customStyles={{ optionsContainer: styles.menuOptions }}>
            {allDecks.map(deck => (
              <MenuOption
                key={deck.id}
                onSelect={() => setActiveDeckId(deck.id)}
              >
                <Text style={styles.menuOptionText}>{deck.name}</Text>
              </MenuOption>
            ))}
          </MenuOptions>
        </Menu>
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
    alignItems: "center",
    marginBottom: 40,
    marginTop: 20,
  },
  deckNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
  },
  deckName: {
    fontSize: 22,
    fontWeight: "bold",
    marginRight: 8,
  },
  menuOptions: {
    marginTop: 60,
    borderRadius: 10,
    padding: 5,
  },
  menuOptionText: {
    fontSize: 16,
    padding: 8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
});
