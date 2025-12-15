import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// TİP TANIMINI GÜNCELLİYORUZ
interface DailyRingProps {
  completedDecks: number; // Yeni prop
  totalDecks: number;     // Yeni prop
  radius?: number;
  strokeWidth?: number;
}

export default function DailyRing({ completedDecks, totalDecks, radius = 90, strokeWidth = 18 }: DailyRingProps) {
  const circleLength = 2 * Math.PI * radius;
  const sharedProgress = useSharedValue(0);

  // 0'a bölme hatasını önle
  const progress = totalDecks > 0 ? completedDecks / totalDecks : 0;

  useEffect(() => {
    sharedProgress.value = withTiming(progress, { duration: 1500 });
  }, [progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circleLength * (1 - sharedProgress.value),
  }));

  // Hepsi bittiyse Altın, yoksa Mavi
  const isComplete = progress >= 1 && totalDecks > 0;
  const strokeColor = isComplete ? '#FFD700' : '#2196F3'; 

  return (
    <View style={styles.container}>
      <Svg width={radius * 2 + strokeWidth} height={radius * 2 + strokeWidth}>
        <G rotation="-90" origin={`${radius + strokeWidth / 2}, ${radius + strokeWidth / 2}`}>
          {/* Arka Plan Gri Halka */}
          <Circle
            cx="50%"
            cy="50%"
            r={radius}
            stroke="#E0E0E0"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeOpacity={0.3}
          />
          {/* İlerleme Halkası (Animated) */}
          <AnimatedCircle
            cx="50%"
            cy="50%"
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circleLength}
            animatedProps={animatedProps}
            strokeLinecap="round"
          />
        </G>
      </Svg>
      
      {/* Halkanın Ortasındaki Yazı */}
      <View style={styles.textContainer}>
        {isComplete ? (
           <View style={{alignItems: 'center'}}>
             <Ionicons name="trophy" size={48} color="#FFD700" style={{marginBottom: 5}} />
             <Text style={[styles.subText, {color: '#FFD700'}]}>Tamamlandı!</Text>
           </View>
        ) : (
           <View style={{alignItems: 'center'}}>
               <Text style={styles.fractionText}>
                 {completedDecks} <Text style={styles.fractionTotal}>/ {totalDecks}</Text>
               </Text>
               <Text style={styles.label}>DESTE BİTTİ</Text>
           </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  textContainer: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  fractionText: { fontSize: 42, fontWeight: 'bold', color: '#333' },
  fractionTotal: { fontSize: 24, color: '#999', fontWeight: '400' },
  subText: { fontSize: 18, fontWeight: 'bold' },
  label: { fontSize: 12, color: '#999', marginTop: 4, letterSpacing: 1, fontWeight: '600' },
});