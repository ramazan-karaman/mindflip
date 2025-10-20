import React, { useEffect } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

const { width, height } = Dimensions.get("window"); // ekranın genişliğini öğrenme

export default function Splash() {
    const flipAnim = useSharedValue(0); // animasyon kontrol

    useEffect(() => {
        flipAnim.value = withTiming(180, { duration: 1200 });
    }, []);

    const frontAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ rotateY: `${flipAnim.value}deg` }],
        };
    });

    const backAnimatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ rotateY: `${flipAnim.value + 180}deg` }],
        };
    });

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.card, styles.frontCard, frontAnimatedStyle]}>
                <Text style={styles.text}>MIND</Text>
            </Animated.View>
            <Animated.View style={[styles.card, styles.backCard, backAnimatedStyle]}>
                <Text style={styles.text}>FLIP</Text>
            </Animated.View>
                <Text style={styles.text}>FLIP</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
    },
    card: {
        width: width * 0.7,
        height: height * 0.4,
        backgroundColor: "#2196F3",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 20,
        backfaceVisibility: "hidden",
        position: "absolute",
    },
    frontCard: {
        backgroundColor: "#2196F3",
    },
    backCard: {
        backgroundColor: "#4CAF50",
    },
    text: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#fff",
    },
});