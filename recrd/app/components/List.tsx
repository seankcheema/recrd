import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Image, StyleSheet, TouchableWithoutFeedback, Keyboard } from 'react-native';
import GlobalText from './GlobalText';

export default function List() {
  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View style={{ flex: 1, backgroundColor: '#111111', paddingTop: 70}}>
        <ScrollView style={{ padding: 20, paddingTop: 0 }} contentContainerStyle={{ paddingBottom: 80 }}>

          <GlobalText style={{ color: '#E7BC10', fontSize: 32, fontFamily: 'Nunito-Bold' }}>
            recrd
          </GlobalText>

          <GlobalText style={{ color: '#FFFAF0', fontSize: 18, marginTop: 20, marginBottom: 10, fontFamily: 'Nunito-Bold' }}>
            my list
          </GlobalText>

          <ScrollView>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <View style={[styles.rankingTag, { backgroundColor: '#6D3B99' }]}>
                <GlobalText style={{ fontSize: 14, fontFamily: 'Nunito-Bold'}}>S-Tier</GlobalText>
              </View>
              <View style={{ marginLeft: 10, backgroundColor: '#FFFAF0A0', height: 1, flex: 1 }} />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 }}>
              <Image source={require('@/assets/images/placeholder_album.png')} style={{ width: 60, height: 60 }} />
              <View>
                <GlobalText style={{ fontSize: 16, fontFamily: 'Nunito-Bold' }}>Mr. Morale and the Big Steppers</GlobalText>
                <GlobalText style={{ fontSize: 14, color: '#FFFAF0A0' }}>by Kendrick Lamar</GlobalText>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 10 }}>
              <View style={[styles.rankingTag, { backgroundColor: '#993B3B' }]}>
                <GlobalText style={{ fontSize: 14, fontFamily: 'Nunito-Bold' }}>A-Tier</GlobalText>
              </View>
              <View style={{ marginLeft: 10, backgroundColor: '#FFFAF0A0', height: 1, flex: 1 }} />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 10 }}>
              <View style={[styles.rankingTag, { backgroundColor: '#99573B' }]}>
                <GlobalText style={{ fontSize: 14, fontFamily: 'Nunito-Bold' }}>B-Tier</GlobalText>
              </View>
              <View style={{ marginLeft: 10, backgroundColor: '#FFFAF0A0', height: 1, flex: 1 }} />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 10 }}>
              <View style={[styles.rankingTag, { backgroundColor: '#45993B' }]}>
                <GlobalText style={{ fontSize: 14, fontFamily: 'Nunito-Bold' }}>C-Tier</GlobalText>
              </View>
              <View style={{ marginLeft: 10, backgroundColor: '#FFFAF0A0', height: 1, flex: 1 }} />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 10 }}>
              <View style={[styles.rankingTag, { backgroundColor: '#3B6499' }]}>
                <GlobalText style={{ fontSize: 14, fontFamily: 'Nunito-Bold' }}>D-Tier</GlobalText>
              </View>
              <View style={{ marginLeft: 10, backgroundColor: '#FFFAF0A0', height: 1, flex: 1 }} />
            </View>
          </ScrollView>
        </ScrollView>

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
