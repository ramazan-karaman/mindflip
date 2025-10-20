import { useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { getCards, updateCardSRS } from '../../components/db'; // ../../components/db olmalı, yolu kontrol et

interface Card {
    id: number;
    front_word: string;
    front_image: string | null;
    back_word: string;
    back_image: string | null;
    interval: number;
    easeFactor: number;
    nextReview: string;
}


const calculateSRS = (card: Card, quality: number) => {
    
    let newInterval: number;
    let newEaseFactor: number = card.easeFactor;

    if (quality >= 3) { 
        if (card.interval < 1) { 
             newInterval = 1;
        } else if (card.interval < 2) {
            newInterval = 6;
        } else {
            newInterval = Math.round(card.interval * card.easeFactor);
        }
        newEaseFactor += (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    } else { 
        newInterval = 0.5; 
        newEaseFactor = Math.max(1.3, card.easeFactor - 0.2);
    }

    if (newEaseFactor < 1.3) newEaseFactor = 1.3;

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

    return {
        interval: newInterval,
        easeFactor: newEaseFactor,
        nextReview: nextReviewDate.toISOString(),
    };
};


export default function ClassicScreen() {
    const { deckId } = useLocalSearchParams();
    const navigation = useNavigation();

    const [practiceQueue, setPracticeQueue] = useState<Card[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const rotate = useSharedValue(0);

    useEffect(() => {
        const loadCardsToPractice = async () => {
            if (!deckId) return;
            try {
                const allCards: Card[] = await getCards(parseInt(deckId as string));
                const now = new Date();
                
                const dueCards = allCards
                    .filter(card => !card.nextReview || new Date(card.nextReview) <= now)
                    .sort(() => Math.random() - 0.5);

                setPracticeQueue(dueCards);
            } catch (error) {
                console.error("Pratik için kartlar yüklenirken hata:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadCardsToPractice();
    }, [deckId]);

    const flipCard = () => {
        if (practiceQueue.length === 0) return;
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
        const currentCard = practiceQueue[currentIndex];
        if (!currentCard) return;

        const { interval, easeFactor, nextReview } = calculateSRS(currentCard, quality);
        await updateCardSRS(currentCard.id, interval, easeFactor, nextReview);

        if (currentIndex < practiceQueue.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setIsFlipped(false);
            rotate.value = 0; 
        } else {
            Alert.alert("Tebrikler!", "Bu pratik seansını tamamladın.", [{ text: "Harika!", onPress: () => navigation.goBack() }]);
        }
    };

    if (isLoading) {
        return <View style={styles.container}><Text style={styles.infoText}>Kartlar Yükleniyor...</Text></View>;
    }

    if (practiceQueue.length === 0) {
        return <View style={styles.container}><Text style={styles.infoText}>Bu destede çalışılacak kart bulunmuyor.</Text></View>;
    }

    const currentCard = practiceQueue[currentIndex];

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={flipCard} activeOpacity={0.9}>
                <Animated.View style={[styles.card, frontAnimatedStyle]}>
                    <Image source={currentCard.front_image ? { uri: currentCard.front_image } : require('../../assets/images/mindfliplogo.png')} style={styles.image} />
                    <Text style={styles.termText}>{currentCard.front_word}</Text>
                </Animated.View>
                <Animated.View style={[styles.card, styles.cardBack, backAnimatedStyle]}>
                    <Image source={currentCard.back_image ? { uri: currentCard.back_image } : require('../../assets/images/mindfliplogo.png')} style={styles.image} />
                    <Text style={styles.termText}>{currentCard.back_word}</Text>
                </Animated.View>
            </TouchableOpacity>

            <View style={styles.buttonContainer}>
                <TouchableOpacity style={[styles.button, styles.hardButton, !isFlipped && styles.disabledButton]} disabled={!isFlipped} onPress={() => handleReview(1)}>
                    <Text style={styles.buttonText}>Zor</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.normalButton, !isFlipped && styles.disabledButton]} disabled={!isFlipped} onPress={() => handleReview(3)}>
                    <Text style={styles.buttonText}>Normal</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.easyButton, !isFlipped && styles.disabledButton]} disabled={!isFlipped} onPress={() => handleReview(5)}>
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
        padding: 20 
    },
    infoText: { fontSize: 18, color: '#555' },
    card: { width: 320,
         height: 400, 
         backgroundColor: 'white', 
         borderRadius: 20, 
         justifyContent: 'center', 
         alignItems: 'center', 
         padding: 20, 
         elevation: 10, 
         backfaceVisibility: 'hidden' 
        },
    cardBack: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    image: { 
        width: 280, 
        height: 200, 
        borderRadius: 15, 
        marginBottom: 20, 
        backgroundColor: '#eee' 
    },
    termText: { fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
    buttonContainer: { 
        flexDirection: 'row', 
        justifyContent: 'space-around', 
        width: '100%', 
        marginTop: 40 
    },
    button: { 
        paddingVertical: 15, 
        paddingHorizontal: 30, 
        borderRadius: 10, 
        elevation: 3 
    },
    buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    hardButton: { backgroundColor: '#ff6b6b' },
    normalButton: { backgroundColor: '#4dabf7' },
    easyButton: { backgroundColor: '#69db7c' },
    disabledButton: { opacity: 0.5 },
});