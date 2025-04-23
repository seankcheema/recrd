import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, TouchableWithoutFeedback, Keyboard } from 'react-native';
import Nav from './Nav';
import GlobalText from './GlobalText';
import { Feather } from '@expo/vector-icons';

export default function AddNew() {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
  };

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View style={{ flex: 1, backgroundColor: '#111111', paddingTop: 70, paddingBottom: 100 }}>
        <ScrollView style={{ padding: 20, paddingTop: 0 }}>

          <GlobalText style={{ color: '#E7BC10', fontSize: 32, fontWeight: '800' }}>
            recrd
          </GlobalText>

          {/* Search Bar Component */}
          <View style={styles.searchBarContainer}>
            <Feather name="search" size={24} color="#FFFAF0" />
            <TextInput
              value={searchQuery}
              onChangeText={handleSearchChange}
              placeholder="search an album, artist, or friend"
              placeholderTextColor="#FFFAF0A0"
              style={styles.searchBar}
              maxLength={25}
            />
          </View>

          <GlobalText style={{ color: '#FFFAF0', fontSize: 18, marginTop: 20, marginBottom: 20, fontWeight: '800' }}>
            recent searches
          </GlobalText>

          <ScrollView>
            {/* ScrollView content here */}
          </ScrollView>
        </ScrollView>
        <Nav />
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  searchBarContainer: {
    height: 50,
    borderColor: '#E7BC10',
    borderWidth: 0.5,
    borderRadius: 15,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e1e1e',
    marginTop: 20,
    gap: 10,
  },
  searchBar: {
    fontFamily: 'Nunito',
    fontWeight: 'bold',
    color: '#FFFAF0',
    fontSize: 16,
    flex: 1,
  },
});
