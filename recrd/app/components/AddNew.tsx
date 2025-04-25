import React, { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import TextTicker from 'react-native-text-ticker';
import GlobalText from './GlobalText';
import { Feather } from '@expo/vector-icons';
import { HOST_IP } from '@env';

const API_URL = `http://${HOST_IP}:8000`;  // ← point this at your FastAPI server

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
        `${API_URL}/search/?q=${encodeURIComponent(searchQuery)}&limit=5`
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

  const router = useRouter();

  const openAlbum = (id: string) => {
    router.push({
      pathname: '/components/Album/[albumId]',
      params: { albumId: id },
    });
  };
  return (
    
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1, backgroundColor: '#111111', paddingTop: 70}}>
        <ScrollView style={{ padding: 20, paddingTop: 0 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 100 }}>
          <GlobalText style={{ color: '#E7BC10', fontSize: 32, fontFamily: 'Nunito-Bold' }}>
            recrd
          </GlobalText>

          {/* Search Bar */}
          <View style={styles.searchBarContainer}>
            <Feather name="search" size={24} color="#FFFAF0" />
            <TextInput
              value={searchQuery.toLowerCase()}
              onChangeText={handleSearchChange}
              placeholder="search an album or artist"
              placeholderTextColor="#FFFAF0A0"
              style={styles.searchBar}
              maxLength={25}
              returnKeyType="search"
              onSubmitEditing={performSearch}
            />
          </View>

          {!loading && !searchResults && (
            <View>
              <GlobalText style={{ color: '#FFFAF0', fontSize: 18, fontFamily: 'Nunito-Bold'}}>
                recent searches
              </GlobalText>
            </View>
          )}

          {loading && !searchResults && (
            <View>
            </View>
          )}

          {/* Results */}
          {searchResults && (
            <View>
              <View style={{ marginBottom: 15 }}>
                <GlobalText style={{ color: '#FFFAF0', fontSize: 18, fontFamily: 'Nunito-Bold', marginBottom: 10 }}>
                  albums
                </GlobalText>
                {searchResults.albums.length > 0 ? (
                  searchResults.albums.map((item: any) => (
                    <TouchableOpacity key={item.id} style={styles.albumView} onPress={() => {openAlbum(item.id)}}>
                      <Image
                        source={
                          item.images?.length
                            ? { uri: item.images[0].url }
                            : require('@/assets/images/album-placeholder.png')
                        }
                        style={styles.smallalbum}
                      />
                      <View style={{ overflow: 'hidden', flex: 1 }}>
                        <TextTicker
                          // force it to measure full width
                          style={[styles.globalText, { fontFamily: 'Nunito-Bold'}]}
                          duration={5000}
                          loop
                          bounce={false}
                          repeatSpacer={50}
                          marqueeDelay={1000}
                        >
                          {item.name}
                        </TextTicker>

                        <GlobalText style={{ fontSize: 14, color: '#FFFAF0A0' }}>
                          by {item.artists.map((artist: { name: string }) => artist.name).join(', ')}
                        </GlobalText>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={{ color: '#888', fontStyle: 'italic' }}>no results</Text>
                )}
              </View>
              <View style={{ marginBottom: 15 }}>
                <GlobalText style={{ color: '#FFFAF0', fontSize: 18, fontFamily: 'Nunito-Bold', marginBottom: 10 }}>
                  artists
                </GlobalText>
                {searchResults.artists.length > 0 ? (
                  searchResults.artists.map((item: any) => (
                    <TouchableOpacity key={item.id} style={styles.albumView}>
                      <Image
                        source={
                          item.images?.length
                            ? { uri: item.images[0].url }
                            : require('@/assets/images/artist-placeholder.png')
                        }
                        style={styles.smallpfp}
                      />
                      <View>
                        <GlobalText style={{ fontSize: 16, fontFamily: 'Nunito-Bold' }}>{item.name}</GlobalText>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <Text style={{ color: '#888', fontStyle: 'italic' }}>no results</Text>
                )}
              </View>
            </View>
          )}

        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}

// const screenWidth = Dimensions.get('window').width;
// const textWidth = screenWidth - 40 - 55;

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
    marginBottom: 20,
  },
  searchBar: {
    fontFamily: 'Nunito-Bold',
    color: '#FFFAF0',
    fontSize: 16,
    flex: 1,
  },
  albumView: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
    gap: 10
  },
  smallpfp: {
    width: 40,
    height: 40,
    borderRadius: 100,
  },
  smallalbum: {
    width: 45,
    height: 45,
  },
  globalText: {
    fontFamily: 'Nunito-Regular', // Global font
    fontSize: 16,
    color: '#FFFAF0',
  },
});
