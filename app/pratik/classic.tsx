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
import { checkHasPendingChanges } from '../../lib/services/syncService';
import { Card } from '../../lib/types';

const calculateSRS = (card: Card, quality: number) => {
    const easeFactor =
        typeof card.easeFactor === 'number' && !isNaN(card.easeFactor)
            ? card.easeFactor
            : 2.5;
    const interval =
        typeof card.interval === 'number' && !isNaN(card.interval)
            ? card.interval
            : 1;
    let newInterval: number;
    let newEaseFactor: number = easeFactor;

    if (quality >= 3) {
        if (interval < 1) {
            newInterval = 1;
        } else if (interval < 2) {
            newInterval = 6;
        } else {
            newInterval = Math.round(interval * easeFactor);
        }
        newEaseFactor += 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
    } else {
        newInterval = 0.5;
        newEaseFactor = Math.max(1.3, easeFactor - 0.2);
    }

    if (newEaseFactor < 1.3) newEaseFactor = 1.3;

    const nextReviewDate = new Date();
    if (isNaN(newInterval)) {
        newInterval = 1;
    }
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

    return {
        interval: newInterval,
        easeFactor: newEaseFactor,
        nextReview: nextReviewDate.toISOString(),
    };
};

export default function ClassicScreen() {
    const { deckId } = useLocalSearchParams<{ deckId: string }>();
    const navigation = useNavigation();
    const queryClient = useQueryClient();

    const id = deckId && typeof deckId === 'string' ? parseInt(deckId, 10) : NaN;

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);

    const rotate = useSharedValue(0);

    const {
        data: practiceQueue,
        isLoading,
        isError,
    } = useQuery({
        queryKey: ['practiceQueue', id],
        queryFn: async () => {
            if (isNaN(id)) throw new Error('Geçersiz Deste ID');

            const currentDeck = await DeckRepository.getDeckById(id);
            if (!currentDeck) throw new Error('Deste bulunamadı');

            const userGoal = currentDeck.goal ?? 0;
            const goal = userGoal > 0 ? userGoal : 5;

            const allCards: Card[] = await CardRepository.getCardByIdDeck(id);
            if (allCards.length === 0) {
                return [];
            }

            const now = new Date();

            const dueCards = allCards.filter(
                (card) => !card.nextReview || new Date(card.nextReview) <= now
            );

            let finalQueue = [...dueCards];

            if (dueCards.length < goal) { 
                const cardsNeeded = goal - dueCards.length; 

                const newCards = allCards
                    .filter((card) => !dueCards.find((dueCard) => dueCard.id === card.id))
                    .sort(
                        (a, b) =>
                            new Date(a.created_at).getTime() -
                            new Date(b.created_at).getTime()
                    );

                const newCardsToPractice = newCards.slice(0, cardsNeeded);
                finalQueue.push(...newCardsToPractice);
            }

            if (finalQueue.length === 0) {
                console.log(
                    'Çalışılacak kart bulunamadı, hedefe göre bonus tur oluşturuluyor...'
                );
                const bonusCards = allCards
                    .sort(
                        (a, b) =>
                            new Date(a.nextReview).getTime() -
                            new Date(b.nextReview).getTime()
                    )
                    .slice(0, goal);
                finalQueue = bonusCards;
            }

            return finalQueue.sort(() => Math.random() - 0.5);
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
            checkHasPendingChanges();
        },
        onError: (error) => {
            console.error('SRS güncellenirken hata:', error);
            Alert.alert('Hata', 'Kart ilerlemesi kaydedilemedi.');
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

        const { interval, easeFactor, nextReview } = calculateSRS(
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
                'Bu pratik seansını tamamladın.',
                [{ text: 'Harika!', onPress: () => navigation.goBack() }]
            );
        }
    };

    if (isLoading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#2196F3" />
                <Text style={styles.infoText}>Pratik kartları hazırlanıyor...</Text>
            </View>
        );
    }

    if (isError) {
        return (
            <View style={styles.container}>
                <Ionicons name="alert-circle-outline" size={64} color="red" />
                <Text style={styles.infoText}>Pratik yüklenirken bir hata oluştu.</Text>
            </View>
        );
    }

    if (!practiceQueue || practiceQueue.length === 0) {
        return (
            <View style={styles.container}>
                <Ionicons name="checkmark-done-circle-outline" size={64} color="green" />
                <Text style={styles.infoText}>
                    Bu destede şu an çalışılacak kart bulunmuyor.
                </Text>
            </View>
        );
    }

    const currentCard = practiceQueue[currentIndex];
    if (!currentCard) {
        return (
            <View style={styles.container}>
                <Text style={styles.infoText}>Pratik tamamlandı.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {practiceQueue.length > 0 && (
                <View style={styles.progressContainer}>
                    <Text style={styles.progressText}>
                        {currentIndex + 1} / {practiceQueue.length}
                    </Text>
                </View>
            )}
            <TouchableOpacity onPress={flipCard} activeOpacity={0.9}>
                <Animated.View style={[styles.card, frontAnimatedStyle]}>
                    <Image
                        source={
                            currentCard.front_image
                                ? { uri: currentCard.front_image }
                                : require('../../assets/images/mindfliplogo.png')
                        }
                        style={styles.image}
                    />
                    <Text style={styles.termText}>{currentCard.front_word}</Text>
                </Animated.View>
                <Animated.View style={[styles.card, styles.cardBack, backAnimatedStyle]}>
                    <Image
                        source={
                            currentCard.back_image
                                ? { uri: currentCard.back_image }
                                : require('../../assets/images/mindfliplogo.png')
                        }
                        style={styles.image}
                    />
                    <Text style={styles.termText}>{currentCard.back_word}</Text>
                </Animated.View>
            </TouchableOpacity>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[
                        styles.button,
                        styles.hardButton,
                        !isFlipped && styles.disabledButton,
                    ]}
                    disabled={!isFlipped}
                    onPress={() => handleReview(1)}
                >
                    <Text style={styles.buttonText}>Zor</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.button,
                        styles.normalButton,
                        !isFlipped && styles.disabledButton,
                    ]}
                    disabled={!isFlipped}
                    onPress={() => handleReview(3)}
                >
                    <Text style={styles.buttonText}>Normal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.button,
                        styles.easyButton,
                        !isFlipped && styles.disabledButton,
                    ]}
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
    infoText: { fontSize: 18, color: '#555', textAlign: 'center' },
    card: {
        width: 320,
        height: 400,
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
        backgroundColor: '#eee',
    },
    termText: { fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginTop: 40,
    },
    button: {
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 10,
        elevation: 3,
    },
    buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    hardButton: { backgroundColor: '#ff6b6b' },
    normalButton: { backgroundColor: '#4dabf7' },
    easyButton: { backgroundColor: '#69db7c' },
    disabledButton: { opacity: 0.5 },
    progressContainer: {
        position: 'absolute',
        top: 60,
        right: 20,
        backgroundColor: '#fff',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
    },
    progressText: {
        color: '#333',
        fontSize: 16,
        fontWeight: 'bold',
    },
});