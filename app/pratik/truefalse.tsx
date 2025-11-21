import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import * as CardRepository from '../../lib/repositories/cardRepository';
import { Card } from '../../lib/types';

const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = width * 0.3;
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = height * 0.65;

interface GameCard extends Card {
    displayBackWord: string;
    displayBackImage: string | null;
    isMatch: boolean;
    isRetry?: boolean;
}

export default function TrueFalseScreen() {
    const { deckId } = useLocalSearchParams<{ deckId: string }>();
    const router = useRouter();

    // --- OYUN DURUMU ---
    const [queue, setQueue] = useState<GameCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [gameOver, setGameOver] = useState(false);

    // --- İSTATİSTİKLER ---
    const [score, setScore] = useState(0);
    const [currentStreak, setCurrentStreak] = useState(0);
    const [maxStreak, setMaxStreak] = useState(0);
    const [totalInitialCards, setTotalInitialCards] = useState(0);
    const [mistakeSet, setMistakeSet] = useState<Set<number>>(new Set());

    // --- ANİMASYON ---
    const translateX = useSharedValue(0);
    const rotate = useSharedValue(0);

    useEffect(() => {
        loadGameData();
    }, [deckId]);

    const loadGameData = async () => {
        if (!deckId) return;
        try {
            const cards = await CardRepository.getCardByIdDeck(parseInt(deckId));
            if (cards.length < 4) {
                Alert.alert("Yetersiz Kart", "Bu modu oynamak için destede en az 4 kart olmalıdır.", [
                    { text: "Geri Dön", onPress: () => router.back() }
                ]);
                return;
            }
            prepareGameQueue(cards);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const prepareGameQueue = (cards: Card[]) => {
        const shuffled = cards.sort(() => Math.random() - 0.5);
        const gameCards: GameCard[] = shuffled.map((card) => {
            const isMatch = Math.random() > 0.5;
            let displayBackWord = card.back_word;
            let displayBackImage = card.back_image;

            if (!isMatch) {
                const otherCards = cards.filter(c => c.id !== card.id);
                const randomWrong = otherCards[Math.floor(Math.random() * otherCards.length)];
                displayBackWord = randomWrong.back_word;
                displayBackImage = randomWrong.back_image;
            }

            return { ...card, displayBackWord, displayBackImage, isMatch, isRetry: false };
        });
        setQueue(gameCards);
        setTotalInitialCards(gameCards.length);
    };

    const restartGame = () => {
        setLoading(true);
        setGameOver(false);
        setScore(0);
        setCurrentStreak(0);
        setMaxStreak(0);
        setMistakeSet(new Set());
        loadGameData();
    };

    const handleSwipeComplete = (direction: 'left' | 'right') => {
        const currentCard = queue[0];
        const userSaidTrue = direction === 'right';
        const isCorrect = (userSaidTrue && currentCard.isMatch) || (!userSaidTrue && !currentCard.isMatch);

        if (isCorrect) {
            // DOĞRU: Titreşim YOK

            if (!currentCard.isRetry) {
                const newStreak = currentStreak + 1;
                setCurrentStreak(newStreak);
                if (newStreak > maxStreak) setMaxStreak(newStreak);

                // Streak bonusu
                setScore(s => s + 10 + (newStreak > 3 ? 5 : 0));
            }

            setQueue(prev => {
                const newQueue = prev.slice(1);
                if (newQueue.length === 0) setGameOver(true);
                return newQueue;
            });

        } else {
            // YANLIŞ: Titreşim VAR
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

            setCurrentStreak(0); // Sıfırla ama UI'da 0 olarak kalsın, kaybolmasın

            setMistakeSet(prev => new Set(prev).add(currentCard.id));

            setQueue(prev => {
                const [failedCard, ...rest] = prev;
                return [...rest, { ...failedCard, isRetry: true }];
            });
        }

        translateX.value = 0;
        rotate.value = 0;
    };

    const gesture = Gesture.Pan()
        .onUpdate((event) => {
            translateX.value = event.translationX;
            rotate.value = interpolate(event.translationX, [-width, width], [-10, 10]);
        })
        .onEnd(() => {
            if (Math.abs(translateX.value) > SWIPE_THRESHOLD) {
                const direction = translateX.value > 0 ? 'right' : 'left';
                const targetX = direction === 'right' ? width * 1.5 : -width * 1.5;
                translateX.value = withTiming(targetX, { duration: 200 }, () => {
                    runOnJS(handleSwipeComplete)(direction);
                });
            } else {
                translateX.value = withSpring(0);
                rotate.value = withSpring(0);
            }
        });

    // --- STYLES & ANIMATION ---
    const animatedCardStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { rotate: `${rotate.value}deg` }
        ]
    }));

    const overlayStyleRight = useAnimatedStyle(() => ({
        opacity: interpolate(translateX.value, [0, width / 4], [0, 0.7]),
    }));
    const overlayStyleLeft = useAnimatedStyle(() => ({
        opacity: interpolate(translateX.value, [0, -width / 4], [0, 0.7]),
    }));

    // --- GÖSTERGE HESAPLAMALARI ---

    // Kuyruktaki retry olmayan (yani orijinal) kart sayısı
    const remainingOriginalCards = queue.filter(q => !q.isRetry).length;

    // Şu an kaçıncı karttayız? (Toplam - Kalan + 1). 
    // Eğer oyun bittiyse queue 0 olacağı için taşma kontrolü yapıyoruz.
    const currentCardNumber = Math.min(totalInitialCards, totalInitialCards - remainingOriginalCards + 1);

    const progressPercent = totalInitialCards > 0 ? ((currentCardNumber) / totalInitialCards) * 100 : 0;

    const renderCardContent = (card: GameCard) => {
        const hasImage = !!card.front_image;
        return (
            <View style={styles.cardInner}>
                {/* NOT: Kartın üzerindeki kombo rozeti kaldırıldı. */}

                {card.isRetry && (
                    <View style={styles.retryBadge}>
                        <Ionicons name="refresh" size={14} color="#D32F2F" />
                        <Text style={styles.retryText}>Tekrar</Text>
                    </View>
                )}

                {hasImage && (
                    <View style={styles.imageContainer}>
                        <Image source={{ uri: card.front_image! }} style={styles.mainImage} resizeMode="cover" />
                    </View>
                )}

                <View style={[styles.textContainer, !hasImage && styles.textContainerFull]}>
                    <View style={[styles.questionBox, !hasImage && styles.boxExpanded]}>
                        <Text style={styles.boxLabel}>Terim</Text>
                        <Text style={styles.questionText} adjustsFontSizeToFit numberOfLines={3}>{card.front_word}</Text>
                    </View>

                    <View style={styles.connector}>
                        <View style={styles.connectorCircle}>
                            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#2196F3' }}>?</Text>
                        </View>
                    </View>

                    <View style={[styles.answerBox, !hasImage && styles.boxExpanded]}>
                        <Text style={styles.boxLabel}>Karşılığı</Text>
                        <Text style={styles.answerText} adjustsFontSizeToFit numberOfLines={3}>{card.displayBackWord}</Text>
                    </View>
                </View>
            </View>
        );
    };

    const calculateAccuracy = () => {
        if (totalInitialCards === 0) return 0;
        const correctFirstTry = totalInitialCards - mistakeSet.size;
        return Math.round((correctFirstTry / totalInitialCards) * 100);
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2196F3" /></View>;

    if (gameOver) {
        const accuracy = calculateAccuracy();
        return (
            <View style={styles.resultContainer}>
                <Ionicons name="trophy" size={100} color="#FFD700" style={styles.trophyIcon} />
                <Text style={styles.resultTitle}>Harika İş!</Text>

                <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Toplam Puan</Text>
                        <Text style={styles.statValue}>{score}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Max Kombo</Text>
                        <Text style={styles.statValue}>🔥 {maxStreak}</Text>
                    </View>
                    <View style={styles.statItemFull}>
                        <Text style={styles.statLabel}>Ustalık Yüzdesi</Text>
                        <Text style={[styles.statValue, { color: accuracy > 80 ? '#4CAF50' : '#FF9800' }]}>
                            %{accuracy}
                        </Text>
                    </View>
                </View>

                <View style={styles.resultButtons}>
                    <TouchableOpacity style={styles.playAgainBtn} onPress={restartGame}>
                        <Ionicons name="refresh" size={20} color="white" />
                        <Text style={styles.playAgainText}>Tekrar Oyna</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.exitBtn} onPress={() => router.back()}>
                        <Text style={styles.exitBtnText}>Listeye Dön</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const activeCard = queue[0];
    const nextCard = queue[1];

    return (
        <View style={styles.container}>
            {/* ÜST BAR (Header) */}
            <View style={styles.headerContainer}>
                <View style={styles.topBar}>
                    {/* SOL: İLERLEME METNİ (Çıkış butonu yerine) */}
                    <View style={styles.progressTextContainer}>
                        <Text style={styles.progressLabel}>
                            {currentCardNumber} / {totalInitialCards}
                        </Text>
                    </View>

                    {/* SAĞ: KOMBO ve SKOR */}
                    <View style={styles.scoreWrapper}>
                        {/* Kombo artık hep görünür (0 olsa bile) */}
                        <View style={[styles.fireContainer, currentStreak === 0 && styles.fireContainerInactive]}>
                            <Text style={[styles.fireText, currentStreak === 0 && styles.fireTextInactive]}>
                                🔥 {currentStreak}
                            </Text>
                        </View>

                        <View style={styles.scoreContainer}>
                            <Text style={styles.scoreTextSmall}>{score}</Text>
                        </View>
                    </View>
                </View>

                {/* PROGRESS BAR */}
                <View style={styles.progressBarBackground}>
                    <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                </View>
            </View>

            {/* OYUN ALANI */}
            <View style={styles.gameArea}>
                {nextCard && (
                    <View style={[styles.card, styles.nextCard]}>
                        {renderCardContent(nextCard)}
                    </View>
                )}

                {activeCard && (
                    <GestureDetector gesture={gesture}>
                        <Animated.View style={[styles.card, animatedCardStyle]}>
                            <Animated.View style={[styles.overlay, styles.overlaySuccess, overlayStyleRight]}>
                                <Ionicons name="checkmark-circle" size={80} color="white" />
                                <Text style={styles.overlayText}>DOĞRU</Text>
                            </Animated.View>
                            <Animated.View style={[styles.overlay, styles.overlayFail, overlayStyleLeft]}>
                                <Ionicons name="close-circle" size={80} color="white" />
                                <Text style={styles.overlayText}>YANLIŞ</Text>
                            </Animated.View>
                            {renderCardContent(activeCard)}
                        </Animated.View>
                    </GestureDetector>
                )}
            </View>

            {/* ALT BİLGİ (Sadece Metin) */}
            <View style={styles.footerHint}>
                <Text style={styles.hintText}>Sola Yanlış / Sağa Doğru </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA', paddingTop: 50 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // HEADER
    headerContainer: { paddingHorizontal: 24, marginBottom: 20 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },

    // Sol taraftaki sayaç
    progressTextContainer: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, elevation: 1 },
    progressLabel: { fontSize: 16, fontWeight: 'bold', color: '#555' },

    scoreWrapper: { flexDirection: 'row', alignItems: 'center', gap: 10 },

    // Kombo Stilleri
    fireContainer: { backgroundColor: '#FFF3E0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#FFE0B2' },
    fireText: { color: '#FF9800', fontWeight: 'bold', fontSize: 14 },

    // Kombo 0 iken pasif görünüm
    fireContainerInactive: { backgroundColor: '#F5F5F5', borderColor: '#E0E0E0' },
    fireTextInactive: { color: '#BDBDBD' },

    scoreContainer: { backgroundColor: '#E3F2FD', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
    scoreTextSmall: { color: '#2196F3', fontWeight: 'bold', fontSize: 16 },

    progressBarBackground: { height: 6, backgroundColor: '#E0E0E0', borderRadius: 3, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#4CAF50', borderRadius: 3 },

    // GAME AREA
    gameArea: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -20 },
    card: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        backgroundColor: 'white',
        borderRadius: 24,
        position: 'absolute',
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 15,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
        borderWidth: 1,
        borderColor: '#FFF',
    },
    nextCard: { transform: [{ scale: 0.94 }, { translateY: 15 }], zIndex: -1, opacity: 0.6, backgroundColor: '#F8F9FA' },
    cardInner: { flex: 1, padding: 20, alignItems: 'center' },

    // BADGES
    retryBadge: {
        position: 'absolute', top: 15, right: 15, flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#FFEBEE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, zIndex: 5
    },
    retryText: { color: '#D32F2F', fontSize: 12, fontWeight: 'bold', marginLeft: 4 },

    // CONTENT
    imageContainer: {
        width: '100%', height: '35%', backgroundColor: '#F0F4F8', borderRadius: 16, marginBottom: 15,
        overflow: 'hidden', borderWidth: 1, borderColor: '#EEF2F6'
    },
    mainImage: { width: '100%', height: '100%' },

    textContainer: { flex: 1, width: '100%', justifyContent: 'space-between' },
    textContainerFull: { justifyContent: 'space-evenly' },

    questionBox: {
        width: '100%', padding: 15, backgroundColor: '#fff', borderRadius: 16,
        borderWidth: 2, borderColor: '#ECEFF1', alignItems: 'center', justifyContent: 'center',
        minHeight: 100
    },
    answerBox: {
        width: '100%', padding: 15, backgroundColor: '#fff', borderRadius: 16,
        borderWidth: 2, borderColor: '#ECEFF1', alignItems: 'center', justifyContent: 'center',
        minHeight: 100
    },
    boxExpanded: { flex: 0.45 },

    connector: { alignItems: 'center', zIndex: 10, marginTop: -20, marginBottom: -20 },
    connectorCircle: {
        backgroundColor: '#fff', width: 40, height: 40, borderRadius: 20,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#ECEFF1', elevation: 2
    },

    boxLabel: { position: 'absolute', top: -10, left: 15, backgroundColor: '#fff', paddingHorizontal: 8, fontSize: 11, color: '#90A4AE', fontWeight: 'bold' },
    questionText: { fontSize: 24, fontWeight: 'bold', color: '#263238', textAlign: 'center' },
    answerText: { fontSize: 24, fontWeight: '600', color: '#455A64', textAlign: 'center' },

    // OVERLAYS
    overlay: { ...StyleSheet.absoluteFillObject, borderRadius: 24, justifyContent: 'center', alignItems: 'center', zIndex: 20 },
    overlaySuccess: { backgroundColor: 'rgba(76, 175, 80, 0.85)' },
    overlayFail: { backgroundColor: 'rgba(244, 67, 54, 0.85)' },
    overlayText: { color: 'white', fontSize: 36, fontWeight: '900', letterSpacing: 2, marginTop: 10 },

    // FOOTER
    footerHint: { paddingBottom: 30, alignItems: 'center' },
    hintText: { color: '#B0BEC5', fontSize: 12, fontWeight: '600' },

    // RESULT SCREEN
    resultContainer: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 30 },
    trophyIcon: { marginBottom: 20 },
    resultTitle: { fontSize: 32, fontWeight: 'bold', color: '#333', marginBottom: 30 },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%', marginBottom: 40 },
    statItem: { width: '48%', backgroundColor: '#F5F7FA', padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 15 },
    statItemFull: { width: '100%', backgroundColor: '#E8F5E9', padding: 20, borderRadius: 16, alignItems: 'center' },
    statLabel: { fontSize: 14, color: '#666', marginBottom: 8 },
    statValue: { fontSize: 24, fontWeight: 'bold', color: '#333' },
    statSubtext: { fontSize: 12, color: '#666', marginTop: 5 },

    resultButtons: { width: '100%', gap: 15 },
    playAgainBtn: {
        backgroundColor: '#2196F3', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        padding: 18, borderRadius: 16, elevation: 3
    },
    playAgainText: { color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
    exitBtn: {
        backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
        padding: 18, borderRadius: 16, borderWidth: 2, borderColor: '#eee'
    },
    exitBtnText: { color: '#666', fontSize: 16, fontWeight: 'bold' }
});