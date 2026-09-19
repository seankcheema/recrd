// app/components/Entry/[entryId].tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GlobalText from '@/lib/GlobalText';
import ActivityPost from '@/lib/ActivityPost';
import { BAR_TAIL, Empty, FloatingBar, SectionHeader } from '@/lib/Screen';
import { Skeleton, SkeletonHeading, SkeletonPost } from '@/lib/Skeleton';
import { Glass } from '@/lib/Glass';
import { apiJson } from '@/lib/session';
import { relativeTime } from '@/lib/tiers';
import { colors, font, radius, spacing, NAV_HEIGHT } from '@/lib/theme';
import type { Comment, Entry } from '@/lib/types';

/** True while the software keyboard is on screen. */
function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setVisible(true)
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setVisible(false)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return visible;
}

export default function EntryPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const keyboardUp = useKeyboardVisible();
  const { entryId } = useLocalSearchParams<{ entryId: string }>();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // How much of the top the floating back bar covers.
  const [barHeight, setBarHeight] = useState(0);

  const load = useCallback(async () => {
    try {
      const [e, c] = await Promise.all([
        apiJson<Entry>(`/entries/${entryId}`),
        apiJson<Comment[]>(`/entries/${entryId}/comments`),
      ]);
      setEntry(e);
      setComments(c);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [entryId]);

  useEffect(() => {
    load();
  }, [load]);

  const post = async () => {
    const body = draft.trim();
    if (!body || posting) return;
    setPosting(true);
    try {
      setComments(
        await apiJson<Comment[]>(`/entries/${entryId}/comments`, {
          method: 'POST',
          body: JSON.stringify({ body }),
        })
      );
      setEntry((e) => (e ? { ...e, commentCount: e.commentCount + 1 } : e));
      setDraft('');
      Keyboard.dismiss();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPosting(false);
    }
  };

  const remove = async (commentId: string) => {
    try {
      await apiJson(`/comments/${commentId}`, { method: 'DELETE' });
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setEntry((e) => (e ? { ...e, commentCount: Math.max(0, e.commentCount - 1) } : e));
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.content, { paddingTop: barHeight + BAR_TAIL }]}
          scrollIndicatorInsets={{ top: barHeight + BAR_TAIL }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {loading ? (
            <>
              <SkeletonPost />
              <SkeletonHeading width={100} />
              {[0, 1].map((i) => (
                <View key={i} style={styles.commentRow}>
                  <Skeleton width={32} height={32} circle />
                  <View style={styles.loadingBubble}>
                    <Skeleton width="40%" height={12} />
                    <Skeleton width="85%" height={12} />
                  </View>
                </View>
              ))}
            </>
          ) : error && !entry ? (
            <Empty>{error}</Empty>
          ) : entry ? (
            <>
              <ActivityPost
                entry={entry}
                onChange={setEntry}
                onChanged={(removed) => (removed ? router.back() : load())}
              />

              <SectionHeader style={{ marginTop: spacing.lg }}>comments</SectionHeader>

              {comments.length === 0 ? (
                <Empty>no comments yet — say something.</Empty>
              ) : (
                comments.map((comment) => (
                  <View key={comment.id} style={styles.commentRow}>
                    <Pressable
                      onPress={() => router.push(`/components/User/${comment.author.id}`)}
                    >
                      <Image
                        source={
                          comment.author.avatarUrl
                            ? { uri: comment.author.avatarUrl }
                            : require('@/assets/images/placeholder_album.png')
                        }
                        style={styles.pfp}
                      />
                    </Pressable>
                    <Glass style={{ flex: 1 }} cornerRadius={radius.md} tone="clear">
                      <View style={styles.bubble}>
                        <View style={styles.bubbleHead}>
                          <GlobalText style={styles.commentAuthor}>
                            {comment.author.name}
                          </GlobalText>
                          <GlobalText style={styles.commentTime}>
                            {relativeTime(comment.createdAt)}
                          </GlobalText>
                          {comment.isMine && (
                            <Pressable onPress={() => remove(comment.id)} hitSlop={8}>
                              <Feather name="trash-2" size={14} color={colors.textFaint} />
                            </Pressable>
                          )}
                        </View>
                        <GlobalText style={styles.commentBody}>{comment.body}</GlobalText>
                      </View>
                    </Glass>
                  </View>
                ))
              )}

              {error ? <GlobalText style={styles.error}>{error}</GlobalText> : null}
            </>
          ) : null}
        </ScrollView>

        {entry && (
          <View
            style={[
              styles.composerWrap,
              { paddingBottom: keyboardUp ? spacing.sm : insets.bottom + NAV_HEIGHT },
            ]}
          >
            <View style={styles.composer}>
              <View style={styles.composerRow}>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="add a comment"
                  placeholderTextColor={colors.textFaint}
                  style={styles.input}
                  maxLength={500}
                  returnKeyType="send"
                  onSubmitEditing={post}
                />
                <Pressable onPress={post} disabled={posting || !draft.trim()} hitSlop={8}>
                  {posting ? (
                    <ActivityIndicator color={colors.gold} />
                  ) : (
                    <Feather
                      name="arrow-up-circle"
                      size={26}
                      color={draft.trim() ? colors.gold : colors.textFaint}
                    />
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Floats over the thread, which stays visible through it. */}
      <FloatingBar onHeightChange={setBarHeight}>
        <View
          style={[styles.header, { paddingTop: Math.max(insets.top, spacing.xl) + spacing.sm }]}
        >
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Glass style={styles.backGlass} cornerRadius={radius.pill}>
              <Feather name="chevron-left" size={22} color={colors.gold} />
            </Glass>
          </Pressable>
        </View>
      </FloatingBar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  backGlass: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  loadingBubble: {
    flex: 1,
    gap: spacing.sm,
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  pfp: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.bgLift,
  },
  bubble: {
    padding: spacing.md,
    gap: 4,
  },
  bubbleHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  commentAuthor: {
    fontSize: 13,
    fontFamily: font.bold,
    color: colors.text,
  },
  commentTime: {
    fontSize: 11,
    color: colors.textFaint,
    marginRight: 'auto',
  },
  commentBody: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 19,
  },
  composerWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  composer: {
    // A solid field rather than glass — text you are typing should sit on
    // something still.
    borderRadius: radius.pill,
    backgroundColor: colors.bgLift,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.edge,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
    gap: spacing.md,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontFamily: font.regular,
    fontSize: 14,
  },
  error: {
    color: colors.danger,
    fontSize: 12,
    marginTop: spacing.md,
  },
});
