import { Ionicons } from "@expo/vector-icons";
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View
} from "react-native";
import { Menu, MenuOption, MenuOptions, MenuTrigger } from "react-native-popup-menu";
import PracticeModeCard from "../components/practiceModeCard";
import * as DeckRepository from '../lib/repositories/deckRepository';
import { DeckWithCardCount, PracticeRoute } from '../lib/types';

// Modlar sabit kalıyor
const practiceModes = [
  { id: "1", title: "Klasik", route: "/pratik/classic" , color: "#2196F3", icon: "book" },
  { id: "2", title: "Eşleştirme", route: "/pratik/match" , color: "#FF9800", icon: "git-compare" },
  { id: "3", title: "True / False", route: "/pratik/truefalse", color: "#4CAF50", icon: "checkmark-done" },
  { id: "4", title: "Yazma", route: "/pratik/write", color: "#9C27B0", icon: "text" },
  { id: "5", title: "Çoktan seçmeli", route: "/pratik/multiple", color: "#F44336", icon: "list" },
  { id: "6", title: "Rastgele ?", route: "/pratik/random", color: "#009688", icon: "shuffle" },
] as const;

export default function PracticeScreen() {
  const router = useRouter();
  const { deckId: initialDeckId } = useLocalSearchParams<{ deckId: string }>();
  const [activeDeckId, setActiveDeckId] = useState<number | null>(null);

  // Desteleri Getir (Parametresiz)
  const {
    data: allDecks,
    isLoading: isLoadingDecks,
    isError: isErrorDecks,
  } = useQuery<DeckWithCardCount[]>({
    queryKey: ['decks'],
    queryFn: DeckRepository.getDecks,
  });

  // İlk açılışta veya parametre geldiğinde aktif desteyi seç
  useEffect(() => {
    if (activeDeckId || !allDecks || allDecks.length === 0) {
      return;
    }

    if (initialDeckId) {
      const id = parseInt(initialDeckId, 10);
      if (!isNaN(id)) {
          setActiveDeckId(id);
      }
    } else {
      // Parametre yoksa ilk desteyi seç
      setActiveDeckId(allDecks[0].id);
    }
  }, [initialDeckId, allDecks, activeDeckId]);

  const getDeckName = () => {
    if (isLoadingDecks) return 'Desteler Yükleniyor...';
    if (isErrorDecks) return 'Hata: Yüklenemedi';
    if (!allDecks || allDecks.length === 0) return 'Deste Yok';
    
    if (!activeDeckId) return 'Deste Seçin...';
    
    const currentDeck = allDecks.find((d) => d.id === activeDeckId);
    return currentDeck ? currentDeck.name : 'Deste Bulunamadı';
  };

  const deckName = getDeckName();

  const handlePress = (route: PracticeRoute) => {
    if (!activeDeckId) return;
    router.push(`${route}?deckId=${activeDeckId}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Menu>
          <MenuTrigger>
            <View style={styles.deckNameContainer}>
              <Text style={styles.deckName}>{deckName}</Text>
              {isLoadingDecks ? (
                <ActivityIndicator size="small" color="#333" />
              ) : (
                <Ionicons name="chevron-down" size={24} color="#333" />
              )}
            </View>
          </MenuTrigger>
          <MenuOptions customStyles={{ optionsContainer: styles.menuOptions }}>
            {(allDecks ?? []).map(deck => (
              <MenuOption
                key={deck.id}
                onSelect={() => setActiveDeckId(deck.id)}
              >
                <Text style={[styles.menuOptionText, deck.id === activeDeckId && styles.menuOptionTextActive]}>
                  {deck.name} ({deck.cardCount})
                </Text>
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
            icon={mode.icon as any} 
            onPress={handlePress}
            disabled={!activeDeckId || isLoadingDecks || (allDecks?.length === 0)}
          />
        ))}
      </View>
    </View>
  );
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
    minHeight:50,
    minWidth:200,
    justifyContent: 'center',
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
    maxHeight: 300,
  },
  menuOptionText: {
    fontSize: 16,
    padding: 8,
  },
  menuOptionTextActive: {
    fontWeight: 'bold',
    color: '#2196F3',
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
});