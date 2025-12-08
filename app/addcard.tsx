import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
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
import { compressImage, getFileInfo } from '../lib/services/imageService'; // Servisimizi kullanacağız
import { checkHasPendingChanges } from '../lib/services/syncService';

export default function AddCardScreen() {
  const { deckId } = useLocalSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [frontWord, setFrontWord] = useState('');
  const [backWord, setBackWord] = useState('');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string | null>(null);
  
  // Resim işleme durumu için loading
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  
  const backWordInputRef = useRef<TextInput>(null);

  // Ortak Resim İşleme Fonksiyonu
  const processSelectedImage = async (uri: string, setImage: (uri: string | null) => void) => {
    try {
      setIsProcessingImage(true);
      
      console.log("--- Resim İşleme Başladı ---");
      await getFileInfo(uri); // Orijinal boyut

      // Sıkıştırma Servisini Çağır
      const compressedUri = await compressImage(uri);
      
      await getFileInfo(compressedUri); // Yeni boyut
      console.log("--- Resim İşleme Bitti ---");

      setImage(compressedUri);
    } catch (error) {
      console.error("Resim işlenirken hata:", error);
      Alert.alert("Hata", "Resim işlenirken bir sorun oluştu.");
    } finally {
      setIsProcessingImage(false);
    }
  };

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
              Alert.alert('İzin Gerekli', 'Resim seçebilmek için galeri izni vermeniz gerekiyor.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images, // DÜZELTME: MediaType.Images (Expo sürümüne göre değişebilir, şimdilik böyle kalsın hata verirse düzeltiriz)
              allowsEditing: true,
              aspect: [4, 3],
              quality: 1, // Biz zaten kendi servisimizle sıkıştıracağız, buradan ham alalım
            });
            
            if (!result.canceled) {
              await processSelectedImage(result.assets[0].uri, setImage);
            }
          },
        },
        {
          text: 'Fotoğraf Çek',
          onPress: async () => {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (permissionResult.granted === false) {
              Alert.alert('İzin Gerekli', 'Fotoğraf çekebilmek için kamera izni vermeniz gerekiyor.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              aspect: [4, 3],
              quality: 1,
            });
            
            if (!result.canceled) {
              await processSelectedImage(result.assets[0].uri, setImage);
            }
          },
        },
        {
          text: 'İptal',
          style: 'cancel',
        },
      ]
    );
  };

  const { mutate: addCard, isPending } = useMutation({
    mutationFn: (newCard: {
      deck_id: number;
      front_word: string;
      front_image: string | null;
      back_word: string;
      back_image: string | null;
    }) => {
      return CardRepository.createCard(
        newCard.deck_id,
        newCard.front_word,
        newCard.front_image,
        newCard.back_word,
        newCard.back_image,
        null
      );
    },

    onSuccess: (newlyCreatedCard) => {
      console.log('Kart başarıyla eklendi (local):', newlyCreatedCard?.id);
      queryClient.invalidateQueries({ queryKey: ['cards', deckId] });
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      checkHasPendingChanges();
      
      // Formu temizle ki kullanıcı seri ekleme yapabilsin (Router.back yerine opsiyonel)
      // Ama tasarımda router.back() var, o yüzden geri dönüyoruz.
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
      Alert.alert('Hata', 'Deste ID bulunamadı.');
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
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Resim işlenirken kullanıcıyı bilgilendir */}
      {isProcessingImage && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Resim Sıkıştırılıyor...</Text>
        </View>
      )}

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
          <TouchableOpacity onPress={() => pickImage(setFrontImage)} disabled={isProcessingImage}>
            <Ionicons name="image-outline" size={30} color="#4F8EF7" />
          </TouchableOpacity>
        </View>

        <View style={styles.imagePreviewContainer}>
          <Image
            source={
              frontImage
                ? { uri: frontImage }
                : require('../assets/images/mindfliplogo.png')
            }
            style={styles.previewImage}
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
          <TouchableOpacity onPress={() => pickImage(setBackImage)} disabled={isProcessingImage}>
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
            style={styles.previewImage}
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
        style={[styles.saveButton, (isPending || isProcessingImage) && styles.saveButtonDisabled]}
        onPress={handleSaveCard}
        disabled={isPending || isProcessingImage}
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
  container: {
    flex: 1,
    backgroundColor: '#f7f7f7',
    padding: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontWeight: 'bold'
  },
  inputContainer: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  textInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderColor: '#ddd',
    borderWidth: 1,
    paddingHorizontal: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginTop: 10,
    alignSelf: 'center',
    backgroundColor: '#eee',
  },
  imagePreviewContainer: {
    alignSelf: 'center',
    position: 'relative',
  },
  removeImageButton: {
    position: 'absolute',
    top: 5,
    right: -5,
    backgroundColor: 'white',
    borderRadius: 15,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
});