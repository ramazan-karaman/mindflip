import { StyleSheet, Text, View } from "react-native";

export default function ClassicScreen(){

    return(
        <View style={styles.container}>
            <Text style={styles.title}>Burası klasik alıştırma sayfasıdır</Text>
        </View>
    );
}

const styles= StyleSheet.create({
    container:{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#fff",
    },
    title:{
        fontSize: 24,
        fontWeight: "bold",
        color: "red",
    },
});