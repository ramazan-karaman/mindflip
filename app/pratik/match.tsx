import { StyleSheet, Text, View } from "react-native";

export default function MatchScreen() {

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Burası eşleştirme sayfasıdır</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: "red",
    },
});