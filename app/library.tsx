import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as CardRepository from '../lib/repositories/cardRepository';
import * as DeckRepository from '../lib/repositories/deckRepository';
import * as LibraryRepository from '../lib/repositories/libraryRepository';

export default function LibraryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  // State'ler
  const [searchText, setSearchText] = useState('');
  const [queryTerm, setQueryTerm] = useState('');
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());

  // React Query
  const { 
    data: libraryDecks, 
    isLoading, 
    isError, 
    refetch 
  } = useQuery({
    queryKey: ['libraryDecks', queryTerm], 
    queryFn: () => LibraryRepository.fetchLibraryDecks(queryTerm),
  });

  // Hata Yönetimi
  useEffect(() => {
    if (isError) {
      Alert.alert(
        "Bağlantı Hatası ⚠️",
        "İnternet bağlantınızı kontrol ediniz.",
        [{ text: "Tamam" }]
      );
    }
  }, [isError]);

  const handleSearch = () => {
    Keyboard.dismiss();
    setQueryTerm(searchText);
  };

  const handleDownload = async (item: LibraryRepository.RemoteDeck) => {
    setDownloadingIds((prev) => new Set(prev).add(item.id));
    try {
      const remoteCards = await LibraryRepository.fetchDeckCards(item.id);
      const newDeck = await DeckRepository.createDeck(item.title, item.description || '', 10);
      
      if (newDeck) {
        const cardsToSave = remoteCards.map(c => ({
            front: c.front_text,
            back: c.back_text,
            front_image: c.front_image || undefined,
            back_image: c.back_image || undefined
        }));
        await CardRepository.createCardsBatch(newDeck.id, cardsToSave);
        await queryClient.invalidateQueries({ queryKey: ['decks'] });
        Alert.alert("Başarılı", `"${item.title}" indirildi.`);
      }
    } catch (err) {
      Alert.alert("Hata", "İndirme başarısız.");
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  // Kart Tasarımı (Render Item)
  const renderItem = ({ item }: { item: LibraryRepository.RemoteDeck }) => {
    const isDownloading = downloadingIds.has(item.id);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
            <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.category || 'Genel'}</Text>
            </View>
            <View style={[styles.levelBadge]}>
                <Text style={styles.levelText}>{item.difficulty || 'Kolay'}</Text>
            </View>
        </View>

        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.description}>{item.description}</Text>
        
        <View style={styles.footer}>
            <View style={styles.stats}>
                <Ionicons name="albums-outline" size={16} color="#666" />
                <Text style={styles.statsText}>{item.card_count} Kart</Text>
            </View>

            <TouchableOpacity 
                style={[styles.downloadBtn, isDownloading && styles.downloadBtnDisabled]} 
                onPress={() => handleDownload(item)}
                disabled={isDownloading}
            >
                {isDownloading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                ) : (
                    <>
                        <Text style={styles.downloadBtnText}>İndir</Text>
                        <Ionicons name="cloud-download-outline" size={18} color="#FFF" style={{marginLeft: 5}} />
                    </>
                )}
            </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      
      {/* --- YENİ MODERN HEADER --- */}
      {/* Tek satırda: Geri Butonu + Arama Çubuğu */}
      <View style={styles.headerContainer}>
        
        {/* Geri Dön Butonu */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={28} color="#444" />
        </TouchableOpacity>

        {/* Arama Çubuğu (Esnek Genişlik) */}
        <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#757575" style={{ marginLeft: 8 }} />
            
            <TextInput
                style={styles.searchInput}
                placeholder="Mağazada deste ara..."
                placeholderTextColor="#9E9E9E"
                value={searchText}
                onChangeText={setSearchText}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
            />

            {/* Temizle Butonu (Varsa) */}
            {searchText.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchText(''); setQueryTerm(''); }}>
                    <Ionicons name="close-circle" size={18} color="#BDBDBD" style={{ marginRight: 8 }} />
                </TouchableOpacity>
            )}

            {/* Ara Butonu (Mavi) */}
            <TouchableOpacity onPress={handleSearch} style={styles.searchActionBtn}>
                <Text style={styles.searchActionText}>Ara</Text>
            </TouchableOpacity>
        </View>

      </View>

      {/* İÇERİK ALANI */}
      {isLoading ? (
          <View style={styles.center}>
              <ActivityIndicator size="large" color="#2196F3" />
          </View>
      ) : isError ? (
        <View style={styles.center}>
             <Ionicons name="cloud-offline-outline" size={60} color="#CFD8DC" />
             <Text style={{marginTop: 15, color: '#90A4AE', fontSize: 16}}>Bağlantı Yok</Text>
             <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
                 <Text style={{color: '#2196F3', fontWeight: 'bold'}}>Tekrar Dene</Text>
             </TouchableOpacity>
        </View>
      ) : (
        <FlatList
            data={libraryDecks}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 16 }}
            ListEmptyComponent={
                <View style={styles.emptyContainer}>
                    <Ionicons name="library-outline" size={50} color="#E0E0E0" />
                    <Text style={{ textAlign: 'center', marginTop: 10, color: '#9E9E9E' }}>
                        {queryTerm ? `"${queryTerm}" bulunamadı.` : 'Kütüphane şimdilik boş.'}
                    </Text>
                </View>
            }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' }, // Biraz daha açık gri
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // --- MODERN HEADER STİLLERİ ---
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    // Hafif gölge (Android + iOS)
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    zIndex: 10,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  searchBar: {
    flex: 1, // Kalan tüm alanı kapla
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5', // Hafif gri zemin
    borderRadius: 12, // Yumuşak köşeler
    height: 44,
    paddingHorizontal: 4,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    marginLeft: 8,
    fontSize: 15,
    color: '#333',
  },
  searchActionBtn: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    marginRight: 4,
  },
  searchActionText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },

  // --- KART STİLLERİ ---
  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  categoryBadge: { backgroundColor: '#E3F2FD', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  categoryText: { color: '#1976D2', fontSize: 12, fontWeight: '700' },
  levelBadge: { backgroundColor: '#F1F8E9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  levelText: { color: '#388E3C', fontSize: 12, fontWeight: '700' },
  title: { fontSize: 17, fontWeight: 'bold', color: '#212121', marginBottom: 6 },
  description: { fontSize: 14, color: '#616161', marginBottom: 16, lineHeight: 20 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F5F5F5', paddingTop: 12 },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statsText: { fontSize: 13, color: '#757575', fontWeight: '500' },
  downloadBtn: { backgroundColor: '#2196F3', flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  downloadBtnDisabled: { backgroundColor: '#CFD8DC' },
  downloadBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  retryBtn: { marginTop: 10, padding: 10 },
});