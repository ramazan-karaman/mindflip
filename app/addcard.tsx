import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
// YENİ MİMARİ: File ve Paths sınıflarını import ediyoruz
import { File, Paths } from 'expo-file-system';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as CardRepository from '../lib/repositories/cardRepository';

export default function AddCardScreen() {
  const { deckId } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [frontWord, setFrontWord] = useState('');
  const [backWord, setBackWord] = useState('');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  
  const backWordInputRef = useRef<TextInput>(null);

  const pickImage = async (setImage: (uri: string | null) => void) => {
    Alert.alert(
      'Resim Seç',
      'Nereden bir resim eklemek istersin?',
      [
        {
          text: 'Galeriden Seç',
          onPress: async () => {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (permissionResult.granted === false) {
              Alert.alert('İzin Gerekli', 'Galeri izni vermeniz gerekiyor.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images, // GÜNCELLENDİ: MediaTypeOptions yerine MediaType
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            });
            if (!result.canceled) {
              setImage(result.assets[0].uri);
            }
          },
        },
        {
          text: 'Fotoğraf Çek',
          onPress: async () => {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (permissionResult.granted === false) {
              Alert.alert('İzin Gerekli', 'Kamera izni vermeniz gerekiyor.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
            });
            if (!result.canceled) {
              setImage(result.assets[0].uri);
            }
          },
        },
        { text: 'İptal', style: 'cancel' },
      ]
    );
  };

  // --- GERÇEK ÇÖZÜM: Yeni File System API ---
  const saveImagePermanently = async (uri: string | null): Promise<string | null> => {
    if (!uri) return null;

    try {
      // 1. Dosya adını al
      const filename = uri.split('/').pop();
      if (!filename) return null;

      // 2. Kaynak Dosya Nesnesini oluştur
      const sourceFile = new File(uri);

      // 3. Hedef Klasör Nesnesi (Paths.document bir Directory nesnesidir)
      const destinationDir = Paths.document;

      // 4. Kopyalama İşlemi
      // HATA BURADAYDI: Eskiden buraya string veriyorduk. 
      // Şimdi 'destinationDir' nesnesini veriyoruz. 
      // Bu işlem dosyayı o klasörün içine, aynı isimle kopyalar.
      await sourceFile.copy(destinationDir);

      console.log('Resim yeni sisteme göre taşındı.');

      // 5. Veritabanı için string yolunu oluşturup döndür
      // Paths.document.uri klasörün yolunu verir, dosya adını sonuna ekleriz.
      return `${destinationDir.uri}/${filename}`;

    } catch (error) {
      console.error('Resim işlenirken hata:', error);
      // Hata durumunda (nadir) orijinal yolu döndürerek akışı bozma
      return uri; 
    }
  };

  const { mutate: addCard, isPending } = useMutation({
    mutationFn: async (newCard: {
      deck_id: number;
      front_word: string;
      front_image: string | null;
      back_word: string;
      back_image: string | null;
    }) => {
      
      // Resimleri kalıcı yap
      const permFrontImage = await saveImagePermanently(newCard.front_image);
      const permBackImage = await saveImagePermanently(newCard.back_image);

      return CardRepository.createCard(
        newCard.deck_id,
        newCard.front_word,
        permFrontImage, 
        newCard.back_word,
        permBackImage
      );
    },

    onSuccess: (newlyCreatedCard) => {
      console.log('Kart eklendi:', newlyCreatedCard?.id);
      queryClient.invalidateQueries({ queryKey: ['cards', deckId] });
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      router.back();
    },
    onError: (error) => {
      console.error('Kart kaydedilirken hata:', error);
      Alert.alert('Hata', 'Kart kaydedilirken bir sorun oluştu.');
    },
  });

  const handleSaveCard = () => {
    if (frontWord.trim() === '' || backWord.trim() === '') {
      Alert.alert('Hata', 'Ön ve Arka kelime alanları boş bırakılamaz.');
      return;
    }
    if (!deckId || typeof deckId !== 'string') {
      Alert.alert('Hata', 'Deste bulunamadı.');
      return;
    }

    addCard({
      deck_id: parseInt(deckId, 10),
      front_word: frontWord,
      front_image: frontImage,
      back_word: backWord,
      back_image: backImage,
    });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Ön Yüz</Text>
        <View style={styles.textInputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Ön kelime veya cümle"
            value={frontWord}
            onChangeText={setFrontWord}
            autoFocus={true}
            returnKeyType="next"
            onSubmitEditing={() => backWordInputRef.current?.focus()}
          />
          <TouchableOpacity onPress={() => pickImage(setFrontImage)}>
            <Ionicons name="image-outline" size={30} color="#4F8EF7" />
          </TouchableOpacity>
        </View>

        <View style={styles.imagePreviewContainer}>
          {/* Image source uri kontrolü */}
          <Image
            source={
              frontImage
                ? { uri: frontImage }
                : require('../assets/images/mindfliplogo.png')
            }
            style={[styles.previewImage, !frontImage && { opacity: 0.1 }]}
            resizeMode="cover"
          />
          {frontImage && (
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => setFrontImage(null)}
            >
              <Ionicons name="close-circle" size={30} color="red" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Arka Yüz</Text>
        <View style={styles.textInputWrapper}>
          <TextInput
            ref={backWordInputRef}
            style={styles.input}
            placeholder="Arka kelime veya cümle"
            value={backWord}
            onChangeText={setBackWord}
            returnKeyType="done"
            onSubmitEditing={() => Keyboard.dismiss()}
          />
          <TouchableOpacity onPress={() => pickImage(setBackImage)}>
            <Ionicons name="image-outline" size={30} color="#4F8EF7" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.imagePreviewContainer}>
          <Image
            source={
              backImage
                ? { uri: backImage }
                : require('../assets/images/mindfliplogo.png')
            }
            style={[styles.previewImage, !backImage && { opacity: 0.1 }]}
            resizeMode="cover"
          />
          {backImage && (
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => setBackImage(null)}
            >
              <Ionicons name="close-circle" size={30} color="red" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, isPending && styles.saveButtonDisabled]}
        onPress={handleSaveCard}
        disabled={isPending}
      >
        {isPending ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={styles.saveButtonText}>Kartı Kaydet</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7', padding: 20 },
  inputContainer: { marginBottom: 25 },
  label: { fontSize: 16, fontWeight: '600', color: '#555', marginBottom: 8 },
  textInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, borderColor: '#ddd', borderWidth: 1, paddingHorizontal: 10 },
  input: { flex: 1, height: 50, fontSize: 16 },
  previewImage: { width: 100, height: 100, borderRadius: 10, marginTop: 10, alignSelf: 'center', backgroundColor: '#eee' },
  imagePreviewContainer: { alignSelf: 'center', position: 'relative' },
  removeImageButton: { position: 'absolute', top: 5, right: -5, backgroundColor: 'white', borderRadius: 15 },
  saveButton: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10, marginBottom: 40 },
  saveButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  saveButtonDisabled: { backgroundColor: '#A5D6A7' },
});