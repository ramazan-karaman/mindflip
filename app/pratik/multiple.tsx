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
import { Card } from '../../lib/types';

const { width } = Dimensions.get('window');

// Oyun için özelleştirilmiş kart tipi
interface QuizCard extends Card {
    displayBackWord: string; // Doğru cevap (arka yüz)
    options: string[];       // 4 şık (1 doğru + 3 yanlış)
    correctOptionIndex: number;
    isRetry?: boolean;       // Daha önce yanlış yapıldı mı?
}

export default function MultipleChoiceScreen() {
    const { deckId } = useLocalSearchParams<{ deckId: string }>();
    const router = useRouter();

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
    // Kartın sağa/sola kayması için değer
    const contentTranslateX = useSharedValue(0);
    const contentOpacity = useSharedValue(1);

    useEffect(() => {
        loadGameData();
    }, [deckId]);

    useEffect(() => {
        if (gameOver && deckId) {
            const endTime = Date.now();
            const duration = endTime - startTimeRef.current;
            
            // Servisi çağır (Arka plan işlemi)
            savePracticeSession({
                deckId: parseInt(deckId),
                correctCount: correctCountRef.current,
                wrongCount: wrongCountRef.current,
                durationMs: duration,
                mode: 'multiple' // <--- Modu belirtiyoruz
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

            // Çoktan seçmeli için en az 4 kart lazım (1 doğru + 3 yanlış şık üretebilmek için)
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
            // Şık Oluşturma Mantığı
            const otherCards = cards.filter(c => c.id !== card.id);
            // Rastgele 3 yanlış cevap seç
            const distractors = otherCards
                .sort(() => Math.random() - 0.5)
                .slice(0, 3)
                .map(c => c.back_word);

            const options = [...distractors, card.back_word];
            // Şıkları karıştır
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
        if (isProcessing) return; // Çift tıklamayı önle
        setIsProcessing(true);
        setSelectedOptionIndex(index);

        const currentCard = queue[0];
        const isCorrect = index === currentCard.correctOptionIndex;

        if (isCorrect) {
            // DOĞRU CEVAP: Titreşim YOK
            correctCountRef.current += 1;
            if (!currentCard.isRetry) {
                const newStreak = currentStreak + 1;
                setCurrentStreak(newStreak);
                if (newStreak > maxStreak) setMaxStreak(newStreak);
                setScore(s => s + 10 + (newStreak > 3 ? 5 : 0));
            }
            // Hızlı geçiş
            setTimeout(() => animateTransition(true), 600);
        } else {
            // YANLIŞ CEVAP: Titreşim VAR
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            wrongCountRef.current += 1;
            setCurrentStreak(0);
            setMistakeSet(prev => new Set(prev).add(currentCard.id));

            // Kullanıcı doğrusunu görsün diye biraz daha uzun bekle
            setTimeout(() => animateTransition(false), 1500);
        }
    };

    const animateTransition = (wasCorrect: boolean) => {
        // 1. Mevcut kartı sola kaydır
        contentTranslateX.value = withTiming(-width, { duration: 250 }, () => {
            // Animasyon bitince JS thread'inde state güncelle
            runOnJS(nextCardLogic)(wasCorrect);
        });
        contentOpacity.value = withTiming(0, { duration: 250 });
    };

    const nextCardLogic = (wasCorrect: boolean) => {
        setQueue(prev => {
            const [current, ...rest] = prev;
            if (wasCorrect) {
                // Doğruysa çıkar
                if (rest.length === 0) {
                    setGameOver(true);
                    return [];
                }
                return rest;
            } else {
                // Yanlışsa sona at
                return [...rest, { ...current, isRetry: true }];
            }
        });

        // UI Durumlarını Sıfırla
        setSelectedOptionIndex(null);
        setIsProcessing(false);

        // 2. Yeni kartı sağdan getir (Reset pozisyonu)
        contentTranslateX.value = width;
        contentOpacity.value = 0;

        // 3. İçeri kaydır
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

        // Animasyon değerlerini sıfırla
        contentTranslateX.value = 0;
        contentOpacity.value = 1;
    };

    // --- STYLES & ANIMATION ---
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

    // --- RENDER HELPERS ---

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2196F3" /></View>;

    if (gameOver) {
        const accuracy = calculateAccuracy();
        return (
            <View style={styles.resultContainer}>
                <Ionicons name="trophy" size={100} color="#FFD700" style={styles.trophyIcon} />
                <Text style={styles.resultTitle}>Test Tamamlandı!</Text>

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
    const nonRetryQueueLength = queue.filter(q => !q.isRetry).length;
    const currentCardNumber = Math.min(totalInitialCards, totalInitialCards - nonRetryQueueLength + 1);
    const progressPercent = totalInitialCards > 0 ? ((currentCardNumber) / totalInitialCards) * 100 : 0;

    return (
        <View style={styles.container}>
            {/* HEADER */}
            <View style={styles.headerContainer}>
                <View style={styles.topBar}>
                    <View style={styles.progressTextContainer}>
                        <Text style={styles.progressLabel}>
                            {currentCardNumber} / {totalInitialCards}
                        </Text>
                    </View>

                    <View style={styles.scoreWrapper}>
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

                <View style={styles.progressBarBackground}>
                    <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                </View>
            </View>

            {/* GAME CONTENT - ANIMATED WRAPPER */}
            <View style={styles.gameAreaWrapper}>
                {activeCard && (
                    <Animated.View style={animatedContentStyle}>

                        {/* SORU KARTI (Üst Kısım) */}
                        <View style={styles.questionCard}>
                            {activeCard.isRetry && (
                                <View style={styles.retryBadge}>
                                    <Ionicons name="refresh" size={14} color="#D32F2F" />
                                    <Text style={styles.retryText}>Tekrar</Text>
                                </View>
                            )}

                            {/* Opsiyonel Resim */}
                            {activeCard.front_image ? (
                                <View style={styles.imageContainer}>
                                    <Image source={{ uri: activeCard.front_image }} style={styles.mainImage} resizeMode="cover" />
                                </View>
                            ) : (
                                // Resim yoksa ikon gösterelim ki boş durmasın
                                <View style={{ height: 10 }} />
                            )}

                            <Text style={styles.boxLabel}>Terim</Text>
                            <Text style={styles.questionText}>{activeCard.front_word}</Text>
                        </View>

                        {/* CEVAP ŞIKLARI (Alt Kısım) */}
                        <View style={styles.optionsContainer}>
                            {activeCard.options.map((option, index) => {

                                // --- BUTON STİLLERİ ---
                                const baseButtonStyle = styles.optionButton;
                                let dynamicButtonStyle = {};

                                // --- METİN STİLLERİ ---
                                // 1. Temel metin stili her zaman sabit
                                const baseTextStyle = styles.optionText;
                                // 2. Değişken metin stili (sadece gerektiğinde dolacak)
                                let dynamicTextStyle = {};

                                let iconName = null;

                                if (selectedOptionIndex !== null) {
                                    // Kullanıcı seçim yaptıysa:
                                    if (index === activeCard.correctOptionIndex) {
                                        // Doğru Şık: Yeşil buton, Beyaz kalın yazı
                                        dynamicButtonStyle = styles.optionButtonCorrect;
                                        dynamicTextStyle = styles.optionTextLight;
                                        iconName = "checkmark-circle";
                                    } else if (index === selectedOptionIndex) {
                                        // Yanlış Seçilen Şık: Kırmızı buton, Beyaz kalın yazı
                                        dynamicButtonStyle = styles.optionButtonWrong;
                                        dynamicTextStyle = styles.optionTextLight;
                                        iconName = "close-circle";
                                    } else {
                                        // Diğerleri: Silik buton
                                        dynamicButtonStyle = styles.optionButtonDimmed;
                                    }
                                }

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        // Buton stilini birleştiriyoruz
                                        style={[baseButtonStyle, dynamicButtonStyle]}
                                        onPress={() => handleOptionSelect(index)}
                                        disabled={isProcessing}
                                        activeOpacity={0.9}
                                    >
                                        {/* HATA ÇÖZÜMÜ BURADA: */}
                                        {/* Metin stilini de dizi içinde birleştiriyoruz [Temel, Dinamik] */}
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
    container: { flex: 1, backgroundColor: '#F5F7FA', paddingTop: 50 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // HEADER
    headerContainer: { paddingHorizontal: 24, marginBottom: 10, height: 80 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    progressTextContainer: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, elevation: 1 },
    progressLabel: { fontSize: 16, fontWeight: 'bold', color: '#555' },
    scoreWrapper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    fireContainer: { backgroundColor: '#FFF3E0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#FFE0B2' },
    fireText: { color: '#FF9800', fontWeight: 'bold', fontSize: 14 },
    fireContainerInactive: { backgroundColor: '#F5F5F5', borderColor: '#E0E0E0' },
    fireTextInactive: { color: '#BDBDBD' },
    scoreContainer: { backgroundColor: '#E3F2FD', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
    scoreTextSmall: { color: '#2196F3', fontWeight: 'bold', fontSize: 16 },
    progressBarBackground: { height: 6, backgroundColor: '#E0E0E0', borderRadius: 3, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#4CAF50', borderRadius: 3 },

    // GAME WRAPPER
    gameAreaWrapper: { flex: 1, paddingHorizontal: 20, paddingBottom: 20 },

    // QUESTION CARD
    questionCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4,
        marginBottom: 25,
        minHeight: 200, // Sabit bir minimum yükseklik
        flex: 0.8 // Ekranın üst kısmını kaplasın
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
    iconContainer: { marginBottom: 10, backgroundColor: '#E3F2FD', padding: 15, borderRadius: 50 },

    boxLabel: { fontSize: 12, color: '#90A4AE', fontWeight: 'bold', marginBottom: 5, textTransform: 'uppercase' },
    questionText: { fontSize: 26, fontWeight: 'bold', color: '#263238', textAlign: 'center' },

    // OPTIONS AREA
    optionsContainer: {
        gap: 12,
        justifyContent: 'flex-end',
        marginBottom: 20
    },
    optionButton: {
        backgroundColor: '#fff',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#ECEFF1',
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
    optionButtonDimmed: {
        backgroundColor: '#F5F5F5',
        borderColor: '#EEEEEE',
        opacity: 0.6
    },

    optionText: { fontSize: 18, color: '#455A64', fontWeight: '600', textAlign: 'center' },
    optionTextLight: { fontSize: 18, color: '#fff', fontWeight: 'bold', textAlign: 'center' },
    optionIcon: { position: 'absolute', right: 20 },

    // RESULT SCREEN
    resultContainer: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 30 },
    trophyIcon: { marginBottom: 20 },
    resultTitle: { fontSize: 32, fontWeight: 'bold', color: '#333', marginBottom: 30 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', width: '100%', marginBottom: 40 },
    statItem: { width: '48%', backgroundColor: '#F5F7FA', padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 15 },
    statItemFull: { width: '100%', backgroundColor: '#E8F5E9', padding: 20, borderRadius: 16, alignItems: 'center' },
    statLabel: { fontSize: 14, color: '#666', marginBottom: 8 },
    statValue: { fontSize: 24, fontWeight: 'bold', color: '#333' },

    resultButtons: { width: '100%', gap: 15 },
    playAgainBtn: { backgroundColor: '#2196F3', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 16 },
    playAgainText: { color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
    exitBtn: { backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 16, borderWidth: 2, borderColor: '#eee' },
    exitBtnText: { color: '#666', fontSize: 16, fontWeight: 'bold' }
});