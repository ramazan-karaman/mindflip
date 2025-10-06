import { StyleSheet, Text, View } from "react-native";

export default function PracticeScreen(){
    return(
        <View style={styles.container}>
            <Text style={styles.title}>Pratik sayfasıdır</Text>
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