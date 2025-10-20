import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { PracticeRoute } from '../types/entities';

const { width, height } = Dimensions.get("window");


type PracticeModeCardProps = {
  title: string;
  route: PracticeRoute;
  color: string;
  icon: any;
  onPress: (route: PracticeRoute) => void;
};

const PracticeModeCard = ({ title, route, color, icon, onPress }: PracticeModeCardProps) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onCardPress = () => {
    scale.value = withTiming(1.05, { duration: 150 }, () => {
      scale.value = withTiming(1, { duration: 150 });
    });
    
    setTimeout(() => onPress(route), 200);
  };

  return (
    <Animated.View style={[styles.card, { backgroundColor: color }, animatedStyle]}>
      <TouchableOpacity onPress={onCardPress} style={styles.cardBtn}>
        <Ionicons name={icon} size={28} color="#fff" style={{ marginBottom: 8 }} />
        <Text style={styles.cardText}>{title}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: width * 0.42,
    height: height * 0.15,
    borderRadius: 16,
    marginBottom: 16,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  cardBtn: {
    flex: 1,
    width: '100%',
    justifyContent: "center",
    alignItems: "center"
  },
  cardText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
});

export default PracticeModeCard;