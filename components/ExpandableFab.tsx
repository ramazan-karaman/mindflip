import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing, // YENİ: Yumuşak geçiş eğrisi için
  useAnimatedStyle,
  useSharedValue,
  withTiming, // YENİ: Sallanmayı önlemek için Spring yerine Timing
} from 'react-native-reanimated';

interface ExpandableFabProps {
  onCreateDeck: () => void;
  onImportCsv: () => void;
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function ExpandableFab({ onCreateDeck, onImportCsv }: ExpandableFabProps) {
  const [isOpen, setIsOpen] = useState(false);
  const animation = useSharedValue(0);

  const toggleMenu = () => {
    const nextValue = isOpen ? 0 : 1;
    
    // DEĞİŞİKLİK BURADA:
    // withSpring (sallanan yay) yerine withTiming (net geçiş) kullanıyoruz.
    animation.value = withTiming(nextValue, {
      duration: 250, // 250 milisaniyede tamamla
      easing: Easing.out(Easing.quad), // Sona doğru yavaşça dur
    });
    
    setIsOpen(!isOpen);
  };

  // Ana Buton Rotasyonu (+ -> x)
  const mainButtonRotation = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${animation.value * 45}deg` }],
    };
  });

  // 1. Buton (CSV Import) Animasyonu
  const importButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: animation.value }, // Büyüyerek gel
        { translateY: animation.value * -130 }, // Yukarı kay
      ],
      opacity: animation.value, // Görünür ol
    };
  });

  // 2. Buton (Deste Ekle) Animasyonu
  const createButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: animation.value },
        { translateY: animation.value * -70 },
      ],
      opacity: animation.value,
    };
  });

  return (
    <View style={styles.container}>
      {/* --- CSV IMPORT BUTONU --- */}
      <Animated.View style={[styles.actionBtnContainer, importButtonStyle]}>
        <View style={styles.labelContainer}>
          <Text style={styles.labelText}>CSV İçe Aktar</Text>
        </View>
        <TouchableOpacity style={[styles.subBtn, { backgroundColor: '#FF9800' }]} onPress={() => { toggleMenu(); onImportCsv(); }}>
          <Ionicons name="document-text-outline" size={20} color="white" />
        </TouchableOpacity>
      </Animated.View>

      {/* --- DESTE EKLE BUTONU --- */}
      <Animated.View style={[styles.actionBtnContainer, createButtonStyle]}>
        <View style={styles.labelContainer}>
          <Text style={styles.labelText}>Yeni Deste</Text>
        </View>
        <TouchableOpacity style={[styles.subBtn, { backgroundColor: '#4CAF50' }]} onPress={() => { toggleMenu(); onCreateDeck(); }}>
          <Ionicons name="create-outline" size={20} color="white" />
        </TouchableOpacity>
      </Animated.View>

      {/* --- ANA BUTON (+) --- */}
      <AnimatedTouchableOpacity
        style={[styles.mainBtn, mainButtonRotation]}
        onPress={toggleMenu}
        activeOpacity={0.9}
      >
        <Ionicons name="add" size={32} color="white" />
      </AnimatedTouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    alignItems: 'center',
    zIndex: 999,
  },
  mainBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 10,
  },
  actionBtnContainer: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    right: 5,
    width: 200,
  },
  subBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  labelContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    marginRight: 10,
    elevation: 2,
  },
  labelText: {
    fontWeight: '600',
    color: '#333',
    fontSize: 14,
  },
});