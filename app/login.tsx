import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import 'react-native-url-polyfill/auto';
import { supabase } from '../lib/supabase';


export default function LoginScreen() {
  const router = useRouter();
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true); // Giriş mi Kayıt mı?

  // Supabase Auth İşlemi
  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
      return;
    }

    setLoading(true);
    try {
      if (isLoginMode) {
        // --- GİRİŞ YAP ---
        const { error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });
        if (error) throw error;
        
        // Başarılı giriş sonrası yönlendirme _layout.tsx tarafından otomatik yapılacak
      } else {
        // --- KAYIT OL ---
        const { error, data } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              full_name: email.split('@')[0], // Varsayılan isim (e-posta başı)
            },
          },
        });
        if (error) throw error;

        if (data.session) {
          Alert.alert('Başarılı', 'Hesap oluşturuldu ve giriş yapıldı!');
        } else {
          Alert.alert('Kontrol Edin', 'E-posta adresinize doğrulama linki gönderdik.');
        }
      }
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.inner}>
        {/* LOGO ALANI */}
        <View style={styles.logoContainer}>
          <Image 
            source={require('../assets/images/mindfliplogo.png')} 
            style={styles.logo} 
            resizeMode="contain" 
          />
          <Text style={styles.appName}>MindFlip</Text>
          <Text style={styles.tagline}>Öğrenmenin En Zeki Yolu</Text>
        </View>

        {/* FORM ALANI */}
        <View style={styles.formContainer}>
          <Text style={styles.headerTitle}>
            {isLoginMode ? 'Hoşgeldiniz' : 'Öğrenmeye Başlayın'}
          </Text>

          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="E-posta Adresi"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Şifre"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity 
            style={styles.button} 
            onPress={handleAuth} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isLoginMode ? 'Giriş Yap' : 'Kayıt Ol'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.switchContainer}>
            <Text style={styles.switchText}>
              {isLoginMode ? "Hesabın yok mu?" : "Zaten hesabın var mı?"}
            </Text>
            <TouchableOpacity onPress={() => setIsLoginMode(!isLoginMode)}>
              <Text style={styles.switchButton}>
                {isLoginMode ? ' Kayıt Ol' : ' Giriş Yap'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1, justifyContent: 'center', paddingHorizontal: 30 },
  
  logoContainer: { alignItems: 'center', marginBottom: 50 },
  logo: { width: 100, height: 100, marginBottom: 10 },
  appName: { fontSize: 32, fontWeight: 'bold', color: '#2196F3' },
  tagline: { fontSize: 16, color: '#666', marginTop: 5 },

  formContainer: { width: '100%' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 20 },
  
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    marginBottom: 15,
    paddingHorizontal: 15,
    height: 55,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#333' },

  button: {
    backgroundColor: '#2196F3',
    height: 55,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#2196F3',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4
  },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  switchContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  switchText: { color: '#666', fontSize: 15 },
  switchButton: { color: '#2196F3', fontWeight: 'bold', fontSize: 15 },
});