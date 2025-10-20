import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { deleteCard, getCardsByDeckId } from '../lib/services/cardService';
import { getDeckById, updateDeck } from '../lib/services/deckService';
import { Card, Deck } from '../types/entities';

export default function EditDeckScreen() {
    const { deckId } = useLocalSearchParams();
    const navigation = useNavigation();

    const [deck, setDeck] = useState<Deck | null>(null);
    const [cards, setCards] = useState<Card[]>([]);
    const [deckName, setDeckName] = useState('');
    const [deckDescription, setDeckDescription] = useState('');

    const loadData = useCallback(async () => {
        if (!deckId) return;
        try {
            const id= parseInt(deckId as string);
            const currentDeck = await getDeckById(id);
            if (currentDeck) {
                setDeck(currentDeck);
                setDeckName(currentDeck.name);
                setDeckDescription(currentDeck.description);
            }
            const fetchedCards = await getCardsByDeckId(parseInt(deckId as string));
            setCards(fetchedCards);
        } catch (error) {
            console.error("Veri yüklenirken hata:", error);
        }
    }, [deckId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleUpdateDeck = async () => {
        if (!deck) return;
        try {
            await updateDeck(deck.id, deckName, deckDescription, deck.goal); // goal'u korumak için deck.goal kullanıldı
            Alert.alert("Başarılı", "Deste bilgileri güncellendi.");
            navigation.goBack(); 
        } catch (error) {
            console.error("Deste güncellenirken hata:", error);
            Alert.alert("Hata", "Deste güncellenemedi.");
        }
    };

    const handleDeleteCard = (cardId: number) => {
        Alert.alert(
            "Kartı Sil",
            "Bu kartı silmek istediğinizden emin misiniz?",
            [
                { text: "İptal", style: "cancel" },
                {
                    text: "Sil",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteCard(cardId);
                            loadData();
                        } catch (error) {
                            console.error("Kart silinirken hata:", error);
                        }
                    },
                },
            ]
        );
    };

    const renderCardItem = ({ item }: { item: Card }) => (
        <View style={styles.cardItem}>
            <View style={styles.cardTextContainer}>
                <Text style={styles.cardTextFront}>{item.front_word}</Text>
                <Text style={styles.cardTextBack}>{item.back_word}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDeleteCard(item.id)}>
                <Ionicons name="trash-bin-outline" size={24} color="#ff4d4d" />
            </TouchableOpacity>
        </View>
    );

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.headerTitle}>Deste Düzenle</Text>
            
            <View style={styles.deckInfoContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Deste Adı"
                    value={deckName}
                    onChangeText={setDeckName}
                />
                <TextInput
                    style={[styles.input, styles.descriptionInput]}
                    placeholder="Açıklama"
                    value={deckDescription}
                    onChangeText={setDeckDescription}
                    multiline
                />
                <TouchableOpacity style={styles.saveButton} onPress={handleUpdateDeck}>
                    <Text style={styles.saveButtonText}>Deste Bilgilerini Kaydet</Text>
                </TouchableOpacity>
            </View>

            <Text style={styles.cardsHeader}>Kartlar ({cards.length})</Text>
            
            <FlatList
                data={cards}
                renderItem={renderCardItem}
                keyExtractor={(item) => item.id.toString()}
                scrollEnabled={false} // ScrollView içinde olduğu için
            />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f7f7f7',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        color: '#333',
    },
    deckInfoContainer: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 15,
        marginBottom: 30,
        elevation: 2,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 15,
    },
    descriptionInput: {
        height: 80,
        textAlignVertical: 'top',
    },
    saveButton: {
        backgroundColor: '#2196F3',
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    cardsHeader: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#444',
    },
    cardItem: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 15,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        elevation: 1,
    },
    cardTextContainer: {
        flex: 1,
    },
    cardTextFront: {
        fontSize: 16,
        fontWeight: '500',
    },
    cardTextBack: {
        fontSize: 14,
        color: '#666',
    },
});