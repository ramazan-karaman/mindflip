import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Ionicons } from '@expo/vector-icons';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import * as CardRepository from '../../lib/repositories/cardRepository';
import * as DeckRepository from '../../lib/repositories/deckRepository';
import { Card } from '../../lib/types';

// YENİ: Servisi import et
import { calculateNextReview } from '../../lib/services/srsService';

// --- (ESKİ calculateSRS FONKSİYONUNU SİL) ---

export default function ClassicScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const id = deckId && typeof deckId === 'string' ? parseInt(deckId, 10) : NaN;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const rotate = useSharedValue(0);

  // --- AKILLI ÇALIŞMA KUYRUĞU (Smart Bucket) ---
  const {
    data: practiceQueue,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['practiceQueue', id],
    queryFn: async () => {
      if (isNaN(id)) throw new Error('Geçersiz Deste ID');

      // 1. Hedefi al
      const currentDeck = await DeckRepository.getDeckById(id);
      const sessionLimit = (currentDeck?.goal && currentDeck.goal > 0) ? currentDeck.goal : 10;

      // 2. Akıllı kuyruğu veritabanından çek (3 Adımlı Lojik)
      // cardRepository'e eklediğimiz getSmartPracticeQueue fonksiyonu
      const queue = await CardRepository.getSmartPracticeQueue(id, sessionLimit);

      // 3. Karıştır ve Sun
      return queue.sort(() => Math.random() - 0.5);
    },
    enabled: !isNaN(id),
  });

  const { mutate: updateCardSRSMutate } = useMutation({
    mutationFn: (variables: {
      cardId: number;
      interval: number;
      easeFactor: number;
      nextReview: string;
    }) =>
      CardRepository.updateCardSRS(
        variables.cardId,
        variables.interval,
        variables.easeFactor,
        variables.nextReview
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', id] });
      queryClient.invalidateQueries({ queryKey: ['decks'] });
    },
    onError: (error) => {
      console.error('SRS hatası:', error);
    },
  });

  const flipCard = () => {
    if (!practiceQueue || practiceQueue.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    rotate.value = withTiming(rotate.value === 0 ? 180 : 0, { duration: 400 });
    setIsFlipped(!isFlipped);
  };

  const frontAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${rotate.value}deg` }],
  }));

  const backAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${rotate.value + 180}deg` }],
  }));

  const handleReview = async (quality: number) => {
    const currentCard = practiceQueue?.[currentIndex];
    if (!currentCard) return;

    if (quality >= 3) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    // YENİ: Servis üzerinden hesaplama yapılıyor
    const { interval, easeFactor, nextReview } = calculateNextReview(
      currentCard,
      quality
    );

    updateCardSRSMutate({
      cardId: currentCard.id,
      interval,
      easeFactor,
      nextReview,
    });

    if (currentIndex < (practiceQueue?.length ?? 0) - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
      rotate.value = 0;
    } else {
      Alert.alert(
        'Tebrikler!',
        'Bu oturumu başarıyla tamamladın.',
        [{ text: 'Çıkış', onPress: () => navigation.goBack() }]
      );
    }
  };

  // Kartın Bonus olup olmadığını kontrol et
  const isBonusCard = (card: Card) => {
    if (!card.nextReview) return false; 
    return new Date(card.nextReview).getTime() > new Date().getTime();
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.infoText}>Akıllı oturum hazırlanıyor...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.container}>
        <Ionicons name="alert-circle-outline" size={64} color="red" />
        <Text style={styles.infoText}>Hata oluştu.</Text>
      </View>
    );
  }

  if (!practiceQueue || practiceQueue.length === 0) {
    return (
      <View style={styles.container}>
        <Ionicons name="layers-outline" size={64} color="#ccc" />
        <Text style={styles.infoText}>Bu destede hiç kart yok.</Text>
      </View>
    );
  }

  const currentCard = practiceQueue[currentIndex];
  if (!currentCard) return <View style={styles.container} />;

  const bonus = isBonusCard(currentCard);

  return (
    <View style={styles.container}>
      {/* Üst Bilgi */}
      <View style={styles.topInfoContainer}>
        {bonus && (
            <View style={styles.bonusBadge}>
                <Ionicons name="flash" size={12} color="#FF9800" style={{marginRight: 4}} />
                <Text style={styles.bonusText}>PEKİŞTİRME</Text>
            </View>
        )}
        <View style={styles.progressContainer}>
            <Text style={styles.progressText}>
            {currentIndex + 1} / {practiceQueue.length}
            </Text>
        </View>
      </View>

      <TouchableOpacity onPress={flipCard} activeOpacity={0.9}>
        {/* ÖN YÜZ */}
        <Animated.View style={[styles.card, frontAnimatedStyle]}>
          {currentCard.front_image ? (
             <Image
             source={{ uri: currentCard.front_image }}
             style={styles.image}
             resizeMode="cover"
           />
          ) : (
            <Image
                source={require('../../assets/images/mindfliplogo.png')}
                style={[styles.image, {opacity: 0.1}]}
                resizeMode="contain"
            />
          )}
          <Text style={styles.termText}>{currentCard.front_word}</Text>
        </Animated.View>

        {/* ARKA YÜZ */}
        <Animated.View style={[styles.card, styles.cardBack, backAnimatedStyle]}>
           {currentCard.back_image ? (
             <Image
             source={{ uri: currentCard.back_image }}
             style={styles.image}
             resizeMode="cover"
           />
          ) : (
            <Image
                source={require('../../assets/images/mindfliplogo.png')}
                style={[styles.image, {opacity: 0.1}]}
                resizeMode="contain"
            />
          )}
          <Text style={styles.termText}>{currentCard.back_word}</Text>
        </Animated.View>
      </TouchableOpacity>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.hardButton, !isFlipped && styles.disabledButton]}
          disabled={!isFlipped}
          onPress={() => handleReview(1)}
        >
          <Text style={styles.buttonText}>Zor</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.normalButton, !isFlipped && styles.disabledButton]}
          disabled={!isFlipped}
          onPress={() => handleReview(3)}
        >
          <Text style={styles.buttonText}>Normal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.easyButton, !isFlipped && styles.disabledButton]}
          disabled={!isFlipped}
          onPress={() => handleReview(5)}
        >
          <Text style={styles.buttonText}>Kolay</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ... (Stiller aynı kalabilir)
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f4f8',
    padding: 20,
  },
  infoText: { fontSize: 18, color: '#555', textAlign: 'center', marginTop: 20 },
  card: {
    width: 320,
    height: 420,
    backgroundColor: 'white',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backfaceVisibility: 'hidden',
    
  },
  cardBack: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  image: {
    width: 280,
    height: 200,
    borderRadius: 15,
    marginBottom: 20,
    backgroundColor: '#f9f9f9',
  },
  termText: { fontSize: 26, fontWeight: 'bold', textAlign: 'center', color: '#333' },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 40,
    paddingHorizontal: 10,
    gap: 10
  },
  button: {
    paddingVertical: 15,
    borderRadius: 12,
    elevation: 3,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  hardButton: { backgroundColor: '#FF5252' },
  normalButton: { backgroundColor: '#2196F3' },
  easyButton: { backgroundColor: '#4CAF50' },
  disabledButton: { opacity: 0.3 },
  
  topInfoContainer: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between', // İki uca yasla
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  progressContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 2,
    marginLeft: 'auto'
  },
  progressText: {
    color: '#333',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bonusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0', 
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  bonusText: {
    color: '#FF9800', 
    fontSize: 12,
    fontWeight: 'bold',
  }
});