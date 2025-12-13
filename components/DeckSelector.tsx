import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Menu, MenuOption, MenuOptions, MenuTrigger } from 'react-native-popup-menu';
import { DeckWithCardCount } from '../lib/types';

interface DeckSelectorProps {
  decks: DeckWithCardCount[] | undefined;
  currentDeckId: number | null;
  onSelectDeck: (deckId: number) => void;
  isLoading: boolean;
}

export default function DeckSelector({ decks, currentDeckId, onSelectDeck, isLoading }: DeckSelectorProps) {
  // Seçili desteyi bul
  const currentDeck = decks?.find(d => d.id === currentDeckId);
  
  // Ekranda görünecek isim
  const displayText = isLoading 
    ? 'Yükleniyor...' 
    : currentDeck 
        ? currentDeck.name 
        : 'Deste Seçin';

  return (
    <View style={styles.container}>
      <Menu>
        <MenuTrigger customStyles={{ triggerWrapper: styles.triggerWrapper }}>
          <View style={styles.deckNameContainer}>
            <Text style={styles.deckName} numberOfLines={1}>
              {displayText}
            </Text>
            
            {isLoading ? (
              <ActivityIndicator size="small" color="#333" style={{ marginLeft: 8 }} />
            ) : (
              <Ionicons name="chevron-down" size={24} color="#333" style={{ marginLeft: 8 }} />
            )}
          </View>
        </MenuTrigger>

        <MenuOptions customStyles={{ optionsContainer: styles.menuOptions }}>
          <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={true}>
            {(decks ?? []).map((deck) => (
              <MenuOption
                key={deck.id}
                onSelect={() => onSelectDeck(deck.id)}
                style={[
                  styles.menuOptionItem,
                  deck.id === currentDeckId && styles.menuOptionActive
                ]}
              >
                <View style={styles.optionContent}>
                  <Text style={[
                    styles.menuOptionText, 
                    deck.id === currentDeckId && styles.menuOptionTextActive
                  ]}>
                    {deck.name}
                  </Text>
                  
                  {/* Kart Sayısı Rozeti */}
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{deck.cardCount}</Text>
                  </View>
                </View>
              </MenuOption>
            ))}
          </ScrollView>
        </MenuOptions>
      </Menu>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 30, // Header ile grid arasındaki boşluk
    marginTop: 20,
    zIndex: 10,
  },
  triggerWrapper: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    minWidth: 200,
    alignItems: 'center',
  },
  deckNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    maxWidth: 200,
  },
  menuOptions: {
    marginTop: 50,
    borderRadius: 12,
    paddingVertical: 5,
    width: 250, // Menü genişliği
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  menuOptionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  menuOptionActive: {
    backgroundColor: '#E3F2FD',
  },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  menuOptionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  menuOptionTextActive: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  badge: {
    backgroundColor: '#eee',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 12,
    color: '#666',
  }
});