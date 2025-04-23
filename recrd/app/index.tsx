import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, TouchableWithoutFeedback, Keyboard, TouchableOpacity, Image } from 'react-native';
import Nav from './components/Nav';
import GlobalText from './components/GlobalText';
import { Feather } from '@expo/vector-icons';

export default function Home() {
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

          <GlobalText style={{ color: '#FFFAF0', fontSize: 18, marginTop: 20, marginBottom: 10, fontWeight: '800' }}>
            activity
          </GlobalText>

          <View style={{ flexDirection: 'column', width: '100%'}}>
            <TouchableOpacity style={styles.postView}>
                <Image source={require('@/assets/images/placeholder_album.png')} style={styles.pfp} />
                <GlobalText style={{ color: '#FFFAF0', fontSize: 16, fontWeight: 'bold', marginLeft: 10 }}>
                  user name
                </GlobalText>
                <GlobalText style={{ color: '#FFFAF0', fontSize: 14, marginLeft: 5 }}>
                  listened to
                </GlobalText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.postView}>
                <Image source={require('@/assets/images/placeholder_album.png')} style={styles.album} />
                <View>
                  <GlobalText style={{ color: '#FFFAF0', fontSize: 16, fontWeight: 'bold', marginLeft: 10 }}>
                    Mr. Morale and the Big Steppers
                  </GlobalText>
                  <GlobalText style={{ color: '#FFFAF0A0', fontSize: 14, marginLeft: 10 }}>
                    by Kendrick Lamar
                  </GlobalText>
                </View>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 20}}>
                <TouchableOpacity>
                  <Feather name="heart" size={28} color="#FFFAF0" />
                </TouchableOpacity>
                <TouchableOpacity>
                  <Feather name="message-circle" size={28} color="#FFFAF0" />
                </TouchableOpacity>
            </View>
            
            <View
              style={{
                height: StyleSheet.hairlineWidth,
                backgroundColor: '#FFFAF01A',
                marginVertical: 10,
              }}
            />

            
          </View>


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
  postView: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
  },
  pfp: {
    width: 40,
    height: 40,
    borderRadius: 100,
  },
  album: {
    width: 50,
    height: 50,
  }
});
