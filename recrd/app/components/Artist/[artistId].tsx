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

const { width } = Dimensions.get('window');
const IMAGE_SIZE = width - 80;

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
}

export default function ArtistPage() {
  const router = useRouter();
  const { artistId } = useLocalSearchParams<{ artistId: string }>();
  const [artist, setArtist] = useState<ArtistData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`http://${HOST_IP}:8000/artists/${artistId}`)
      .then(r => r.json())
      .then(data => setArtist(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [artistId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="chevron-left" size={32} color="#E7BC10" />
        </TouchableOpacity>
        <ActivityIndicator size="large" style={styles.activity} />
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
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Feather name="chevron-left" size={32} color="#E7BC10" />
        </TouchableOpacity>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Artist Image */}
          <View style={styles.coverWrapper}>
            <Image
              source={{ uri: artist.images[0]?.url }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          </View>

          {/* Name & Count */}
          <GlobalText style={styles.title}>{artist.name}</GlobalText>
          <GlobalText style={styles.subTitle}>
            {artist.albums.length} {artist.albums.length === 1 ? 'Album' : 'Albums'}
          </GlobalText>

          {/* Albums List */}
          <GlobalText style={styles.sectionHeader}>Albums</GlobalText>
          {artist.albums.map(album => (
            <TouchableOpacity
              key={album.id}
              onPress={() => router.push(`/components/Album/${album.id}`)}
            >
              <View style={styles.albumItem}>
                <Image
                  source={{ uri: album.images[0]?.url }}
                  style={styles.albumThumb}
                />
                <GlobalText style={styles.albumName}>{album.name}</GlobalText>
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
    alignSelf: 'center',
    marginTop: 20,
  },
  backButton: {
    marginLeft: 10,
    marginBottom: 10,
  },
  center: {
    flex: 1,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#111111',
    paddingTop: 70,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  coverWrapper: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    alignSelf: 'center',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 20,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontFamily: 'Nunito-Bold',
    fontSize: 24,
    color: '#FFFAF0',
    textAlign: 'center',
  },
  subTitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    color: '#FFFAF0A0',
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionHeader: {
    fontFamily: 'Nunito-Bold',
    fontSize: 18,
    color: '#FFFAF0',
    marginBottom: 10,
  },
  albumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  albumThumb: {
    width: 50,
    height: 50,
    borderRadius: 4,
  },
  albumName: {
    fontFamily: 'Nunito-Regular',
    fontSize: 16,
    color: '#FFFAF0',
    flexShrink: 1,
  },
});
