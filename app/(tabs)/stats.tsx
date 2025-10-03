import { StyleSheet, Text, View } from 'react-native';

export default function StatsScreen(){
    return(
        <View style={styles.container}>
        <Text style={styles.title}>Burası analiz sayfası</Text>
        </View>
    );
}

const styles= StyleSheet.create({
    container: {flex: 1, justifyContent:'center', alignItems: 'center',backgroundColor:'white'},
    title: {fontSize: 24, fontWeight: 'bold', color:'red'},
});