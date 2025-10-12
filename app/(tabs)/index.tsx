import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
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
import { deleteDeck, getCardCountForDeck, getDBConnection, getDecks, insertDeck, updateDeck } from "../../components/db";

interface Deck {
  id: number;
  name: string;
  description: string;
  user_id: number;
  created_at: string;
  goal: number;
}

const { width } = Dimensions.get("window");

// Drawer tipleri
type RootDrawerParamList = {
  index: undefined;
  addcard: undefined;
  stats: undefined;
};



export default function IndexScreen() {
  const navigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [search, setSearch] = useState("");
  const [showSheet, setShowSheet] = useState(false);
  const [isGoalModalVisible, setIsGoalModalVisible] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const[currentGoal,setCurrentGoal]=useState(1);
  const[maxGoal,setMaxGoal]=useState(1);

  // Bottom sheet durumu
  const [newDeck, setNewDeck] = useState({
    name: "",
    description: "",
  });

  const loadDecks = useCallback(async () => {
    try {
      const db = await getDBConnection();
      const fetchedDecks = await getDecks(db);
      setDecks(fetchedDecks);
    } catch (error) {
      console.error("Deste yüklenirken hata oluştu:", error);
    }
  }, []);

  useFocusEffect(() => {
    loadDecks();
  }
  );

  const addDeck = async () => {
    if (newDeck.name.trim() === "") {
      Alert.alert("Hata", "Deste ismi boş olamaz.");
      return;
    }
    try {
      const db = getDBConnection();
      // user id 1 olarak hedef 0 yapıldı
      await insertDeck(db, 1, newDeck.name, newDeck.description, 0, new Date().toISOString());
      setNewDeck({ name: "", description: "" });
      setShowSheet(false);
      loadDecks(); // yeni desteleri yükle
    } catch (error) {
      console.error("Deste eklenirken hata oluştu:", error);
    }
  };

  const handleDeleteDeck = (id: number, name: string) => {
    Alert.alert(
      "Deste Silme",
      `${name} destesi silinsin mi?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: async () => {
            try {
              const db = await getDBConnection();
              await deleteDeck(db, id);
              loadDecks(); // desteleri yeniden yükle
            } catch (error) {
              console.error("Deste silinirken hata oluştu:", error);
            }
          },
        },
      ]
    );
  };

  const handleOpenGoalSheet = async (deck: Deck) => {
    try {
      const db = await getDBConnection();
      const cardCount = await getCardCountForDeck(db, deck.id);
      if (cardCount < 5) {
        Alert.alert("Yetersiz kart", "Hedef belirlemek için en az 5 kart eklenmelidir.");
        return;
      }
      setSelectedDeck(deck);
      setMaxGoal(cardCount);

      setCurrentGoal(deck.goal>0 && deck.goal<=cardCount ? deck.goal : 1);
      setIsGoalModalVisible(true);
    } catch (error) {
      console.error("Hedef modal'ı açılırken hata:", error);
    }
  }

  const handleSaveGoal = async () => {
    if(!selectedDeck) return;
    try {
      const db = await getDBConnection();
      await updateDeck(db, selectedDeck.id, selectedDeck.name, selectedDeck.description, Math.round(currentGoal));

      setIsGoalModalVisible(false);
      setSelectedDeck(null);
      loadDecks();
      Alert.alert("Başarılı", `'${selectedDeck.name}' destesi için yeni hedef ${Math.round(currentGoal)} olarak ayarlandı.`)
    }catch(error) {
      console.error("Hedef kaydedilirken hata:", error);
    }
  };
  const filteredDecks = decks.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  const renderDeck = ({ item }: { item: Deck }) => (
    <View style={styles.deckCard}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
         <Text style={styles.deckTitle}>{item.name} {item.goal > 0 && `(Hedef: ${item.goal})`}</Text>
        <Menu>
          <MenuTrigger>
            <Ionicons name="ellipsis-vertical" size={20} color="#333" />
          </MenuTrigger>
          <MenuOptions>
            <MenuOption onSelect={() => alert("Düzenle " + item.name)} text="Düzenle" />
            <MenuOption onSelect={() => handleDeleteDeck(item.id, item.name)} text="Sil" />
            <MenuOption onSelect={() => handleOpenGoalSheet(item)} text="Hedef" />
          </MenuOptions>
        </Menu>
      </View>

      <Text style={styles.deckDesc}>{item.description}</Text>
      <View style={styles.deckButtons}>
        <TouchableOpacity style={styles.practiceBtn} onPress={() => router.push("/practice")}>
          <Text style={styles.btnText}>Pratikler</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addCardBtn} onPress={() => router.push("/(tabs)/addcard")}>
          <Text style={styles.btnText}>+ Kart Ekle</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search Row */}
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

      <Modal visible={isGoalModalVisible} animationType="slide" transparent>
        <View style={styles.sheet}>
          <Text style={styles.deckTitle}>Hedef Belirle</Text>
          <Text style={styles.deckDesc}>'{selectedDeck?.name}' destesi için günlük çalışma hedefini seç.</Text>
          
          <Text style={{fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginVertical: 20}}>
            Hedef: {Math.round(currentGoal)} / {maxGoal}
          </Text>

          <Slider
            style={{width: '100%', height: 40}}
            minimumValue={1}
            maximumValue={maxGoal}
            step={1}
            value={currentGoal}
            onValueChange={setCurrentGoal}
            minimumTrackTintColor="#2196F3"
            maximumTrackTintColor="#000000"
          />

          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveGoal}>
            <Text style={styles.btnText}>Kaydet</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsGoalModalVisible(false)}>
            <Text style={{ textAlign: "center", marginTop: 10, color: "red" }}>
              İptal
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Deck List */}
      <FlatList
        data={filteredDecks}
        keyExtractor={(item) => item.id.toString()} // id'nin string olduğundan emin olalım
        renderItem={renderDeck}
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      {/* Create Button */}
      <TouchableOpacity style={styles.createBtn} onPress={() => setShowSheet(true)}>
        <Text style={styles.btnText}>+ Deste Oluştur</Text>
      </TouchableOpacity>

      {/* Add Deck Modal */}
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
