import React, { useEffect } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

export default function Splash() {

    const { width, height } = useWindowDimensions();

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
            <Animated.View style={[styles.card, styles.frontCard,{ width: width * 0.7, height: height * 0.4 }, frontAnimatedStyle]}>
                <Text style={styles.text}>MIND</Text>
            </Animated.View>
            <Animated.View style={[styles.card, styles.backCard,{ width: width * 0.7, height: height * 0.4 }, backAnimatedStyle]}>
                <Text style={styles.text}>FLIP</Text>
            </Animated.View>
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