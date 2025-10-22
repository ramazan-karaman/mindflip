import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
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
} from "react-native";
import { insertCard } from "../lib/services/cardService";

export default function AddCardScreen() {

    const { deckId } = useLocalSearchParams();

    const [frontWord, setFrontWord] = useState("");
    const [backWord, setBackWord] = useState("");
    const [frontImage, setFrontImage] = useState<string | null>(null);
    const [backImage, setBackImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const backWordInputRef = useRef<TextInput>(null);

    const pickImage = async (setImage: (uri: string | null) => void) => {
        Alert.alert(
            "Resim Seç",
            "Nereden bir resim eklemek istersin?",
            [
                {
                    text: "Galeriden Seç",
                    onPress: async () => {
                        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
                        if (permissionResult.granted === false) {
                            Alert.alert("İzin Gerekli", "Resim seçebilmek için galeri izni vermeniz gerekiyor.");
                            return;
                        }

                        const result = await ImagePicker.launchImageLibraryAsync({
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                            allowsEditing: true,
                            aspect: [4, 3],
                            quality: 1,
                        });

                        if (!result.canceled) {
                            setImage(result.assets[0].uri);
                        }
                    },
                },
                {
                    text: "Fotoğraf Çek",
                    onPress: async () => {
                        const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
                        if (permissionResult.granted === false) {
                            Alert.alert("İzin Gerekli", "Fotoğraf çekebilmek için kamera izni vermeniz gerekiyor.");
                            return;
                        }

                        const result = await ImagePicker.launchCameraAsync({
                            allowsEditing: true,
                            aspect: [4, 3],
                            quality: 1,
                        });

                        if (!result.canceled) {
                            setImage(result.assets[0].uri);
                        }
                    },
                },
                {
                    text: "İptal",
                    style: "cancel",
                },
            ]
        );
    };

    const handleSaveCard = async () => {
        if (frontWord.trim() === '' || backWord.trim() === '') {
            Alert.alert("Hata", "Ön ve Arka kelime alanları boş bırakılamaz.");
            return;
        }
        if (!deckId) {
            Alert.alert("Hata", "Deste ID'si bulunamadı. Lütfen ana sayfaya geri dönüp tekrar deneyin.");
            return;
        }
        setLoading(true);
        try {
            await insertCard(
                parseInt(deckId as string, 10), // deckId'yi sayıya çevirme
                frontWord,
                frontImage,
                backWord,
                backImage
            );

            Alert.alert("Başarılı", "Kart desteye eklendi!");

            setFrontWord('');
            setBackWord('');
            setFrontImage(null);
            setBackImage(null);

        } catch (error) {
            console.error("Kart kaydedilirken hata:", error);
            Alert.alert("Hata", "Kart kaydedilirken bir sorun oluştu.");
        } finally {
            setLoading(false);
        }
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
                    <Image
                        source={frontImage ? { uri: frontImage } : require('../assets/images/mindfliplogo.png')}
                        style={styles.previewImage} />
                    {frontImage && (
                        <TouchableOpacity
                            style={styles.removeImageButton} onPress={() => setFrontImage(null)}>
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
                        source={backImage ? { uri: backImage } : require('../assets/images/mindfliplogo.png')}
                        style={styles.previewImage} />
                    {backImage && (
                        <TouchableOpacity
                            style={styles.removeImageButton} onPress={() => setBackImage(null)}>
                            <Ionicons name="close-circle" size={30} color="red" />
                        </TouchableOpacity>
                    )}
                </View>

            </View>

            <TouchableOpacity style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                onPress={handleSaveCard}
                disabled={loading}
            >
                {loading ? (
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