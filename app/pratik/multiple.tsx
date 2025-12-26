import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming
} from 'react-native-reanimated';
import * as CardRepository from '../../lib/repositories/cardRepository';
import { savePracticeSession } from '../../lib/services/practiceService';
import { useTheme } from '../../lib/ThemeContext'; // <-- 1. IMPORT
import { Card } from '../../lib/types';

const { width } = Dimensions.get('window');

// Oyun için özelleştirilmiş kart tipi
interface QuizCard extends Card {
    displayBackWord: string; 
    options: string[];      
    correctOptionIndex: number;
    isRetry?: boolean;      
}

export default function MultipleChoiceScreen() {
    const { deckId } = useLocalSearchParams<{ deckId: string }>();
    const router = useRouter();

    // --- 2. TEMAYI ÇEK ---
    const { isDark } = useTheme();

    // --- 3. RENK PALETİ ---
    const colors = {
        background: isDark ? '#000000' : '#F5F7FA',
        cardBg: isDark ? '#1C1C1E' : '#ffffff',
        text: isDark ? '#ffffff' : '#263238',
        subText: isDark ? '#aaaaaa' : '#555555',
        border: isDark ? '#333333' : '#ECEFF1',
        
        // Header
        progressBg: isDark ? '#1C1C1E' : '#ffffff',
        progressText: isDark ? '#aaa' : '#555',
        fireBg: isDark ? '#3E2723' : '#FFF3E0',
        fireBorder: isDark ? '#5D4037' : '#FFE0B2',
        fireText: isDark ? '#FFAB91' : '#FF9800',
        scoreBg: isDark ? '#0D47A1' : '#E3F2FD',
        scoreText: isDark ? '#64B5F6' : '#2196F3',
        progressBarBg: isDark ? '#333' : '#E0E0E0',

        // Seçenekler
        optionBg: isDark ? '#1C1C1E' : '#ffffff',
        optionBorder: isDark ? '#333333' : '#ECEFF1',
        optionText: isDark ? '#E0E0E0' : '#455A64',
        optionDimmedBg: isDark ? '#121212' : '#F5F5F5',
        
        // Sonuç Ekranı
        resultBg: isDark ? '#000000' : '#ffffff',
        statItemBg: isDark ? '#1C1C1E' : '#F5F7FA',
        statItemFullBg: isDark ? '#1B5E20' : '#E8F5E9',
        exitBtnBg: isDark ? '#000000' : '#ffffff',
        exitBtnBorder: isDark ? '#333' : '#eee',
        exitBtnText: isDark ? '#ccc' : '#666',
        
        imageBg: isDark ? '#121212' : '#F0F4F8',
    };

    // --- DURUM YÖNETİMİ ---
    const [queue, setQueue] = useState<QuizCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [gameOver, setGameOver] = useState(false);

    // Seçim Durumu
    const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
    const [isProcessing, setIsProcessing] = useState(false); // Tıklamayı kilitlemek için

    // --- İSTATİSTİKLER ---
    const [score, setScore] = useState(0);
    const [currentStreak, setCurrentStreak] = useState(0);
    const [maxStreak, setMaxStreak] = useState(0);
    const [totalInitialCards, setTotalInitialCards] = useState(0);
    const [mistakeSet, setMistakeSet] = useState<Set<number>>(new Set());

    const startTimeRef = useRef<number>(Date.now());
    const correctCountRef = useRef<number>(0);
    const wrongCountRef = useRef<number>(0);

    // --- ANİMASYON ---
    const contentTranslateX = useSharedValue(0);
    const contentOpacity = useSharedValue(1);

    useEffect(() => {
        loadGameData();
    }, [deckId]);

    useEffect(() => {
        if (gameOver && deckId) {
            const endTime = Date.now();
            const duration = endTime - startTimeRef.current;
            
            savePracticeSession({
                deckId: parseInt(deckId),
                correctCount: correctCountRef.current,
                wrongCount: wrongCountRef.current,
                durationMs: duration,
                mode: 'multiple'
            });
        }
    }, [gameOver]);

    const loadGameData = async () => {
        if (!deckId) return;
        startTimeRef.current = Date.now();
        correctCountRef.current = 0;
        wrongCountRef.current = 0;
        try {
            const cards = await CardRepository.getCardByIdDeck(parseInt(deckId));

            if (cards.length < 4) {
                Alert.alert("Yetersiz Kart", "Çoktan seçmeli mod için destede en az 4 kart olmalıdır.", [
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
        const shuffledCards = [...cards].sort(() => Math.random() - 0.5);

        const quizCards: QuizCard[] = shuffledCards.map((card) => {
            const otherCards = cards.filter(c => c.id !== card.id);
            const distractors = otherCards
                .sort(() => Math.random() - 0.5)
                .slice(0, 3)
                .map(c => c.back_word);

            const options = [...distractors, card.back_word];
            const shuffledOptions = options.sort(() => Math.random() - 0.5);
            const correctIndex = shuffledOptions.indexOf(card.back_word);

            return {
                ...card,
                displayBackWord: card.back_word,
                options: shuffledOptions,
                correctOptionIndex: correctIndex,
                isRetry: false
            };
        });

        setQueue(quizCards);
        setTotalInitialCards(quizCards.length);
    };

    const handleOptionSelect = (index: number) => {
        if (isProcessing) return; 
        setIsProcessing(true);
        setSelectedOptionIndex(index);

        const currentCard = queue[0];
        const isCorrect = index === currentCard.correctOptionIndex;

        if (isCorrect) {
            correctCountRef.current += 1;
            if (!currentCard.isRetry) {
                const newStreak = currentStreak + 1;
                setCurrentStreak(newStreak);
                if (newStreak > maxStreak) setMaxStreak(newStreak);
                setScore(s => s + 10 + (newStreak > 3 ? 5 : 0));
            }
            setTimeout(() => animateTransition(true), 600);
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            wrongCountRef.current += 1;
            setCurrentStreak(0);
            setMistakeSet(prev => new Set(prev).add(currentCard.id));

            setTimeout(() => animateTransition(false), 1500);
        }
    };

    const animateTransition = (wasCorrect: boolean) => {
        contentTranslateX.value = withTiming(-width, { duration: 250 }, () => {
            runOnJS(nextCardLogic)(wasCorrect);
        });
        contentOpacity.value = withTiming(0, { duration: 250 });
    };

    const nextCardLogic = (wasCorrect: boolean) => {
        setQueue(prev => {
            const [current, ...rest] = prev;
            if (wasCorrect) {
                if (rest.length === 0) {
                    setGameOver(true);
                    return [];
                }
                return rest;
            } else {
                return [...rest, { ...current, isRetry: true }];
            }
        });

        setSelectedOptionIndex(null);
        setIsProcessing(false);

        contentTranslateX.value = width;
        contentOpacity.value = 0;

        contentTranslateX.value = withTiming(0, { duration: 300 });
        contentOpacity.value = withTiming(1, { duration: 300 });
    };

    const restartGame = () => {
        setLoading(true);
        setGameOver(false);
        setScore(0);
        setCurrentStreak(0);
        setMaxStreak(0);
        setMistakeSet(new Set());
        loadGameData();

        contentTranslateX.value = 0;
        contentOpacity.value = 1;
    };

    const animatedContentStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: contentTranslateX.value }],
        opacity: contentOpacity.value,
        flex: 1,
        width: '100%'
    }));

    const calculateAccuracy = () => {
        if (totalInitialCards === 0) return 0;
        const correctFirstTry = totalInitialCards - mistakeSet.size;
        return Math.round((correctFirstTry / totalInitialCards) * 100);
    };

    if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color="#2196F3" /></View>;

    if (gameOver) {
        const accuracy = calculateAccuracy();
        return (
            <View style={[styles.resultContainer, { backgroundColor: colors.resultBg }]}>
                <Ionicons name="trophy" size={100} color="#FFD700" style={styles.trophyIcon} />
                <Text style={[styles.resultTitle, { color: colors.text }]}>Test Tamamlandı!</Text>

                <View style={styles.statsGrid}>
                    <View style={[styles.statItem, { backgroundColor: colors.statItemBg }]}>
                        <Text style={styles.statLabel}>Toplam Puan</Text>
                        <Text style={[styles.statValue, { color: colors.text }]}>{score}</Text>
                    </View>
                    <View style={[styles.statItem, { backgroundColor: colors.statItemBg }]}>
                        <Text style={styles.statLabel}>Max Kombo</Text>
                        <Text style={[styles.statValue, { color: colors.text }]}>🔥 {maxStreak}</Text>
                    </View>
                    <View style={[styles.statItemFull, { backgroundColor: colors.statItemFullBg }]}>
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

                    <TouchableOpacity style={[styles.exitBtn, { backgroundColor: colors.exitBtnBg, borderColor: colors.exitBtnBorder }]} onPress={() => router.back()}>
                        <Text style={[styles.exitBtnText, { color: colors.exitBtnText }]}>Listeye Dön</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const activeCard = queue[0];
    const nonRetryQueueLength = queue.filter(q => !q.isRetry).length;
    const currentCardNumber = Math.min(totalInitialCards, totalInitialCards - nonRetryQueueLength + 1);
    const progressPercent = totalInitialCards > 0 ? ((currentCardNumber) / totalInitialCards) * 100 : 0;

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* HEADER */}
            <View style={styles.headerContainer}>
                <View style={styles.topBar}>
                    <View style={[styles.progressTextContainer, { backgroundColor: colors.progressBg }]}>
                        <Text style={[styles.progressLabel, { color: colors.progressText }]}>
                            {currentCardNumber} / {totalInitialCards}
                        </Text>
                    </View>

                    <View style={styles.scoreWrapper}>
                        <View style={[
                            styles.fireContainer, 
                            { backgroundColor: colors.fireBg, borderColor: colors.fireBorder },
                            currentStreak === 0 && { backgroundColor: isDark ? '#222' : '#F5F5F5', borderColor: isDark ? '#333' : '#E0E0E0' }
                        ]}>
                            <Text style={[
                                styles.fireText, 
                                { color: colors.fireText },
                                currentStreak === 0 && { color: isDark ? '#555' : '#BDBDBD' }
                            ]}>
                                🔥 {currentStreak}
                            </Text>
                        </View>
                        <View style={[styles.scoreContainer, { backgroundColor: colors.scoreBg }]}>
                            <Text style={[styles.scoreTextSmall, { color: colors.scoreText }]}>{score}</Text>
                        </View>
                    </View>
                </View>

                <View style={[styles.progressBarBackground, { backgroundColor: colors.progressBarBg }]}>
                    <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                </View>
            </View>

            {/* GAME CONTENT - ANIMATED WRAPPER */}
            <View style={styles.gameAreaWrapper}>
                {activeCard && (
                    <Animated.View style={animatedContentStyle}>

                        {/* SORU KARTI */}
                        <View style={[styles.questionCard, { backgroundColor: colors.cardBg, borderColor: colors.border, borderWidth: 1 }]}>
                            {activeCard.isRetry && (
                                <View style={styles.retryBadge}>
                                    <Ionicons name="refresh" size={14} color="#D32F2F" />
                                    <Text style={styles.retryText}>Tekrar</Text>
                                </View>
                            )}

                            {activeCard.front_image ? (
                                <View style={[styles.imageContainer, { backgroundColor: colors.imageBg }]}>
                                    <Image source={{ uri: activeCard.front_image }} style={styles.mainImage} resizeMode="cover" />
                                </View>
                            ) : (
                                <View style={{ height: 10 }} />
                            )}

                            <Text style={styles.boxLabel}>Terim</Text>
                            <Text style={[styles.questionText, { color: colors.text }]}>{activeCard.front_word}</Text>
                        </View>

                        {/* CEVAP ŞIKLARI */}
                        <View style={styles.optionsContainer}>
                            {activeCard.options.map((option, index) => {

                                const baseButtonStyle = styles.optionButton;
                                let dynamicButtonStyle = {};
                                
                                // Base Style'a tema renklerini ekle
                                const themeStyle = { backgroundColor: colors.optionBg, borderColor: colors.optionBorder };

                                const baseTextStyle = styles.optionText;
                                // Base Text'e tema rengini ekle
                                let dynamicTextStyle = { color: colors.optionText };

                                let iconName = null;

                                if (selectedOptionIndex !== null) {
                                    if (index === activeCard.correctOptionIndex) {
                                        // Doğru Şık
                                        dynamicButtonStyle = styles.optionButtonCorrect;
                                        dynamicTextStyle = styles.optionTextLight; // Beyaz yazı
                                        iconName = "checkmark-circle";
                                    } else if (index === selectedOptionIndex) {
                                        // Yanlış Seçilen
                                        dynamicButtonStyle = styles.optionButtonWrong;
                                        dynamicTextStyle = styles.optionTextLight; // Beyaz yazı
                                        iconName = "close-circle";
                                    } else {
                                        // Diğerleri
                                        dynamicButtonStyle = { backgroundColor: colors.optionDimmedBg, borderColor: colors.border, opacity: 0.6 };
                                    }
                                }

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[baseButtonStyle, themeStyle, dynamicButtonStyle]}
                                        onPress={() => handleOptionSelect(index)}
                                        disabled={isProcessing}
                                        activeOpacity={0.9}
                                    >
                                        <Text style={[baseTextStyle, dynamicTextStyle]} numberOfLines={2}>
                                            {option}
                                        </Text>

                                        {iconName && (
                                            <Ionicons name={iconName as any} size={24} color="white" style={styles.optionIcon} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                    </Animated.View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: 50 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // HEADER
    headerContainer: { paddingHorizontal: 24, marginBottom: 10, height: 80 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    progressTextContainer: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, elevation: 1 },
    progressLabel: { fontSize: 16, fontWeight: 'bold' },
    scoreWrapper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    fireContainer: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
    fireText: { fontWeight: 'bold', fontSize: 14 },
    scoreContainer: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
    scoreTextSmall: { fontWeight: 'bold', fontSize: 16 },
    progressBarBackground: { height: 6, borderRadius: 3, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#4CAF50', borderRadius: 3 },

    // GAME WRAPPER
    gameAreaWrapper: { flex: 1, paddingHorizontal: 20, paddingBottom: 20 },

    // QUESTION CARD
    questionCard: {
        borderRadius: 24,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4,
        marginBottom: 25,
        minHeight: 200, 
        flex: 0.8 
    },
    retryBadge: {
        position: 'absolute', top: 15, right: 15, flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#FFEBEE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, zIndex: 5
    },
    retryText: { color: '#D32F2F', fontSize: 12, fontWeight: 'bold', marginLeft: 4 },

    imageContainer: {
        width: '100%', height: 150, borderRadius: 12, marginBottom: 15, overflow: 'hidden'
    },
    mainImage: { width: '100%', height: '100%' },

    boxLabel: { fontSize: 12, color: '#90A4AE', fontWeight: 'bold', marginBottom: 5, textTransform: 'uppercase' },
    questionText: { fontSize: 26, fontWeight: 'bold', textAlign: 'center' },

    // OPTIONS AREA
    optionsContainer: {
        gap: 12,
        justifyContent: 'flex-end',
        marginBottom: 20
    },
    optionButton: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 16,
        borderWidth: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2
    },
    optionButtonCorrect: {
        backgroundColor: '#4CAF50',
        borderColor: '#4CAF50',
        elevation: 4
    },
    optionButtonWrong: {
        backgroundColor: '#FF5252',
        borderColor: '#FF5252',
        elevation: 4
    },
    
    optionText: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
    optionTextLight: { color: '#fff', fontWeight: 'bold' },
    optionIcon: { position: 'absolute', right: 20 },

    // RESULT SCREEN
    resultContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
    trophyIcon: { marginBottom: 20 },
    resultTitle: { fontSize: 32, fontWeight: 'bold', marginBottom: 30 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%', marginBottom: 40 },
    statItem: { width: '48%', padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 15 },
    statItemFull: { width: '100%', padding: 20, borderRadius: 16, alignItems: 'center' },
    statLabel: { fontSize: 14, color: '#666', marginBottom: 8 },
    statValue: { fontSize: 24, fontWeight: 'bold' },

    resultButtons: { width: '100%', gap: 15 },
    playAgainBtn: { backgroundColor: '#2196F3', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 16 },
    playAgainText: { color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
    exitBtn: { alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 16, borderWidth: 2 },
    exitBtnText: { fontSize: 16, fontWeight: 'bold' }
});