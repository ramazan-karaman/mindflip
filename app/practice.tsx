import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";

// Bileşenler ve Repo'lar
import DeckSelector from "../components/DeckSelector"; // Yeni bileşeni import ettik
import PracticeModeCard from "../components/practiceModeCard";
import * as DeckRepository from '../lib/repositories/deckRepository';
import { DeckWithCardCount, PracticeRoute } from '../lib/types';

// Modlar
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
  
  // 1. URL'den deckId'yi çekiyoruz (Source of Truth)
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  
  // URL parametresi string gelir, sayıya çeviriyoruz (yoksa null)
  const activeDeckId = deckId ? parseInt(deckId, 10) : null;

  // 2. Desteleri Getir
  const {
    data: allDecks,
    isLoading: isLoadingDecks,
  } = useQuery<DeckWithCardCount[]>({
    queryKey: ['decks'],
    queryFn: DeckRepository.getDecks,
  });

  // 3. İlk Açılış Mantığı: Eğer URL'de ID yoksa ve desteler geldiyse, ilkini seç
  useEffect(() => {
    if (!activeDeckId && allDecks && allDecks.length > 0) {
      // URL'yi güncelle (router.replace ile geçmişi kirletmeden)
      router.replace(`/practice?deckId=${allDecks[0].id}`);
    }
  }, [activeDeckId, allDecks]);

  // 4. Deste Değiştirme Fonksiyonu
  const handleDeckChange = (newDeckId: number) => {
    // Sadece URL'i güncelliyoruz, gerisini React hallediyor
    router.setParams({ deckId: newDeckId.toString() });
  };

  // 5. Pratik Moduna Gitme Fonksiyonu
  const handleModePress = (route: PracticeRoute) => {
    if (!activeDeckId) return;
    router.push(`${route}?deckId=${activeDeckId}`);
  };

  return (
    <View style={styles.container}>
      
      {/* ÜST KISIM: Deste Seçici Bileşeni */}
      <DeckSelector 
        decks={allDecks}
        currentDeckId={activeDeckId}
        onSelectDeck={handleDeckChange}
        isLoading={isLoadingDecks}
      />

      {/* ORTA KISIM: Pratik Modları Grid */}
      <View style={styles.grid}>
        {practiceModes.map((mode) => (
          <PracticeModeCard
            key={mode.id}
            title={mode.title}
            route={mode.route}
            color={mode.color}
            icon={mode.icon as any} 
            onPress={handleModePress}
            // Deste seçili değilse veya yükleniyorsa butonları devre dışı bırak
            disabled={!activeDeckId || isLoadingDecks}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#fff", 
    padding: 16 
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
});