import React, { useState } from 'react';
import { View, Text, ScrollView, Dimensions, TextInput, StyleSheet, TouchableWithoutFeedback, Keyboard, Image, TouchableOpacity } from 'react-native';
import Nav from './Nav';
import GlobalText from './GlobalText';

export default function Trending() {
    return (
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <View style={{ flex: 1, backgroundColor: '#111111', paddingTop: 70, paddingBottom: 100 }}>
                <ScrollView style={{ padding: 20, paddingTop: 0 }}>

                    <GlobalText style={{ color: '#E7BC10', fontSize: 32, fontWeight: '800' }}>
                        recrd
                    </GlobalText>
                    <GlobalText style={{ color: '#FFFAF0', fontSize: 18, marginTop: 20, marginBottom: 5, fontWeight: '800' }}>
                        trending
                    </GlobalText>
                    <TouchableOpacity>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 }}>
                            <Image source={require('@/assets/images/placeholder_album.png')} style={{ width: 60, height: 60 }} />
                            <View>
                                <GlobalText style={{ fontSize: 16, fontWeight: 'bold' }}>Mr. Morale and the Big Steppers</GlobalText>
                                <GlobalText style={{ fontSize: 14, color: '#FFFAF0A0' }}>by Kendrick Lamar</GlobalText>
                            </View>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 }}>
                            <Image source={require('@/assets/images/placeholder_album.png')} style={{ width: 60, height: 60 }} />
                            <View>
                                <GlobalText style={{ fontSize: 16, fontWeight: 'bold' }}>Mr. Morale and the Big Steppers</GlobalText>
                                <GlobalText style={{ fontSize: 14, color: '#FFFAF0A0' }}>by Kendrick Lamar</GlobalText>
                            </View>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 }}>
                            <Image source={require('@/assets/images/placeholder_album.png')} style={{ width: 60, height: 60 }} />
                            <View>
                                <GlobalText style={{ fontSize: 16, fontWeight: 'bold' }}>Mr. Morale and the Big Steppers</GlobalText>
                                <GlobalText style={{ fontSize: 14, color: '#FFFAF0A0' }}>by Kendrick Lamar</GlobalText>
                            </View>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 }}>
                            <Image source={require('@/assets/images/placeholder_album.png')} style={{ width: 60, height: 60 }} />
                            <View>
                                <GlobalText style={{ fontSize: 16, fontWeight: 'bold' }}>Mr. Morale and the Big Steppers</GlobalText>
                                <GlobalText style={{ fontSize: 14, color: '#FFFAF0A0' }}>by Kendrick Lamar</GlobalText>
                            </View>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 }}>
                            <Image source={require('@/assets/images/placeholder_album.png')} style={{ width: 60, height: 60 }} />
                            <View>
                                <GlobalText style={{ fontSize: 16, fontWeight: 'bold' }}>Mr. Morale and the Big Steppers</GlobalText>
                                <GlobalText style={{ fontSize: 14, color: '#FFFAF0A0' }}>by Kendrick Lamar</GlobalText>
                            </View>
                        </View>
                    </TouchableOpacity>

                    <GlobalText style={{ color: '#FFFAF0', fontSize: 18, marginTop: 15, marginBottom: 5, fontWeight: '800' }}>
                        by genre
                    </GlobalText>
                    <View style={{ flexWrap: 'wrap', flexDirection: 'row', justifyContent: 'space-between' }}>
                        <TouchableOpacity style={[styles.genreTile, { backgroundColor: "#5810E7", marginBottom: 10 }]}>
                            <GlobalText style={{ marginTop: "auto", marginLeft: "auto", fontSize: 24, fontWeight: 'bold' }}>rap</GlobalText>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.genreTile, { backgroundColor: "#E75F10" }]}>
                            <GlobalText style={{ marginTop: "auto", marginLeft: "auto", fontSize: 24, fontWeight: 'bold' }}>pop</GlobalText>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.genreTile, { backgroundColor: "#E71022" }]}>
                            <GlobalText style={{ marginTop: "auto", marginLeft: "auto", fontSize: 24, fontWeight: 'bold' }}>r&b</GlobalText>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.genreTile, { backgroundColor: "#E7B510" }]}>
                            <GlobalText style={{ marginTop: "auto", marginLeft: "auto", fontSize: 24, fontWeight: 'bold' }}>indie</GlobalText>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.genreTile, { backgroundColor: "#107CE7" }]}>
                            <GlobalText style={{ marginTop: "auto", marginLeft: "auto", fontSize: 24, fontWeight: 'bold' }}>country</GlobalText>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.genreTile, { backgroundColor: "#CE10E7" }]}>
                            <GlobalText style={{ marginTop: "auto", marginLeft: "auto", fontSize: 24, fontWeight: 'bold' }}>hip-hop</GlobalText>
                        </TouchableOpacity>
                    </View>
                    <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 15 }}>
                        <TouchableOpacity style={{ height: 30, width: 100, backgroundColor: "#1e1e1e", alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}>
                            <GlobalText>view all</GlobalText>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
                <Nav />
            </View>
        </TouchableWithoutFeedback>
    );
}

const screenWidth = Dimensions.get('window').width;
const genreTileWidth = ((screenWidth - 40) * 0.33) - 5;

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
