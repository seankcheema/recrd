import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import Nav from './Nav';
import GlobalText from './GlobalText';
import { Feather } from '@expo/vector-icons';

const API_URL = 'http://192.168.1.71:8000';  // ← point this at your FastAPI server

export default function AddNew() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
  };

  // Debounce the fetch so we don't fire on every keystroke
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults(null);
      return;
    }

    const timeout = setTimeout(() => {
      performSearch();
    }, 500);

    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const resp = await fetch(
        `${API_URL}/search?q=${encodeURIComponent(searchQuery)}&type=track,album,artist&limit=10`
      );
      if (!resp.ok) throw new Error(`${resp.status}`);
      const data = await resp.json();
      setSearchResults(data);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1, backgroundColor: '#111111', paddingTop: 70, paddingBottom: 100 }}>
        <ScrollView style={{ padding: 20, paddingTop: 0 }} keyboardShouldPersistTaps="handled">
          <GlobalText style={{ color: '#E7BC10', fontSize: 32, fontWeight: '800' }}>
            recrd
          </GlobalText>

          {/* Search Bar */}
          <View style={styles.searchBarContainer}>
            <Feather name="search" size={24} color="#FFFAF0" />
            <TextInput
              value={searchQuery}
              onChangeText={handleSearchChange}
              placeholder="search an album, artist, or song"
              placeholderTextColor="#FFFAF0A0"
              style={styles.searchBar}
              maxLength={25}
              returnKeyType="search"
              onSubmitEditing={performSearch}
            />
          </View>

          {loading && <ActivityIndicator style={{ marginTop: 20 }} />}

          {/* Results */}
          {searchResults && (
            <View style={{ marginTop: 20 }}>
              {Object.entries(searchResults).map(([type, block]: any) => (
                <View key={type} style={{ marginBottom: 20 }}>
                  <GlobalText style={{ color: '#FFFAF0', fontSize: 18, fontWeight: '700' }}>
                    {type.toUpperCase()}
                  </GlobalText>
                  {block.items.length > 0 ? (
                    block.items.map((item: any) => (
                      <Text key={item.id} style={{ color: '#FFF', paddingVertical: 4 }}>
                        {item.name}
                      </Text>
                    ))
                  ) : (
                    <Text style={{ color: '#888', fontStyle: 'italic' }}>no results</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Fallback when nothing to show */}
          {!loading && !searchResults && searchQuery.length >= 2 && (
            <GlobalText style={{ color: '#FFFAF0A0', marginTop: 20 }}>searching…</GlobalText>
          )}

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
