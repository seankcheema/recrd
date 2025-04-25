// app/components/Artist/[artistId].tsx
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import GlobalText from '../GlobalText';
import { Feather } from '@expo/vector-icons';
import { HOST_IP } from '@env';
import TextTicker from 'react-native-text-ticker';

const { width } = Dimensions.get('window');
const COVER_SIZE = width - 80;

interface Album {
  id: string;
  name: string;
  images: { url: string }[];
}

interface ArtistData {
  id: string;
  name: string;
  images: { url: string }[];
  albums: Album[];
  dominant_color: string;
}

export default function ArtistPage() {
  const router = useRouter();
  const { artistId } = useLocalSearchParams<{ artistId: string }>();
  const [artist, setArtist] = useState<ArtistData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`http://${HOST_IP}:8000/artists/${artistId}`)
      .then(res => res.json())
      .then(data => setArtist(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [artistId]);

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
  if (!artist) {
    return (
      <View style={styles.center}>
        <GlobalText>Artist not found.</GlobalText>
      </View>
    );
  }

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View style={styles.screen}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 10 }}>
          <Feather name="chevron-left" size={32} color="#E7BC10" />
        </TouchableOpacity>
        <ScrollView style={{ padding: 20 }} contentContainerStyle={{ paddingBottom: 80 }}>
          <View style={styles.coverWrapper}>
            <View
              style={[
                styles.coverShadow,
                { shadowColor: artist.dominant_color }
              ]}
            >
              <Image
                source={{ uri: artist.images[0]?.url }}
                style={styles.coverImage}
                resizeMode="cover"
              />
            </View>
          </View>

          <View style={{ paddingHorizontal: 20 }}>
            <GlobalText style={styles.title}>{artist.name}</GlobalText>
            
            <View style={{ flexDirection: 'row', gap: 4, marginTop: 2 }}>
              <GlobalText style={{ fontSize: 12 }}>
                {artist.albums.length}
              </GlobalText>
              <GlobalText style={{ fontSize: 12 }}>
                albums
              </GlobalText>
            </View>
          </View>

          <GlobalText style={styles.sectionHeader}>albums</GlobalText>
          {artist.albums.map(album => (
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
                        insert average rating here
                    </GlobalText>
                </View>
            </View>
        </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#111111',
    paddingTop: 70,
    paddingBottom: 100,
    justifyContent: 'center',
  },
  activity: {
    position: 'absolute',
    top: '50%',
    left: '50%',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111111' },
  screen: { flex: 1, backgroundColor: '#111111', paddingTop: 70 },
  backButton: { marginLeft: 10, marginBottom: 20 },
  scroll: { flex: 1, paddingHorizontal: 20 },
  content: { paddingBottom: 80 },
  coverWrapper: {
    width: COVER_SIZE,
    height: COVER_SIZE,
    alignSelf: 'center',
    marginBottom: 5,
    marginTop: 20,
  },

  coverShadow: {
    flex: 1,
    backgroundColor: '#111111',
    // iOS
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    // Android
    elevation: 8,
  },
  coverImage: {
    flex: 1,
  },
  metaContainer: { paddingHorizontal: 20, marginBottom: 10 },
  title: {
    fontFamily: 'Nunito-Bold',
    fontSize: 20,
    color: '#FFFAF0',
  },
  sectionHeader: {
    fontFamily: 'Nunito-Bold',
    fontSize: 18,
    color: '#FFFAF0',
    marginTop: 15,
    marginBottom: 10,
  },
  globalText: {
    fontFamily: 'Nunito-Regular', // Global font
    fontSize: 16,
    color: '#FFFAF0',
  },
});
