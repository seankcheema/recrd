// app/components/Genre/[genreName].tsx
import React, { useEffect, useState } from 'react';
import {
    View,
    Image,
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Dimensions,
    TouchableWithoutFeedback,
    TouchableOpacity,
    Keyboard
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';    // ← useLocalSearchParams, not useSearchParams
import GlobalText from '../GlobalText';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { HOST_IP } from '@env';
import TextTicker from 'react-native-text-ticker';

export default function GenrePage() {
    const router = useRouter();
    const { genreName } = useLocalSearchParams<{ genreName: string }>();
    const [loading, setLoading] = useState(true);
    const [searchResults, setSearchResults] = useState<any>(null);

    useEffect(() => {
        
        fetch(`http://${HOST_IP}:8000/trending_albums/?limit=10&genre=${genreName}`)
            .then((r) => r.json())
            .then((data) => setSearchResults(data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [genreName]);

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: '#111111', paddingTop: 70, paddingBottom: 100 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 20, marginLeft: 10 }}>
                        <Feather name="chevron-left" size={32} color="#E7BC10" />
                    </TouchableOpacity>

                    <ActivityIndicator style={{ position: "absolute", top: "50%", right: "50%" }} />

            </View>
        );
    }
    if (!genreName) {
        return (
            <View>
                <GlobalText>Genre not found.</GlobalText>
            </View>
        );
    }
    return (
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <View style={{ flex: 1, backgroundColor: '#111111', paddingTop: 70}}>
            <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 20, marginLeft: 10 }}>
                        <Feather name="chevron-left" size={32} color="#E7BC10" />
                    </TouchableOpacity>

                <ScrollView style={{ padding: 20, paddingTop: 0 }} contentContainerStyle={{ paddingBottom: 80 }}>

                    {(searchResults.length > 0) ? (
                        searchResults.map((album: any) => (
                            <TouchableOpacity key={album.id} onPress={() => router.push(`/components/Album/${album.id}`)}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 }}>
                                    <Image source={{ uri: album.images[0].url }} style={{ width: 60, height: 60 }} />
                                    <View style={{ overflow: 'hidden', flex: 1 }}>
                                        <TextTicker
                                            // force it to measure full width
                                            style={[styles.globalText, { fontFamily: 'Nunito-Bold' }]}
                                            duration={5000}
                                            loop
                                            bounce={false}
                                            repeatSpacer={50}
                                            marqueeDelay={1000}
                                        >
                                            {album.name}
                                        </TextTicker>

                                        <GlobalText style={{ fontSize: 14, color: '#FFFAF0A0' }}>
                                            by {album.artists.map((artist: { name: string }) => artist.name).join(', ')}
                                        </GlobalText>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <GlobalText style={{ color: '#FFFAF0A0', fontSize: 16 }}>no results found</GlobalText>
                    )}

                </ScrollView>
            </View>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    globalText: {
        fontFamily: 'Nunito-Regular', // Global font
        fontSize: 16,
        color: '#FFFAF0',
    },
});
