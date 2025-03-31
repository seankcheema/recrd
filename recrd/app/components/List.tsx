import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, TouchableWithoutFeedback, Keyboard } from 'react-native';
import Nav from './Nav';
import GlobalText from './GlobalText';
import { Feather } from '@expo/vector-icons';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
  };

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
    <View style={{ flex: 1, backgroundColor: '#111111' }}>
      <View style={{ padding: 20, paddingRight: 0 }}>
        <GlobalText style={{ color: '#E7BC10', fontSize: 32, marginTop: 50, fontWeight: '800' }}>
          recrd
        </GlobalText>

        <GlobalText style={{ color: '#FFFAF0', fontSize: 18, marginTop: 20, marginBottom: 20, fontWeight: '800' }}>
          my list
        </GlobalText>

        <ScrollView>
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10}}>
                <View style={[styles.rankingTag, {backgroundColor: '#6D3B99'}]}>
                    <GlobalText style={{fontSize: 14, fontWeight:'bold'}}>S-Tier</GlobalText>
                </View>
                <View style={{ marginLeft: 10, backgroundColor: '#FFFAF0A0', height: 1, flex: 1 }} />
            </View>

            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 10}}>
                <View style={[styles.rankingTag, {backgroundColor: '#993B3B'}]}>
                    <GlobalText style={{fontSize: 14, fontWeight:'bold'}}>A-Tier</GlobalText>
                </View>
                <View style={{ marginLeft: 10, backgroundColor: '#FFFAF0A0', height: 1, flex: 1 }} />
            </View>

            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 10}}>
                <View style={[styles.rankingTag, {backgroundColor: '#99573B'}]}>
                    <GlobalText style={{fontSize: 14, fontWeight:'bold'}}>B-Tier</GlobalText>
                </View>
                <View style={{ marginLeft: 10, backgroundColor: '#FFFAF0A0', height: 1, flex: 1 }} />
            </View>

            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 10}}>
                <View style={[styles.rankingTag, {backgroundColor: '#45993B'}]}>
                    <GlobalText style={{fontSize: 14, fontWeight:'bold'}}>C-Tier</GlobalText>
                </View>
                <View style={{ marginLeft: 10, backgroundColor: '#FFFAF0A0', height: 1, flex: 1 }} />
            </View>

            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 10}}>
                <View style={[styles.rankingTag, {backgroundColor: '#3B6499'}]}>
                    <GlobalText style={{fontSize: 14, fontWeight:'bold'}}>D-Tier</GlobalText>
                </View>
                <View style={{ marginLeft: 10, backgroundColor: '#FFFAF0A0', height: 1, flex: 1 }} />
            </View>
        </ScrollView>
      </View>
      <Nav />
    </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  rankingTag: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 60,
    height: 20,
    borderRadius: 5,
  },
});
