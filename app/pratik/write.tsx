import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, {
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming
} from 'react-native-reanimated';
import * as CardRepository from '../../lib/repositories/cardRepository';
import { savePracticeSession } from '../../lib/services/practiceService';
import { useTheme } from '../../lib/ThemeContext';
import { Card } from '../../lib/types';

const { width } = Dimensions.get('window');

// --- TİP TANIMLARI ---
interface TypingCard extends Card {
    isRetry?: boolean;
}

export default function TypingScreen() {
    const { deckId } = useLocalSearchParams<{ deckId: string }>();
    const router = useRouter();

    const { isDark } = useTheme();

    const colors = {
        background: isDark ? '#000000' : '#F5F7FA',
        text: isDark ? '#FFFFFF' : '#333333',
        subText: isDark ? '#AAAAAA' : '#555555',
        
        // Header & Stats
        progressBg: isDark ? '#1C1C1E' : '#ffffff',
        progressText: isDark ? '#aaa' : '#555',
        fireBg: isDark ? '#3E2723' : '#FFF3E0',
        fireBorder: isDark ? '#5D4037' : '#FFE0B2',
        fireText: isDark ? '#FFAB91' : '#FF9800',
        scoreBg: isDark ? '#0D47A1' : '#E3F2FD',
        scoreText: isDark ? '#64B5F6' : '#2196F3',
        progressBarBg: isDark ? '#333' : '#E0E0E0',

        // Soru Alanı
        questionLabel: isDark ? '#90A4AE' : '#90A4AE',
        imageBg: isDark ? '#121212' : '#eee',

        // Input Alanı (Bottom Sheet)
        inputAreaBg: isDark ? '#1C1C1E' : '#ffffff',
        inputDefaultBorder: isDark ? '#444' : '#E0E0E0',
        inputDefaultBg: isDark ? '#2C2C2E' : '#ffffff',
        inputText: isDark ? '#FFFFFF' : '#333333',
        placeholder: isDark ? '#666666' : '#999',

        // Geri Bildirim (Feedback) Arka Planları
        successBg: isDark ? '#1B5E20' : '#E8F5E9', // Koyu yeşil / Açık yeşil
        errorBg: isDark ? '#B71C1C' : '#FFEBEE',   // Koyu kırmızı / Açık kırmızı
        correctionBg: isDark ? '#3E2723' : '#FFEBEE',
        correctionBorder: isDark ? '#D32F2F' : '#EF9A9A',

        // Sonuç Ekranı
        resultBg: isDark ? '#000000' : '#ffffff',
        statItemBg: isDark ? '#1C1C1E' : '#F5F7FA',
        statItemFullBg: isDark ? '#1B5E20' : '#E8F5E9',
        exitBtnBg: isDark ? '#000000' : '#ffffff',
        exitBtnBorder: isDark ? '#333' : '#eee',
        exitBtnText: isDark ? '#ccc' : '#666',
    };

    // --- OYUN DURUMU ---
    const [queue, setQueue] = useState<TypingCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [gameOver, setGameOver] = useState(false);

    // --- INPUT DURUMU ---
    const [userInput, setUserInput] = useState('');
    const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
    const [isProcessing, setIsProcessing] = useState(false); // Çift tıklama ve geçiş koruması
    const inputRef = useRef<TextInput>(null);

    // --- İSTATİSTİKLER ---
    const [score, setScore] = useState(0);
    const [currentStreak, setCurrentStreak] = useState(0);
    const [maxStreak, setMaxStreak] = useState(0);
    const [totalInitialCards, setTotalInitialCards] = useState(0);
    const [mistakeSet, setMistakeSet] = useState<Set<number>>(new Set());

    const startTimeRef = useRef<number>(Date.now());
    const correctCountRef = useRef<number>(0);
    const wrongCountRef = useRef<number>(0);

    // --- ANİMASYON DEĞERLERİ ---
    const inputShake = useSharedValue(0);

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
                mode: 'write' // <--- Mod: Yazma
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
            if (cards.length === 0) {
                Alert.alert("Uyarı", "Bu destede kart bulunmamaktadır.", [
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
        // Kartları karıştır
        const shuffled = [...cards].sort(() => Math.random() - 0.5);
        const gameCards: TypingCard[] = shuffled.map(c => ({ ...c, isRetry: false }));

        setQueue(gameCards);
        setTotalInitialCards(gameCards.length);
    };

    // Metni temizle (Boşluklar ve küçük harf)
    const normalizeText = (text: string) => {
        return text.trim().toLocaleLowerCase('tr-TR');
    };

    const handleCheck = () => {
        if (isProcessing || !userInput.trim()) return;
        setIsProcessing(true);

        const currentCard = queue[0];
        const userAnswer = normalizeText(userInput);
        const correctAnswer = normalizeText(currentCard.back_word);

        if (userAnswer === correctAnswer) {
            // ✅ DOĞRU
            correctCountRef.current += 1;
            setFeedbackStatus('correct');
            // Titreşim yok (Sessiz başarı)

            if (!currentCard.isRetry) {
                const newStreak = currentStreak + 1;
                setCurrentStreak(newStreak);
                if (newStreak > maxStreak) setMaxStreak(newStreak);
                // İpucu kullanıldıysa puan kırılabilir (şimdilik yok)
                setScore(s => s + 10 + (newStreak > 3 ? 5 : 0));
            }

            // Hızlı geçiş (500ms)
            setTimeout(() => {
                nextCard(true);
            }, 500);

        } else {
            // ❌ YANLIŞ
            wrongCountRef.current += 1;
            setFeedbackStatus('wrong');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

            // Inputu salla
            inputShake.value = withSequence(
                withTiming(-10, { duration: 50 }),
                withRepeat(withTiming(10, { duration: 100 }), 3, true),
                withTiming(0, { duration: 50 })
            );

            setCurrentStreak(0);
            setMistakeSet(prev => new Set(prev).add(currentCard.id));
            Keyboard.dismiss(); // Hatayı rahat görsün diye klavyeyi kapat

            // Kullanıcı doğrusunu görsün diye 2.5 saniye bekle
            setTimeout(() => {
                nextCard(false);
            }, 2500);
        }
    };

    const nextCard = (wasCorrect: boolean) => {
        setFeedbackStatus('idle');
        setUserInput('');
        setIsProcessing(false);
        inputShake.value = 0;

        setQueue(prev => {
            const [current, ...rest] = prev;

            if (wasCorrect) {
                // Doğruysa listeden at
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
    };

    const giveHint = () => {
        const currentCard = queue[0];
        const correctAnswer = currentCard.back_word;

        // Basit İpucu: Sıradaki harfi ekle
        const nextCharIndex = userInput.length;
        if (nextCharIndex < correctAnswer.length) {
            const charToAdd = correctAnswer[nextCharIndex];
            setUserInput(prev => prev + charToAdd);

            // İpucu kullanıldığı için o anlık puan kırılabilir veya streak bozulabilir (şimdilik yok)
            // Şimdilik sadece kullanıcıya yardım ediyoruz.
        }
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

    const calculateAccuracy = () => {
        if (totalInitialCards === 0) return 0;
        const correctFirstTry = totalInitialCards - mistakeSet.size;
        return Math.round((correctFirstTry / totalInitialCards) * 100);
    };

    // --- STYLES & ANIMATION ---
    const animatedInputStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: inputShake.value }]
    }));

    // İlerleme
    const nonRetryQueueLength = queue.filter(q => !q.isRetry).length;
    const currentCardNumber = Math.min(totalInitialCards, totalInitialCards - nonRetryQueueLength + 1);
    const progressPercent = totalInitialCards > 0 ? ((currentCardNumber) / totalInitialCards) * 100 : 0;

    let inputBorderColor = colors.inputDefaultBorder;
    let inputBgColor = colors.inputDefaultBg;

    if (feedbackStatus === 'correct') {
        inputBorderColor = '#4CAF50';
        inputBgColor = colors.successBg;
    } else if (feedbackStatus === 'wrong') {
        inputBorderColor = '#F44336';
        inputBgColor = colors.errorBg;
    }

    // RENDER
    if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color="#2196F3" /></View>;

    if (gameOver) {
        const accuracy = calculateAccuracy();
        return (
            <View style={[styles.resultContainer, { backgroundColor: colors.resultBg }]}>
                <Ionicons name="trophy" size={100} color="#FFD700" style={styles.trophyIcon} />
                <Text style={[styles.resultTitle, { color: colors.text }]}>Tebrikler!</Text>

                <View style={styles.statsGrid}>
                    <View style={[styles.statItem, { backgroundColor: colors.statItemBg }]}>
                        <Text style={styles.statLabel}>Puan</Text>
                        <Text style={[styles.statValue, { color: colors.text }]}>{score}</Text>
                    </View>
                    <View style={[styles.statItem, { backgroundColor: colors.statItemBg }]}>
                        <Text style={styles.statLabel}>Max Kombo</Text>
                        <Text style={[styles.statValue, { color: colors.text }]}>{score}🔥 {maxStreak}</Text>
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

    return (
        <KeyboardAvoidingView
            style={{ flex: 1, backgroundColor: colors.background }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
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

                {/* SORU ALANI */}
                <View style={styles.questionArea}>
                    {activeCard.isRetry && (
                        <View style={styles.retryBadge}>
                            <Ionicons name="refresh" size={12} color="#D32F2F" />
                            <Text style={styles.retryText}>Tekrar</Text>
                        </View>
                    )}

                    {activeCard.front_image ? (
                        <Image source={{ uri: activeCard.front_image }} style={[styles.questionImage, { backgroundColor: colors.imageBg }]} resizeMode="cover" />
                    ) : (
                        <View style={{ height: 20 }} />
                    )}

                    <Text style={[styles.questionLabel, { color: colors.questionLabel }]}>Bunu yazınız:</Text>
                    <Text style={[styles.questionText, { color: colors.text }]}>{activeCard.front_word}</Text>
                </View>

                {/* INPUT ALANI */}
                <View style={[styles.inputArea, { backgroundColor: colors.inputAreaBg, shadowColor: isDark ? '#000' : '#000' }]}>

                    {/* Yanlış Cevap Geri Bildirimi (Sadece yanlışsa görünür) */}
                    {feedbackStatus === 'wrong' && (
                        <Animated.View
                            entering={FadeInDown.springify().damping(12)}
                             style={[styles.correctionContainer, { backgroundColor: colors.correctionBg, borderColor: colors.correctionBorder }]}>
                            <Text style={styles.correctionLabel}>Doğrusu:</Text>
                            <Text style={styles.correctionText}>{activeCard.back_word}</Text>
                        </Animated.View>
                    )}

                    <View style={styles.inputWrapper}>
                        <Animated.View style={[styles.inputContainer, { borderColor: inputBorderColor, backgroundColor: inputBgColor }, animatedInputStyle]}>
                            <TextInput
                                ref={inputRef}
                                style={[styles.textInput, { color: colors.inputText }]}
                                value={userInput}
                                onChangeText={setUserInput}
                                placeholder="Cevabı buraya yaz..."
                                placeholderTextColor={colors.placeholder}
                                autoFocus={true} // Klavye otomatik açılır
                                autoCapitalize="none"
                                autoCorrect={false}
                                onSubmitEditing={handleCheck} // Klavyedeki 'Git' tuşu
                                editable={!isProcessing} // İşlem sırasında kilitlenir
                            />
                            {/* İpucu Butonu (Input içinde sağda) */}
                            <TouchableOpacity onPress={giveHint} style={styles.hintButton} disabled={isProcessing}>
                                <Ionicons name="bulb-outline" size={24} color="#FF9800" />
                            </TouchableOpacity>
                        </Animated.View>
                    </View>

                    <TouchableOpacity
                        style={[styles.checkButton, !userInput.trim() && styles.checkButtonDisabled]}
                        onPress={handleCheck}
                        disabled={isProcessing || !userInput.trim()}
                    >
                        <Text style={styles.checkButtonText}>KONTROL ET</Text>
                    </TouchableOpacity>
                </View>

            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA', paddingTop: 50 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // HEADER
    headerContainer: { paddingHorizontal: 24, marginBottom: 10 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
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

    // QUESTION AREA
    questionArea: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        marginBottom: 20
    },
    retryBadge: {
        position: 'absolute', top: 0, right: 20, flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#FFEBEE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8
    },
    retryText: { color: '#D32F2F', fontSize: 10, fontWeight: 'bold', marginLeft: 4 },
    questionImage: { width: 120, height: 120, borderRadius: 16, marginBottom: 15, backgroundColor: '#eee' },
    questionLabel: { fontSize: 14, color: '#90A4AE', fontWeight: 'bold', marginBottom: 5, textTransform: 'uppercase' },
    questionText: { fontSize: 32, fontWeight: 'bold', color: '#333', textAlign: 'center' },

    // INPUT AREA
    inputArea: {
        backgroundColor: '#fff',
        padding: 24,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        elevation: 10,
        shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: -5 }
    },
    correctionContainer: {
        backgroundColor: '#FFEBEE',
        padding: 12,
        borderRadius: 12,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#EF9A9A',
        alignItems: 'center'
    },
    correctionLabel: { color: '#D32F2F', fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
    correctionText: { color: '#C62828', fontSize: 18, fontWeight: 'bold' },

    inputWrapper: { marginBottom: 15 },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2,
        borderRadius: 16,
        paddingHorizontal: 15,
        height: 60,
    },
    textInput: { flex: 1, fontSize: 18, color: '#333', fontWeight: '600' },
    hintButton: { padding: 8 },

    checkButton: {
        backgroundColor: '#2196F3',
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#2196F3', shadowOpacity: 0.3, shadowRadius: 5, shadowOffset: { width: 0, height: 3 }, elevation: 3
    },
    checkButtonDisabled: { backgroundColor: '#B0BEC5', shadowOpacity: 0, elevation: 0 },
    checkButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },

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