import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import InputWithLimit from '../components/InputWithLimit';
import * as CardRepository from '../lib/repositories/cardRepository';
import * as DeckRepository from '../lib/repositories/deckRepository';
import { Card } from '../lib/types';

const LIMITS = {
  DECK_NAME: 20,
  DECK_DESC: 50,
};

export default function EditDeckScreen() {
  const { deckId } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const id = deckId && typeof deckId === 'string' ? parseInt(deckId, 10) : NaN;

  const [deckName, setDeckName] = useState('');
  const [deckDescription, setDeckDescription] = useState('');

  // Deste Bilgilerini Getir
  const { data: deck, isLoading: isLoadingDeck } = useQuery({
    queryKey: ['deck', id],
    queryFn: () => DeckRepository.getDeckById(id),
    enabled: !isNaN(id),
  });

  // Kartları Getir
  const { data: cards, isLoading: isLoadingCards } = useQuery({
    queryKey: ['cards', id],
    queryFn: () => CardRepository.getCardByIdDeck(id),
    enabled: !isNaN(id),
  });

  // Veri gelince state'i güncelle
  useEffect(() => {
    if (deck) {
      setDeckName(deck.name);
      setDeckDescription(deck.description ?? '');
    }
  }, [deck]);

  // Deste Güncelleme Mutation
  const { mutate: updateDeckMutate, isPending: isUpdatingDeck } = useMutation({
    mutationFn: (variables: { name: string; description: string }) => {
      if (!deck) throw new Error('Deste yüklenemedi.');
      return DeckRepository.updateDeck(
        deck.id,
        variables.name,
        variables.description,
        deck.goal
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deck', id] });
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      
      Alert.alert('Başarılı', 'Deste bilgileri güncellendi.');
      router.back();
    },
    onError: (error) => {
      console.error('Deste güncellenirken hata:', error);
      Alert.alert('Hata', 'Deste güncellenemedi.');
    },
  });

  // Kart Silme Mutation (Hard Delete)
  const { mutate: deleteCardMutate } = useMutation({
    mutationFn: (cardId: number) => CardRepository.deleteCard(cardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards', id] });
      queryClient.invalidateQueries({ queryKey: ['decks'] }); // Kart sayısı değiştiği için
    },
    onError: (error) => {
      console.error('Kart silinirken hata:', error);
      Alert.alert('Hata', 'Kart silinemedi.');
    },
  });

  const handleUpdateDeck = () => {
    if (deckName.trim() === '') {
      Alert.alert('Hata', 'Deste ismi boş olamaz.');
      return;
    }
    updateDeckMutate({ name: deckName, description: deckDescription });
  };

  const handleDeleteCard = (cardId: number) => {
    Alert.alert(
      'Kartı Sil',
      'Bu kartı kalıcı olarak silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => deleteCardMutate(cardId),
        },
      ]
    );
  };

  // --- RENDER BİLEŞENLERİ ---

  const renderCardItem = ({ item }: { item: Card }) => (
    <View style={styles.cardItem}>
      <View style={styles.cardTextContainer}>
        <Text style={styles.cardTextFront} numberOfLines={1}>{item.front_word}</Text>
        <Text style={styles.cardTextBack} numberOfLines={1}>{item.back_word}</Text>
      </View>
      
      {/* Görsel varsa ikon göster */}
      {(item.front_image || item.back_image) && (
        <Ionicons
          name="image"
          size={20}
          color="#ccc"
          style={{ marginRight: 15 }}
        />
      )}
      
      <TouchableOpacity onPress={() => handleDeleteCard(item.id)} style={styles.deleteBtn}>
        <Ionicons name="trash-bin-outline" size={24} color="#ff4d4d" />
      </TouchableOpacity>
    </View>
  );

  // FlatList Header (Form Alanları Buraya Taşındı)
  const headerContent =(
    <View style={styles.headerContainer}>
      <View style={styles.deckInfoContainer}>
        <Text style={styles.sectionTitle}>Deste Bilgileri</Text>
        <InputWithLimit
          limit={LIMITS.DECK_NAME}
          placeholder="Deste Adı"
          value={deckName}
          onChangeText={setDeckName}
          style={styles.input}
        />
        <InputWithLimit
          limit={LIMITS.DECK_DESC}
          placeholder="Açıklama (İsteğe bağlı)"
          value={deckDescription}
          onChangeText={setDeckDescription}
          multiline
          style={styles.descriptionInput} // Özel stil (height vb.)
        />
        <TouchableOpacity
          style={[styles.saveButton, isUpdatingDeck && styles.saveButtonDisabled]}
          onPress={handleUpdateDeck}
          disabled={isUpdatingDeck}
        >
          {isUpdatingDeck ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveButtonText}>Kaydet</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.cardsHeader}>
        Kartlar ({cards ? cards.length : 0})
      </Text>
    </View>
  );

  if (isLoadingDeck || isLoadingCards) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={cards ?? []}
        renderItem={renderCardItem}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={headerContent}
        contentContainerStyle={{ paddingBottom: 40, padding:4 }}
        ListEmptyComponent={() => (
          <View style={styles.emptyCardsContainer}>
            <Text style={styles.emptyCardsText}>
              Bu destede henüz hiç kart yok.
            </Text>
            <Text style={styles.emptyCardsSubText}>
              Ana sayfadan '+ Kart Ekle' butonunu kullanabilirsin.
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
    paddingHorizontal: 16, // Kenar boşlukları ana container'a
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
  },
  headerContainer: {
    paddingTop: 20,
  },
  deckInfoContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
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
    height: 48,
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#90CAF9',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardsHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  cardTextFront: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  cardTextBack: {
    fontSize: 14,
    color: '#666',
  },
  deleteBtn: {
    padding: 5,
  },
  emptyCardsContainer: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    marginTop: 10,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  emptyCardsText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#888',
  },
  emptyCardsSubText: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    marginTop: 6,
  },
});