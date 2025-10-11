import { Ionicons } from "@expo/vector-icons";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { useNavigation } from "@react-navigation/native";
import { router } from "expo-router";
import { useState } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Menu, MenuOption, MenuOptions, MenuTrigger } from "react-native-popup-menu";

const {width}= Dimensions.get("window");

// Drawer tipleri
type RootDrawerParamList = {
  index: undefined;
  addcard: undefined;
  stats: undefined;
};

// örnek veriler
const initialDecks = [
  { id: "1", name: "Deste 1", description: "İlk deste" },
  { id: "2", name: "Deste 2", description: "İkinci deste" },
];

export default function IndexScreen() {
  const navigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();
  const [decks, setDecks] = useState(initialDecks);
  const [search, setSearch] = useState("");
  const [showSheet, setShowSheet] = useState(false);

  // Bottom sheet durumu
  const [newDeck, setNewDeck] = useState({
    name: "",
    description: "",
  });

  const filteredDecks = decks.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const addDeck = () => {
    if (newDeck.name.trim() === "") return;
    setDecks([
      ...decks,
      { id: Date.now().toString(), name: newDeck.name, description: newDeck.description },
    ]);
      setNewDeck({ name: "", description: ""});
    setShowSheet(true);
  };

  const renderDeck = ({ item }: any) => (
    <View style={styles.deckCard}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={styles.deckTitle}>{item.name}</Text>


        <Menu>
          <MenuTrigger>
            <Ionicons name="ellipsis-vertical" size={20} color="#333" />
          </MenuTrigger>
          <MenuOptions>
            <MenuOption onSelect={() => alert("Düzenle " + item.name)} text="Düzenle" />
            <MenuOption onSelect={() => alert("Sil " + item.name)} text="Sil" />
            <MenuOption onSelect={() => alert(item.name + " Hedef: 20")} text="Hedef" />
          </MenuOptions>
        </Menu>
      </View>

      <Text style={styles.deckDesc}>{item.description}</Text>

      <View style={styles.deckButtons}>
        <TouchableOpacity style={styles.practiceBtn}
        onPress={()=> router.push("/practice")}
        >
          <Text style={styles.btnText}>Pratikler</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addCardBtn}
        onPress={()=> router.push("/(tabs)/addcard")}>
          <Text style={styles.btnText}>+ Kart Ekle</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>

      <View style={styles.searchRow}>
        <TouchableOpacity onPress={() => navigation.openDrawer()}>
          <Ionicons name="menu" size={35} color="#333" />
        </TouchableOpacity>
        <TextInput
          placeholder="Search..."
          value={search}
          onChangeText={setSearch}
          style={styles.search}
        />
      </View>

      <FlatList
        data={filteredDecks}
        keyExtractor={(item) => item.id}
        renderItem={renderDeck}
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      
      <TouchableOpacity style={styles.createBtn} onPress={() => setShowSheet(true)}>
        <Text style={styles.btnText}>+ Deste Oluştur</Text>
      </TouchableOpacity>

      
      <Modal visible={showSheet} animationType="slide" transparent>
        <View style={styles.sheet}>
          <TextInput
            placeholder="İsim"
            value={newDeck.name}
            onChangeText={(t) => setNewDeck({ ...newDeck, name: t })}
            style={styles.input}
          />
          <TextInput
            placeholder="Açıklama"
            value={newDeck.description}
            onChangeText={(t) => setNewDeck({ ...newDeck, description: t })}
            style={styles.input}
          />

          <TouchableOpacity style={styles.saveBtn} onPress={addDeck}>
            <Text style={styles.btnText}>Save</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowSheet(false)}>
            <Text style={{ textAlign: "center", marginTop: 10, color: "red" }}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f7f7", padding: 16 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
    marginTop: 30,
  },
  search: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 10,
    backgroundColor: "#fff",
  },
  deckCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  deckTitle: { fontSize: 18, fontWeight: "bold" },
  deckDesc: { fontSize: 14, color: "#666", marginVertical: 6 },
  deckButtons: { flexDirection: "row", gap: 20 },
  practiceBtn: {
    backgroundColor: "#2196F3",
    padding: 10,
    borderRadius: 8,
  },
  addCardBtn: {
    backgroundColor: "#4CAF50",
    padding: 10,
    borderRadius: 8,
  },
  btnText: { color: "#fff", fontWeight: "bold" },
  createBtn: {
    backgroundColor: "#FF6B6B",
    padding: 14,
    borderRadius: 12,
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
    width: width * 0.9,
    alignItems: "center",
  },
  sheet: {
    backgroundColor: "#fff",
    marginTop: "auto",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  saveBtn: {
    backgroundColor: "#2196F3",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
});
