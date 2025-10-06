import { StyleSheet, Text, View } from 'react-native';

export default function AddCardScreen(){
    return(
        <View style={styles.container}>
            <Text style={styles.title}>Kart Ekleme Sayfası</Text>
        </View>
    );
}

const styles= StyleSheet.create({
    container: {flex:1, justifyContent: 'center', alignItems:'center' , backgroundColor:'white'},
    title: {fontSize: 24, fontWeight: 'bold', color:'red'},
});