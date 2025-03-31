import React, { useState } from 'react';
import { View, Text, ScrollView, Dimensions, TextInput, StyleSheet, TouchableWithoutFeedback, Keyboard, Image } from 'react-native';
import Nav from './Nav';
import GlobalText from './GlobalText';

export default function Trending() {
  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
    <View style={{ flex: 1, backgroundColor: '#111111' }}>
      <View style={{ padding: 20}}>
        <GlobalText style={{ color: '#E7BC10', fontSize: 32, marginTop: 50, fontWeight: '800' }}>
          recrd
        </GlobalText>

        <GlobalText style={{ color: '#FFFAF0', fontSize: 18, marginTop: 20, marginBottom: 20, fontWeight: '800' }}>
          trending
        </GlobalText>

        <ScrollView>
            <View>
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10}}>
                    <Image source={require('@/assets/images/placeholder_album.png')} style={{width: 60, height: 60}}/>
                    <View>
                        <GlobalText style={{fontSize: 16, fontWeight:'bold'}}>Mr. Morale and the Big Steppers</GlobalText>
                        <GlobalText style={{fontSize: 14, color: '#FFFAF0A0'}}>by Kendrick Lamar</GlobalText>
                    </View>
                </View>
            </View>

            <GlobalText style={{ color: '#FFFAF0', fontSize: 18, marginTop: 20, marginBottom: 20, fontWeight: '800' }}>
                by genre
            </GlobalText>
            <View style={{flexWrap: 'wrap', flexDirection: 'row', gap: 10}}>
                <View style={[styles.genreTile, {backgroundColor: "#5810E7"}]}>
                    <GlobalText style={{marginTop: "auto", marginLeft: "auto", fontSize: 24, fontWeight:'bold'}}>rap</GlobalText>
                </View>
                <View style={[styles.genreTile, {backgroundColor: "#E75F10"}]}>
                    <GlobalText style={{marginTop: "auto", marginLeft: "auto", fontSize: 24, fontWeight:'bold'}}>pop</GlobalText>
                </View>
                <View style={[styles.genreTile, {backgroundColor: "#E71022"}]}>
                    <GlobalText style={{marginTop: "auto", marginLeft: "auto", fontSize: 24, fontWeight:'bold'}}>r&b</GlobalText>
                </View>
                <View style={[styles.genreTile, {backgroundColor: "#E7B510"}]}>
                    <GlobalText style={{marginTop: "auto", marginLeft: "auto", fontSize: 24, fontWeight:'bold'}}>indie</GlobalText>
                </View>
                <View style={[styles.genreTile, {backgroundColor: "#107CE7"}]}>
                    <GlobalText style={{marginTop: "auto", marginLeft: "auto", fontSize: 24, fontWeight:'bold'}}>country</GlobalText>
                </View>
                <View style={[styles.genreTile, {backgroundColor: "#CE10E7"}]}>
                    <GlobalText style={{marginTop: "auto", marginLeft: "auto", fontSize: 24, fontWeight:'bold'}}>hip-hop</GlobalText>
                </View>
            </View>
            <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 20}}>
                <GlobalText style={{height: 30, width: 100, backgroundColor: "#1e1e1e", textAlign: 'center', alignContent: 'center', borderRadius: 10}}>view all</GlobalText>
            </View>
        </ScrollView>
      </View>
      <Nav />
    </View>
    </TouchableWithoutFeedback>
  );
}

const screenWidth = Dimensions.get('window').width;
const genreTileWidth = screenWidth * 0.33 - 20;

const styles = StyleSheet.create({
    genreTile: {
        backgroundColor: '#FFFAF0A0',
        width: genreTileWidth,
        height: genreTileWidth,
        borderRadius: 10,
        padding: 5,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
});
