import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, StyleSheet, Text, View } from "react-native";


const {width, height} = Dimensions.get("window"); // ekranın genişliğini öğrenme

export default function Splash(){
    const router = useRouter(); //ekran yönlendirme
    const flipAnim= useRef(new Animated.Value(0)).current; // animasyon kontrol
    const [flipped, setFlipped] = useState(false); //flipped durumu , setFlipped durumu değiştirme

    useEffect(() =>{
        Animated.timing(flipAnim, {
            toValue: 180, //flipanimin gelmesini istediğim değer
            duration: 1000, //değere ulaşma süresi
            useNativeDriver: true, // cihazın motoruyla kullanma (akıcılık)
        }).start();
    }, []);

    const frontInterpolate= flipAnim.interpolate({ //sayısal değeri deg değere çevirme
        inputRange: [0, 180],
        outputRange: ["0deg", "180deg"],// kartı ön yüzden arkaya çevirme
    });

    const backInterpolate= flipAnim.interpolate({
        inputRange: [0, 180],
        outputRange: ["180deg", "360deg"],// kartı arka yüzden öne çevirme
    });

    return(
        <View style={styles.container}>
            <Animated.View
            style={[
                styles.card,
                {
                    transform: [{rotateY: frontInterpolate}],
                    position: "absolute",
                }
            ]}
            >
                <Text style={styles.text}>MIND</Text>
            </Animated.View>
            <Animated.View
                style={[
                    styles.card,
                    {
                        transform: [{rotateY: backInterpolate}],
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

const styles = StyleSheet.create({
    container:{
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
    },
    text: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#fff",
    },
});