import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Modal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    FadeOut,
    LinearTransition,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
    ZoomIn
} from 'react-native-reanimated';
import * as CardRepository from '../../lib/repositories/cardRepository';
import { Card } from '../../lib/types';

const { width, height } = Dimensions.get('window');
const GAP = 12;
const GRID_PADDING = 16;

// Sabit genişlik hesabı
const CARD_WIDTH = (width - (GRID_PADDING * 2) - GAP) / 2;

interface MatchItem {
    id: string;
    cardId: number;
    text: string;
    type: 'question' | 'answer';
    isMatched: boolean;
}

// --- CARD COMPONENT ---
const CardComponent = React.memo(({ 
    item, 
    isSelected, 
    isWrong, 
    cardHeight,
    onPress 
}: { 
    item: MatchItem, 
    isSelected: boolean, 
    isWrong: boolean, 
    cardHeight: number,
    onPress: (item: MatchItem) => void 
}) => {
    
    const offset = useSharedValue(0);
    
    useEffect(() => {
        if (isWrong) {
            offset.value = withSequence(
                withTiming(-5, { duration: 50 }),
                withRepeat(withTiming(5, { duration: 100 }), 3, true),
                withTiming(0, { duration: 50 })
            );
        }
    }, [isWrong]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: offset.value }]
    }));

    // Stiller 
    const baseCardStyle = { ...styles.card, height: cardHeight };
    const baseTextStyle = styles.cardText;

    let dynamicCardStyle = {};
    let dynamicTextStyle = {};

    if (isWrong) {
        dynamicCardStyle = styles.cardWrong;
        dynamicTextStyle = styles.cardTextWrong;
    } else if (isSelected) {
        dynamicCardStyle = styles.cardSelected;
        dynamicTextStyle = styles.cardTextSelected;
    }

    // Eşleşen kart (Boşluk)
    if (item.isMatched) {
        return <View style={[styles.cardPlaceholder, { height: cardHeight }]} />;
    }

    return (
        <Animated.View 
            layout={LinearTransition} 
            entering={ZoomIn.duration(400)} 
            exiting={FadeOut.duration(300)}
            style={[styles.cardWrapper, { height: cardHeight }]}
        >
            <TouchableOpacity 
                style={{flex: 1}} 
                onPress={() => onPress(item)}
                activeOpacity={0.85}
            >
                <Animated.View style={[baseCardStyle, dynamicCardStyle, animatedStyle]}>
                    <Text 
                        style={[baseTextStyle, dynamicTextStyle]} 
                        numberOfLines={4} 
                        adjustsFontSizeToFit 
                        minimumFontScale={0.6}
                    >
                        {item.text}
                    </Text>
                </Animated.View>
            </TouchableOpacity>
        </Animated.View>
    );
});


export default function MatchScreen() {
    const { deckId } = useLocalSearchParams<{ deckId: string }>();
    const router = useRouter();

    // --- DATA ---
    const [allPairs, setAllPairs] = useState<Card[]>([]);
    const [currentRoundItems, setCurrentRoundItems] = useState<MatchItem[]>([]);
    const [currentPairIndex, setCurrentPairIndex] = useState(0);
    
    // --- GAME STATE ---
    const [selectedItem, setSelectedItem] = useState<MatchItem | null>(null);
    const [wrongPairIds, setWrongPairIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [gameOver, setGameOver] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // --- UI STATE ---
    const [gridHeight, setGridHeight] = useState(0);
    const [showEndModal, setShowEndModal] = useState(false); // "Süre Bitti" Modalı için
    const [endModalType, setEndModalType] = useState<'timeout' | 'success'>('success');

    // --- STATS ---
    const [score, setScore] = useState(0);
    const [currentStreak, setCurrentStreak] = useState(0);
    const [maxStreak, setMaxStreak] = useState(0);
    const [mistakeCount, setMistakeCount] = useState(0);
    
    // --- TIMER ---
    const [timeLeft, setTimeLeft] = useState(0);
    const [initialTime, setInitialTime] = useState(0);
    const timerRef = useRef<any>(null);

    useEffect(() => {
        loadGameData();
        return () => stopTimer();
    }, [deckId]);

    useEffect(() => {
        if (!loading && !gameOver && !showEndModal && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        stopTimer();
                        triggerEndGame('timeout'); // Süre bitti akışını başlat
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => stopTimer();
    }, [loading, gameOver, showEndModal]);

    const stopTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
    };

    // Oyun bitişini yumuşatan fonksiyon
    const triggerEndGame = (type: 'timeout' | 'success') => {
        stopTimer();
        setEndModalType(type);
        setShowEndModal(true); // Önce modalı göster

        // 1.5 saniye sonra asıl sonuç ekranına geç
        setTimeout(() => {
            setShowEndModal(false);
            setGameOver(true);
        }, 1500);
    };

    const loadGameData = async () => {
        if (!deckId) return;
        try {
            const cards = await CardRepository.getCardByIdDeck(parseInt(deckId));
            if (cards.length < 4) {
                Alert.alert("Yetersiz Kart", "Eşleştirme modu için destede en az 4 kart olmalıdır.", [
                    { text: "Geri Dön", onPress: () => router.back() }
                ]);
                return;
            }

            const shuffled = cards.sort(() => Math.random() - 0.5);
            setAllPairs(shuffled);
            
            const timeCalc = shuffled.length * 5; // Çift başı 5 saniye
            setInitialTime(timeCalc);
            setTimeLeft(timeCalc);

            startRound(shuffled, 0);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const startRound = (sourceCards: Card[], startIndex: number) => {
        const roundCards = sourceCards.slice(startIndex, startIndex + 4);
        
        if (roundCards.length === 0) {
            triggerEndGame('success');
            return;
        }

        let items: MatchItem[] = [];
        roundCards.forEach(card => {
            items.push({ id: `q_${card.id}`, cardId: card.id, text: card.front_word, type: 'question', isMatched: false });
            items.push({ id: `a_${card.id}`, cardId: card.id, text: card.back_word, type: 'answer', isMatched: false });
        });

        items = items.sort(() => Math.random() - 0.5);
        setCurrentRoundItems(items);
        setCurrentPairIndex(startIndex);
    };

    const handleCardPress = useCallback((item: MatchItem) => {
        if (isProcessing || wrongPairIds.includes(item.id) || item.isMatched) return;
        
        if (selectedItem?.id === item.id) {
            setSelectedItem(null);
            return;
        }

        if (!selectedItem) {
            setSelectedItem(item);
        } else {
            setIsProcessing(true);
            const isMatch = selectedItem.cardId === item.cardId;

            if (isMatch) {
                // ✅ DOĞRU
                setCurrentStreak(prev => {
                    const newStreak = prev + 1;
                    setMaxStreak(ms => Math.max(ms, newStreak));
                    setScore(s => s + 10 + (newStreak > 3 ? 5 : 0));
                    return newStreak;
                });

                const matchedIds = [selectedItem.id, item.id];
                
                setCurrentRoundItems(prevItems => {
                    const newItems = prevItems.map(i => matchedIds.includes(i.id) ? { ...i, isMatched: true } : i);
                    
                    // Tur Kontrolü
                    const allMatched = newItems.every(i => i.isMatched);
                    if (allMatched) {
                        setTimeout(() => {
                            startRound(allPairs, currentPairIndex + 4);
                        }, 500);
                    }
                    return newItems;
                });

                setSelectedItem(null);
                setIsProcessing(false);

            } else {
                // ❌ YANLIŞ
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                setCurrentStreak(0);
                setMistakeCount(m => m + 1);
                
                setWrongPairIds([selectedItem.id, item.id]);

                setTimeout(() => {
                    setWrongPairIds([]);
                    setSelectedItem(null);
                    setIsProcessing(false);
                }, 800);
            }
        }
    }, [selectedItem, isProcessing, wrongPairIds, allPairs, currentPairIndex]);

    const restartGame = () => {
        setLoading(true);
        setGameOver(false);
        setScore(0);
        setCurrentStreak(0);
        setMaxStreak(0);
        setMistakeCount(0);
        loadGameData();
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const calculateAccuracy = () => {
        const totalPairs = allPairs.length;
        if (totalPairs === 0) return 0;
        const totalAttempts = totalPairs + mistakeCount;
        return Math.round((totalPairs / totalAttempts) * 100);
    };

    // Dinamik Kart Yüksekliği
    const onGridLayout = (event: any) => {
        const { height } = event.nativeEvent.layout;
        setGridHeight(height);
    };
    const dynamicCardHeight = gridHeight > 0 ? (gridHeight - (GAP * 3)) / 4 : 0;

    // Timer Progress Bar Rengi
    const timerProgress = initialTime > 0 ? timeLeft / initialTime : 0;
    let timerColor = '#4CAF50'; // Yeşil
    if (timerProgress < 0.5) timerColor = '#FFC107'; // Sarı
    if (timerProgress < 0.2) timerColor = '#F44336'; // Kırmızı

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#2196F3" /></View>;

    if (gameOver) {
        const accuracy = calculateAccuracy();
        const isSuccess = endModalType === 'success';
        return (
            <View style={styles.resultContainer}>
                <Ionicons name={isSuccess ? "trophy" : "hourglass"} size={100} color={isSuccess ? "#FFD700" : "#FF9800"} style={styles.trophyIcon} />
                <Text style={styles.resultTitle}>{isSuccess ? "Oyun Tamamlandı!" : "Süre Doldu!"}</Text>
                
                <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Puan</Text>
                        <Text style={styles.statValue}>{score}</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Max Kombo</Text>
                        <Text style={styles.statValue}>🔥 {maxStreak}</Text>
                    </View>
                    <View style={styles.statItemFull}>
                        <Text style={styles.statLabel}>Doğruluk</Text>
                        <Text style={[styles.statValue, {color: accuracy > 80 ? '#4CAF50' : '#FF9800'}]}>
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

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.container}>
                
                {/* GEÇİŞ MODALI (Tampon Bölge) */}
                <Modal visible={showEndModal} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Ionicons 
                                name={endModalType === 'success' ? "checkmark-circle" : "alarm"} 
                                size={80} 
                                color={endModalType === 'success' ? "#4CAF50" : "#F44336"} 
                            />
                            <Text style={styles.modalText}>
                                {endModalType === 'success' ? "Bölüm Bitti!" : "Süre Doldu!"}
                            </Text>
                        </View>
                    </View>
                </Modal>

                {/* HEADER */}
                <View style={styles.header}>
                    {/* Sol: Süre Sayacı */}
                    <View style={[styles.timerBadge, timeLeft < 10 && styles.timerBadgeDanger]}>
                        <Ionicons name="time-outline" size={20} color={timeLeft < 10 ? "#D32F2F" : "#555"} />
                        <Text style={[styles.timerText, timeLeft < 10 && styles.timerTextDanger]}>
                            {formatTime(timeLeft)}
                        </Text>
                    </View>

                    {/* Orta: İlerleme */}
                    <Text style={styles.progressText}>
                        { (allPairs.length * 2) - (currentPairIndex * 2) - currentRoundItems.filter(i => i.isMatched).length } / {allPairs.length * 2}
                    </Text>
                    
                    {/* Sağ: Kombo & Skor */}
                    <View style={styles.scoreWrapper}>
                        <View style={[styles.streakContainer, currentStreak === 0 && styles.streakInactive]}>
                            <Text style={[styles.streakText, currentStreak === 0 && styles.streakTextInactive]}>
                                🔥 {currentStreak}
                            </Text>
                        </View>
                        <View style={styles.scoreContainer}>
                            <Text style={styles.scoreText}>{score}</Text>
                        </View>
                    </View>
                </View>

                {/* ZAMAN ÇUBUĞU (Visual Timer) */}
                <View style={styles.timerBarContainer}>
                    <View style={[
                        styles.timerBarFill, 
                        { width: `${timerProgress * 100}%`, backgroundColor: timerColor }
                    ]} />
                </View>

                {/* GRID AREA */}
                <View style={styles.gridContainer} onLayout={onGridLayout}>
                    {gridHeight > 0 && currentRoundItems.map((item, index) => (
                        <CardComponent 
                            key={item.id} 
                            item={item} 
                            cardHeight={dynamicCardHeight}
                            isSelected={selectedItem?.id === item.id}
                            isWrong={wrongPairIds.includes(item.id)}
                            onPress={handleCardPress}
                        />
                    ))}
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#F5F7FA' },
    container: { flex: 1, paddingTop: 10,paddingBottom:10 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // HEADER
    header: { 
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
        paddingHorizontal: 20, height: 50, marginBottom: 5
    },
    timerBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, elevation: 1 },
    timerBadgeDanger: { backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: '#EF9A9A' },
    timerText: { fontWeight: 'bold', fontSize: 16, marginLeft: 5, color: '#555', fontVariant: ['tabular-nums'] },
    timerTextDanger: { color: '#D32F2F' },
    progressText: { fontSize: 14, fontWeight: 'bold', color: '#90A4AE'},
    scoreWrapper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    streakContainer: { backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#FFE0B2' },
    streakInactive: { backgroundColor: '#F5F5F5', borderColor: '#E0E0E0' },
    streakText: { fontSize: 12, fontWeight: 'bold', color: '#FF9800' },
    streakTextInactive: { color: '#BDBDBD' },
    scoreContainer: { backgroundColor: '#E3F2FD', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
    scoreText: { color: '#2196F3', fontWeight: 'bold', fontSize: 14 },

    // TIMER BAR
    timerBarContainer: { height: 6, backgroundColor: '#E0E0E0', marginBottom: 10,marginHorizontal:16, borderRadius: 3 ,overflow: 'hidden' },
    timerBarFill: { height: '100%', backgroundColor: '#4CAF50', borderRadius: 3 },
    

    // GRID
    gridContainer: {
        flex: 1, 
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: GRID_PADDING,
        justifyContent: 'space-between',
        paddingBottom: 10,
    },
    cardWrapper: {
        width: CARD_WIDTH,
        marginBottom: GAP,
    },
    card: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderWidth: 2,
        borderColor: '#ECEFF1',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 2 },
    },
    cardSelected: {
        backgroundColor: '#E3F2FD',
        borderColor: '#2196F3',
        elevation: 6,
        transform: [{scale: 1.02}]
    },
    cardWrong: {
        backgroundColor: '#FFEBEE',
        borderColor: '#FF5252',
        elevation: 6
    },
    cardPlaceholder: {
        width: CARD_WIDTH,
        marginBottom: GAP,
        opacity: 0 
    },
    cardText: { fontSize: 16, fontWeight: '600', color: '#455A64', textAlign: 'center' },
    cardTextSelected: { fontSize: 17, fontWeight: 'bold', color: '#1565C0', textAlign: 'center' },
    cardTextWrong: { fontSize: 17, fontWeight: 'bold', color: '#D32F2F', textAlign: 'center' },

    // MODAL
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: 'white', padding: 40, borderRadius: 20, alignItems: 'center', elevation: 10 },
    modalText: { marginTop: 20, fontSize: 24, fontWeight: 'bold', color: '#333' },

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