import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Menu, MenuOption, MenuOptions, MenuTrigger } from 'react-native-popup-menu';

// --- MODERN KÜTÜPHANELER ---
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system'; // Modern File API
import { useShareIntent } from 'expo-share-intent'; // YENİ: Paylaşım Yakalayıcı
import * as Sharing from 'expo-sharing';

// --- BİLEŞENLER VE REPOLAR ---
import ExpandableFab from '../../components/ExpandableFab';
import * as CardRepository from '../../lib/repositories/cardRepository';
import * as DeckRepository from '../../lib/repositories/deckRepository';
import { DeckWithCardCount } from '../../lib/types';
import { RootDrawerParamList } from './_layout';

const { width } = Dimensions.get('window');

export default function IndexScreen() {
  const navigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();
  const queryClient = useQueryClient();

  // --- SHARE INTENT HOOK (YENİ ÖZELLİK) ---
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

  const [search, setSearch] = useState('');
  
  // Modallar
  const [showSheet, setShowSheet] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isGoalModalVisible, setIsGoalModalVisible] = useState(false);
  
  const [selectedDeck, setSelectedDeck] = useState<DeckWithCardCount | null>(null);
  const [currentGoal, setCurrentGoal] = useState(1);
  const [maxGoal, setMaxGoal] = useState(1);

  const [newDeck, setNewDeck] = useState({ name: '', description: '' });

  // CSV Import State
  const [importDeckName, setImportDeckName] = useState('');
  const [parsedCards, setParsedCards] = useState<{front: string, back: string}[]>([]);
  const [previewCards, setPreviewCards] = useState<{front: string, back: string}[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  const {
    data: decks,
    isLoading: isLoadingDecks,
    isError: isErrorDecks,
  } = useQuery({
    queryKey: ['decks'],
    queryFn: DeckRepository.getDecks,
  });

  // --- 1. PAYLAŞIM YAKALAMA MANTIĞI ---
  useEffect(() => {
    // Eğer bir paylaşım varsa ve bu bir dosya ise
    if (hasShareIntent && (shareIntent.type === 'file' || shareIntent.type === 'text')) {
      console.log("Paylaşım Tespit Edildi:", shareIntent);

      // Dosya var mı?
      if (shareIntent.files && shareIntent.files.length > 0) {
        const sharedFile = shareIntent.files[0];
        // sharedFile.path -> Dosyanın cihazdaki yolu (file:// veya content://)
        handleExternalFile(sharedFile.path, sharedFile.fileName || "Paylaşılan Deste");
      } 
      // Bazen text olarak gelir (Nadir CSV durumları)
      else if ((shareIntent as any).value) {
         processCsvContent((shareIntent as any).value, "Paylaşılan Metin");
      }

      else if ((shareIntent as any).text) {
         processCsvContent((shareIntent as any).text, "Paylaşılan Metin");
      }

      // İşlem bitince intent'i temizle ki döngüye girmesin
      resetShareIntent();
    }
  }, [hasShareIntent, shareIntent, resetShareIntent]);

  // --- 2. DOSYA OKUMA YARDIMCISI (MODERN API) ---
  const handleExternalFile = async (uri: string, fileName: string) => {
    try {
      console.log("Dosya okunuyor:", uri);
      
      // Dosya adını temizle (.csv uzantısını at)
      const cleanName = fileName.replace(/\.(csv|txt)$/i, '');

      // Modern API ile oku
      const file = new File(uri);
      const content = await file.text(); // İçeriği string olarak al

      if (content) {
        processCsvContent(content, cleanName);
      }
    } catch (error) {
      console.error("Dosya okuma hatası:", error);
      Alert.alert("Hata", "Paylaşılan dosya okunamadı.");
    }
  };

  // --- 3. CSV İŞLEME MANTIĞI (ORTAK) ---
  const processCsvContent = (content: string, defaultName: string) => {
    const rows = content.split(/\r\n|\n|\r/);
    const cards: {front: string, back: string}[] = [];

    rows.forEach((row, index) => {
      if (!row.trim()) return;
      
      // Header Kontrolü
      if (index === 0) {
        const lowerRow = row.toLowerCase();
        if (lowerRow.includes('front') && lowerRow.includes('back')) return;
      }

      const separator = row.includes(';') ? ';' : ',';
      const parts = row.split(separator);
      
      if (parts.length >= 2) {
        const front = parts[0].trim().replace(/^"|"$/g, '').replace(/""/g, '"');
        const back = parts.slice(1).join(separator).trim().replace(/^"|"$/g, '').replace(/""/g, '"');
        
        if (front && back) cards.push({ front, back });
      }
    });

    if (cards.length === 0) {
      Alert.alert("Hata", "Dosyada uygun formatta kart bulunamadı.");
      return;
    }

    setImportDeckName(defaultName);
    setParsedCards(cards);
    setPreviewCards(cards.slice(0, 3));
    setShowImportModal(true);
  };

  // --- 4. IMPORT: DOSYA SEÇME (MANUEL) ---
  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'text/plain'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const fileUri = result.assets[0].uri;
      const fileName = result.assets[0].name; // handleExternalFile içinde temizlenecek

      // Ortak fonksiyonu kullan
      handleExternalFile(fileUri, fileName);

    } catch (err) {
      console.error("Doküman seçme hatası:", err);
    }
  };

  // --- 5. IMPORT: ONAYLAMA ---
  const handleConfirmImport = async () => {
    if (!importDeckName.trim()) {
      Alert.alert("Hata", "Deste adı boş olamaz.");
      return;
    }
    setIsImporting(true);
    try {
      const createdDeck = await DeckRepository.createDeck(importDeckName, "CSV'den aktarıldı", 10);
      if (createdDeck) {
        await CardRepository.createCardsBatch(createdDeck.id, parsedCards);
        queryClient.invalidateQueries({ queryKey: ['decks'] });
        setShowImportModal(false);
        setImportDeckName('');
        setParsedCards([]);
        Alert.alert("Başarılı", `"${importDeckName}" oluşturuldu.`);
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Hata", "İçe aktarma başarısız.");
    } finally {
      setIsImporting(false);
    }
  };

  // --- 6. EXPORT: DESTE PAYLAŞMA ---
  const handleExportDeck = async (deck: DeckWithCardCount) => {
    try {
      const cards = await CardRepository.getCardByIdDeck(deck.id);

      if (cards.length === 0) {
        Alert.alert("Uyarı", "Bu destede paylaşılacak kart yok.");
        return;
      }

      const csvHeader = "Front,Back\n";
      const csvRows = cards.map(c => {
        const front = `"${c.front_word.replace(/"/g, '""')}"`;
        const back = `"${c.back_word.replace(/"/g, '""')}"`;
        return `${front},${back}`;
      }).join('\n');

      const csvContent = csvHeader + csvRows;

      // Modern Yöntem: Cache'e Yaz
      const safeName = deck.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const csvFile = new File(Paths.cache, `${safeName}.csv`);
      await csvFile.write(csvContent);

      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert("Hata", "Paylaşım desteklenmiyor.");
        return;
      }

      await Sharing.shareAsync(csvFile.uri, {
        mimeType: 'text/csv',
        dialogTitle: `${deck.name} destesini paylaş`,
        UTI: 'public.comma-separated-values-text'
      });

    } catch (error) {
      console.error("Export hatası:", error);
      Alert.alert("Hata", "Deste dışa aktarılamadı.");
    }
  };

  // --- STANDART MUTATIONLAR ---
  const { mutate: addDeckMutate, isPending: isAddingDeck } = useMutation({
    mutationFn: (deckData: { name: string; description: string }) => {
      return DeckRepository.createDeck(deckData.name, deckData.description, 0);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      setNewDeck({ name: '', description: '' });
      setShowSheet(false);
    },
    onError: () => Alert.alert('Hata', 'Deste eklenemedi.'),
  });

  const { mutate: deleteDeckMutate } = useMutation({
    mutationFn: (id: number) => DeckRepository.deleteDeck(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['decks'] }),
    onError: () => Alert.alert('Hata', 'Deste silinemedi.'),
  });

  const { mutate: updateGoalMutate, isPending: isUpdatingGoal } = useMutation({
    mutationFn: (variables: { deck: DeckWithCardCount; goal: number }) => {
      return DeckRepository.updateDeck(variables.deck.id, variables.deck.name, variables.deck.description, variables.goal);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      setIsGoalModalVisible(false);
      setSelectedDeck(null);
      Alert.alert('Başarılı', 'Hedef güncellendi.');
    },
  });

  const handleDeleteDeck = (id: number, name: string) => {
    Alert.alert('Deste Silme', `${name} destesi silinsin mi?`, [
      { text: 'İptal', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: () => deleteDeckMutate(id) },
    ]);
  };

  const handleOpenGoalSheet = (deck: DeckWithCardCount) => {
    if (deck.cardCount < 5) {
      Alert.alert('Yetersiz kart', 'En az 5 kart gerekli.');
      return;
    }
    setSelectedDeck(deck);
    setMaxGoal(deck.cardCount);
    const currentGoalValue = deck.goal ?? 0;
    setCurrentGoal(currentGoalValue > 0 && currentGoalValue <= deck.cardCount ? currentGoalValue : 1);
    setIsGoalModalVisible(true);
  };

  const handleSaveGoal = () => {
    if (!selectedDeck) return;
    updateGoalMutate({ deck: selectedDeck, goal: Math.round(currentGoal) });
  };

  const filteredDecks = decks?.filter((d) => d.name.toLowerCase().includes(search.toLowerCase())) ?? [];

  const renderDeck = ({ item }: { item: DeckWithCardCount }) => (
    <View style={styles.deckCard}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={styles.deckTitle}>{item.name} {(item.goal ?? 0) > 0 && `(Hedef: ${item.goal})`}</Text>
        
        <Menu>
          <MenuTrigger>
             <View style={{padding: 5}}>
                <Ionicons name="ellipsis-vertical" size={20} color="#333" />
             </View>
          </MenuTrigger>
          <MenuOptions customStyles={{ optionsContainer: { borderRadius: 10, padding: 5, width: 160 } }}>
            <MenuOption onSelect={() => router.push(`/editDeck?deckId=${item.id}`)} style={styles.menuItem}>
                <Ionicons name="create-outline" size={18} color="#333" />
                <Text style={styles.menuText}>Düzenle</Text>
            </MenuOption>
            <MenuOption onSelect={() => handleOpenGoalSheet(item)} style={styles.menuItem}>
                <Ionicons name="flag-outline" size={18} color="#333" />
                <Text style={styles.menuText}>Hedef Belirle</Text>
            </MenuOption>
            <MenuOption onSelect={() => handleExportDeck(item)} style={styles.menuItem}>
                <Ionicons name="share-social-outline" size={18} color="#2196F3" />
                <Text style={[styles.menuText, {color: '#2196F3'}]}>Paylaş</Text>
            </MenuOption>
            <View style={{height:1, backgroundColor:'#eee', marginVertical:4}} />
            <MenuOption onSelect={() => handleDeleteDeck(item.id, item.name)} style={styles.menuItem}>
                <Ionicons name="trash-outline" size={18} color="red" />
                <Text style={[styles.menuText, {color:'red'}]}>Sil</Text>
            </MenuOption>
          </MenuOptions>
        </Menu>
      </View>
      <Text style={styles.deckDesc}>{item.description}</Text>
      <View style={styles.deckStats}>
        <Ionicons name="albums-outline" size={16} color="#666" />
        <Text style={styles.deckStatsText}>{item.cardCount} Kart</Text>
      </View>
      <View style={styles.deckButtons}>
        <TouchableOpacity style={styles.practiceBtn} onPress={() => router.push(`/practice?deckId=${item.id}`)}>
          <Text style={styles.btnText}>Pratikler</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addCardBtn} onPress={() => router.push(`/addcard?deckId=${item.id}`)}>
          <Text style={styles.btnText}>+ Kart Ekle</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={35} color="#333" />
        </TouchableOpacity>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput placeholder="Destelerinde Ara..." value={search} onChangeText={setSearch} style={styles.searchInput} />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={20} color="#ccc" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Modal visible={showImportModal} animationType="slide" transparent onRequestClose={() => setShowImportModal(false)}>
        <View style={styles.sheetOverlay}>
          <View style={styles.sheetContent}>
            <Text style={styles.modalTitle}>İçe Aktarma Önizlemesi</Text>
            <View style={styles.statsRow}>
                <Ionicons name="documents-outline" size={20} color="#2196F3" />
                <Text style={styles.statsText}>{parsedCards.length} Kart Bulundu</Text>
            </View>
            <Text style={styles.label}>Deste Adı:</Text>
            <TextInput value={importDeckName} onChangeText={setImportDeckName} style={styles.input} />
            <Text style={styles.label}>Örnek (İlk 3):</Text>
            <View style={styles.previewContainer}>
                {previewCards.map((c, i) => (
                    <View key={i} style={styles.previewRow}>
                        <Text style={styles.previewFront} numberOfLines={1}>{c.front}</Text>
                        <Ionicons name="arrow-forward" size={14} color="#999" />
                        <Text style={styles.previewBack} numberOfLines={1}>{c.back}</Text>
                    </View>
                ))}
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={handleConfirmImport} disabled={isImporting}>
                {isImporting ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Onayla ve Oluştur</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowImportModal(false)}>
                <Text style={styles.cancelText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={isGoalModalVisible} animationType="slide" transparent onRequestClose={() => setIsGoalModalVisible(false)}>
        <View style={styles.sheetOverlay}> 
            <View style={styles.sheetContent}>
                <Text style={styles.modalTitle}>Hedef Belirle</Text>
                <Text style={{ textAlign:'center', marginVertical: 20, fontSize: 18, fontWeight: 'bold' }}>
                    Hedef: {Math.round(currentGoal)} / {maxGoal}
                </Text>
                <Slider style={{ width: '100%', height: 40 }} minimumValue={1} maximumValue={maxGoal} step={1} value={currentGoal} onValueChange={setCurrentGoal} minimumTrackTintColor="#2196F3" maximumTrackTintColor="#000000" />
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveGoal}>
                    <Text style={styles.btnText}>Kaydet</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsGoalModalVisible(false)}>
                    <Text style={styles.cancelText}>İptal</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

      <Modal visible={showSheet} animationType="slide" transparent onRequestClose={() => setShowSheet(false)}>
        <View style={styles.sheetOverlay}>
            <View style={styles.sheetContent}>
                <Text style={styles.modalTitle}>Yeni Deste Oluştur</Text>
                <TextInput placeholder="İsim" value={newDeck.name} onChangeText={(t) => setNewDeck({ ...newDeck, name: t })} style={styles.input} />
                <TextInput placeholder="Açıklama" value={newDeck.description} onChangeText={(t) => setNewDeck({ ...newDeck, description: t })} style={styles.input} />
                <TouchableOpacity style={styles.saveBtn} onPress={() => { if(newDeck.name) addDeckMutate(newDeck); }} disabled={isAddingDeck}>
                    {isAddingDeck ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Oluştur</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowSheet(false)}>
                    <Text style={styles.cancelText}>İptal</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

      <FlatList
        data={filteredDecks}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderDeck}
        contentContainerStyle={{ paddingBottom: 100, padding: 4 }}
        ListEmptyComponent={() =>
          isLoadingDecks ? <ActivityIndicator size="large" color="#ccc" style={{marginTop: 50}} /> :
          <View style={styles.emptyContainer}>
            <Ionicons name="file-tray-stacked-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Henüz hiç desten yok.</Text>
          </View>
        }
      />

      <ExpandableFab 
        onCreateDeck={() => setShowSheet(true)}
        onImportCsv={pickDocument}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7', padding: 16 },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10, marginTop: 30 },
  searchContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', borderRadius: 12, paddingHorizontal: 10 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 44, fontSize: 16 },
  deckCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
  deckTitle: { fontSize: 18, fontWeight: 'bold' },
  deckDesc: { fontSize: 14, color: '#666', marginVertical: 6 },
  deckStats: { flexDirection: 'row', alignItems: 'center', marginTop: 10, opacity: 0.8 },
  deckStatsText: { marginLeft: 6, fontSize: 12, color: '#333', fontWeight: '600' },
  deckButtons: { flexDirection: 'row', gap: 20, marginTop: 15 },
  practiceBtn: { backgroundColor: '#2196F3', padding: 10, borderRadius: 8, flex: 1, alignItems: 'center' },
  addCardBtn: { backgroundColor: '#4CAF50', padding: 10, borderRadius: 8, flex: 1, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 5 },
  menuText: { fontSize: 16, marginLeft: 10, color: '#333' },

  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheetContent: { backgroundColor: '#fff', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center', color: '#333' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 5, color: '#666', marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 16 },
  saveBtn: { backgroundColor: '#2196F3', padding: 12, borderRadius: 10, alignItems: 'center', height: 48, justifyContent: 'center', marginTop: 20 },
  saveBtnDisabled: { backgroundColor: '#90CAF9' },
  cancelText: { textAlign: 'center', marginTop: 15, color: 'red', fontSize: 16 },

  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#E3F2FD', padding: 10, borderRadius: 8, alignSelf: 'flex-start' },
  statsText: { color: '#1565C0', fontWeight: 'bold' },
  previewContainer: { backgroundColor: '#f9f9f9', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#eee' },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  previewFront: { flex: 1, fontWeight: '600', color: '#333' },
  previewBack: { flex: 1, textAlign: 'right', color: '#555' },

  emptyContainer: { marginTop: Dimensions.get('window').height * 0.2, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 18, fontWeight: 'bold', color: '#aaa', marginTop: 16 },
  emptySubText: { fontSize: 14, color: '#ccc', marginTop: 8, textAlign: 'center', paddingHorizontal: 40 },
});