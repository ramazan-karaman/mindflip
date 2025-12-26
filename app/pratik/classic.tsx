import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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

import { useTheme } from '../../lib/ThemeContext';
import { savePracticeSession } from '../../lib/services/practiceService';
import { calculateNextReview } from '../../lib/services/srsService';


export default function ClassicScreen() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const { isDark } = useTheme();
  const colors = {
    background: isDark ? '#000000' : '#f0f4f8',
    cardBg: isDark ? '#1C1C1E' : '#ffffff',
    text: isDark ? '#ffffff' : '#333333',
    subText: isDark ? '#aaaaaa' : '#555555',
    border: isDark ? '#333333' : '#dddddd',
    icon: isDark ? '#666666' : '#cccccc',
    progressBg: isDark ? '#2C2C2E' : '#ffffff',
    
    // Bonus Rozeti
    bonusBg: isDark ? '#3E2723' : '#FFF3E0',
    bonusBorder: isDark ? '#5D4037' : '#FFE0B2',
    
    // Görsel Placeholder
    imagePlaceholder: isDark ? '#333' : '#f9f9f9',
  };

  const id = deckId && typeof deckId === 'string' ? parseInt(deckId, 10) : NaN;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const rotate = useSharedValue(0);

  const startTimeRef = useRef<number>(Date.now());
  const correctCountRef = useRef<number>(0);
  const wrongCountRef = useRef<number>(0);

  useEffect(() => {
    startTimeRef.current = Date.now();
    correctCountRef.current = 0;
    wrongCountRef.current = 0;
  }, []);

  // --- AKILLI ÇALIŞMA KUYRUĞU (Smart Bucket) ---
  const {
    data: practiceQueue,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['practiceQueue', id],
    queryFn: async () => {
      if (isNaN(id)) throw new Error('Geçersiz Deste ID');

      const currentDeck = await DeckRepository.getDeckById(id);
      const sessionLimit = (currentDeck?.goal && currentDeck.goal > 0) ? currentDeck.goal : 10;
      const queue = await CardRepository.getSmartPracticeQueue(id, sessionLimit);
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
      box: number;
    }) =>
      CardRepository.updateCardSRS(
        variables.cardId,
        variables.interval,
        variables.easeFactor,
        variables.nextReview,
        variables.box
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
      // Normal(3) ve Kolay(5) -> Doğru kabul edilir
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      correctCountRef.current += 1; 
    } else {
      // Zor(1) veya Unuttum -> Yanlış kabul edilir
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      wrongCountRef.current += 1;
    }

    const { interval, easeFactor, nextReview } = calculateNextReview(
      currentCard,
      quality
    );

    updateCardSRSMutate({
      cardId: currentCard.id,
      interval,
      easeFactor,
      nextReview,
      box: quality === 5 ? Math.min(currentCard.box + 1, 5) : (quality === 3 ? currentCard.box : Math.max(currentCard.box - 1, 0))
    });

    if (currentIndex < (practiceQueue?.length ?? 0) - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
      rotate.value = 0;
    } else {
      finishSession();
    }
  };

  const finishSession = async () => {
    const endTime = Date.now();
    const duration = endTime - startTimeRef.current; // Geçen süre (ms)

    savePracticeSession({
      deckId: id,
      correctCount: correctCountRef.current,
      wrongCount: wrongCountRef.current,
      durationMs: duration,
      mode: 'classic' 
    });

    Alert.alert(
      'Tebrikler!',
      `Oturum tamamlandı.\n\nDoğru: ${correctCountRef.current}\nTekrar: ${wrongCountRef.current}`,
      [{ text: 'Çıkış', onPress: () => navigation.goBack() }]
    );
  };

  const isBonusCard = (card: Card) => {
    if (!card.nextReview) return false; 
    return new Date(card.nextReview).getTime() > new Date().getTime();
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={[styles.infoText, { color: colors.subText }]}>Akıllı oturum hazırlanıyor...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={64} color="red" />
        <Text style={[styles.infoText, { color: colors.subText }]}>Hata oluştu.</Text>
      </View>
    );
  }

  if (!practiceQueue || practiceQueue.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Ionicons name="layers-outline" size={64} color={colors.icon} />
        <Text style={[styles.infoText, { color: colors.subText }]}>Bu destede hiç kart yok.</Text>
      </View>
    );
  }

  const currentCard = practiceQueue[currentIndex];
  if (!currentCard) return <View style={[styles.container, { backgroundColor: colors.background }]}/>;

  const bonus = isBonusCard(currentCard);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Üst Bilgi */}
      <View style={styles.topInfoContainer}>
        {bonus && (
            <View style={[styles.bonusBadge, { backgroundColor: colors.bonusBg, borderColor: colors.bonusBorder }]}>
                <Ionicons name="flash" size={12} color="#FF9800" style={{marginRight: 4}} />
                <Text style={styles.bonusText}>PEKİŞTİRME</Text>
            </View>
        )}
        <View style={[styles.progressContainer, { backgroundColor: colors.progressBg }]}>
            <Text style={[styles.progressText, { color: colors.text }]}>
            {currentIndex + 1} / {practiceQueue.length}
            </Text>
        </View>
      </View>

      <TouchableOpacity onPress={flipCard} activeOpacity={0.9}>
        {/* ÖN YÜZ */}
        <Animated.View style={[
            styles.card, 
            frontAnimatedStyle, 
            { backgroundColor: colors.cardBg, borderColor: colors.border }
        ]}>
          {currentCard.front_image ? (
             <Image
             source={{ uri: currentCard.front_image }}
             style={[styles.image, { backgroundColor: colors.imagePlaceholder }]}
             resizeMode="cover"
           />
          ) : (
            <Image
                source={require('../../assets/images/icon.png')}
                style={[styles.image, {opacity: 0.1}]}
                resizeMode="cover"
            />
          )}
          <Text style={[styles.termText, { color: colors.text }]}>{currentCard.front_word}</Text>
        </Animated.View>

        {/* ARKA YÜZ */}
        <Animated.View style={[
            styles.card, 
            styles.cardBack, 
            backAnimatedStyle,
            { backgroundColor: colors.cardBg, borderColor: colors.border }
        ]}>
           {currentCard.back_image ? (
             <Image
             source={{ uri: currentCard.back_image }}
             style={[styles.image, { backgroundColor: colors.imagePlaceholder }]}
             resizeMode="cover"
           />
          ) : (
            <Image
                source={require('../../assets/images/icon.png')}
                style={[styles.image, {opacity: 0.1}]}
                resizeMode="cover"
            />
          )}
          <Text style={[styles.termText, { color: colors.text }]}>{currentCard.back_word}</Text>
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