import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, StyleSheet, Text, View } from "react-native";

const { width, height } = Dimensions.get("window");

export default function Splash() {
  const router = useRouter();
  const flipAnim = useRef(new Animated.Value(0)).current;
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    // Kartı 1 saniyede çevir, sonra ana menüye geç
    Animated.timing(flipAnim, {
      toValue: 180,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  // Rotate interpolasyonu
  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ["0deg", "180deg"],
  });

  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ["180deg", "360deg"],
  });

  return (
    <View style={styles.container}>
      {/* Ön yüz */}
      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ rotateY: frontInterpolate }],
            position: "absolute",
          },
        ]}
      >
        <Text style={styles.text}>MIND</Text>
      </Animated.View>

      {/* Arka yüz */}
      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ rotateY: backInterpolate }],
            position: "absolute",
            backgroundColor: "#4CAF50",
          },
        ]}
      >
        <Text style={styles.text}>FLIP</Text>
      </Animated.View>
    </View>
  );
}

const CARD_WIDTH = width * 0.7;
const CARD_HEIGHT = height * 0.4;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: "#2196F3",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backfaceVisibility: "hidden",
  },
  text: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
  },
});
