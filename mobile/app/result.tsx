import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CLASS_NAMES } from '@/lib/labels';
import { submitFeedback } from '@/lib/api';

const { width: SCREEN_W } = Dimensions.get('window');

type FeedbackState = 'pending' | 'submitted';

const FOOD_EMOJI: Record<string, string> = {
  apple: '🍎',
  banana: '🍌',
  orange: '🍊',
  tomato: '🍅',
  potato: '🥔',
  bread: '🍞',
};

export default function ResultScreen() {
  const params = useLocalSearchParams<{
    imageUri: string;
    label: string;
    food: string;
    state: string;
    confidence: string;
    capturedAt: string;
  }>();

  const confidence = parseFloat(params.confidence ?? '0');
  const isFresh = params.state === 'fresh';
  const confidencePct = Math.round(confidence * 100);
  const foodName = (params.food ?? '').replace(/\b\w/g, (c) => c.toUpperCase());
  const emoji = FOOD_EMOJI[params.food ?? ''] ?? '🥦';

  const [feedbackState, setFeedbackState] = useState<FeedbackState>('pending');
  const [correcting, setCorrecting] = useState(false);
  const [selectedCorrection, setSelectedCorrection] = useState<string | null>(null);

  // Animate confidence bar on mount
  const barAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(barAnim, {
        toValue: confidencePct / 100,
        duration: 700,
        delay: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  const handleConfirm = useCallback(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setFeedbackState('submitted');
    submitFeedback({
      imageUri: params.imageUri,
      predictedLabel: params.label,
      confirmedLabel: params.label,
      confidence,
      capturedAt: params.capturedAt,
    });
  }, [params, confidence]);

  const handleCorrect = useCallback(
    async (correctLabel: string) => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedCorrection(correctLabel);
      setFeedbackState('submitted');
      setCorrecting(false);
      submitFeedback({
        imageUri: params.imageUri,
        predictedLabel: params.label,
        confirmedLabel: correctLabel,
        confidence,
        capturedAt: params.capturedAt,
      });
    },
    [params, confidence]
  );

  const accentColor = isFresh ? '#4ABA4E' : '#E05C5C';
  const accentBg = isFresh ? 'rgba(74,186,78,0.10)' : 'rgba(224,92,92,0.10)';

  return (
    <View style={styles.root}>
      {/* Hero image */}
      <Image source={{ uri: params.imageUri }} style={styles.hero} resizeMode="cover" />

      {/* Gradient overlay at bottom of image */}
      <View style={styles.heroGradient} pointerEvents="none" />

      {/* Close button */}
      <SafeAreaView edges={['top']} style={styles.topRow}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Card sheet */}
      <Animated.View style={[styles.sheet, { opacity: fadeAnim }]}>
        <ScrollView
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Verdict row */}
          <View style={styles.verdictRow}>
            <View style={[styles.emojiBox, { backgroundColor: accentBg }]}>
              <Text style={styles.emojiText}>{emoji}</Text>
            </View>
            <View style={styles.verdictText}>
              <Text style={styles.foodName}>{foodName}</Text>
              <View style={styles.statePill}>
                <View style={[styles.stateDot, { backgroundColor: accentColor }]} />
                <Text style={[styles.stateLabel, { color: accentColor }]}>
                  {isFresh ? 'Fresh' : 'Spoiled'}
                </Text>
              </View>
            </View>
            <View style={styles.pctBox}>
              <Text style={[styles.pctValue, { color: accentColor }]}>{confidencePct}%</Text>
              <Text style={styles.pctSub}>confidence</Text>
            </View>
          </View>

          {/* Confidence bar */}
          <View style={styles.barSection}>
            <View style={styles.barTrack}>
              <Animated.View
                style={[
                  styles.barFill,
                  {
                    backgroundColor: accentColor,
                    width: barAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
            <View style={styles.barTicks}>
              {[0, 25, 50, 75, 100].map((v) => (
                <Text key={v} style={styles.barTick}>{v}%</Text>
              ))}
            </View>
          </View>

          <View style={styles.divider} />

          {/* Feedback */}
          <View style={styles.feedbackSection}>
            {feedbackState === 'pending' && !correcting && (
              <>
                <Text style={styles.feedbackHeading}>Was this correct?</Text>
                <Text style={styles.feedbackSub}>
                  Your answer improves future predictions for everyone.
                </Text>
                <View style={styles.feedbackBtns}>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnPrimary, { backgroundColor: accentColor }]}
                    onPress={handleConfirm}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.btnPrimaryLabel}>Yes, correct</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btn, styles.btnGhost]}
                    onPress={() => setCorrecting(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.btnGhostLabel}>No, fix it</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {correcting && (
              <>
                <Text style={styles.feedbackHeading}>What should it be?</Text>
                <Text style={styles.feedbackSub}>Select the correct label below.</Text>
                <View style={styles.labelGrid}>
                  {CLASS_NAMES.map((name) => {
                    const isActive = name === params.label;
                    const [f, s] = name.split('_');
                    return (
                      <TouchableOpacity
                        key={name}
                        style={[styles.labelChip, isActive && styles.labelChipActive]}
                        onPress={() => handleCorrect(name)}
                        activeOpacity={0.75}
                      >
                        <Text style={styles.labelChipEmoji}>{FOOD_EMOJI[f] ?? '🥦'}</Text>
                        <Text style={[styles.labelChipText, isActive && styles.labelChipTextActive]}>
                          {f.replace(/\b\w/, (c) => c.toUpperCase())}
                        </Text>
                        <Text style={[
                          styles.labelChipState,
                          s === 'fresh' ? styles.labelChipFresh : styles.labelChipRotten,
                        ]}>
                          {s}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity onPress={() => setCorrecting(false)} style={styles.cancelRow}>
                  <Text style={styles.cancelLabel}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}

            {feedbackState === 'submitted' && (
              <View style={styles.thankYou}>
                <View style={styles.checkCircle}>
                  <Text style={styles.checkMark}>✓</Text>
                </View>
                <Text style={styles.thankTitle}>Feedback recorded</Text>
                <Text style={styles.thankBody}>
                  {selectedCorrection
                    ? `Marked as "${selectedCorrection.replace('_', ' ')}". Thank you for the correction.`
                    : 'Thanks for confirming — helps us stay accurate.'}
                </Text>
              </View>
            )}
          </View>

          {/* Scan again */}
          <TouchableOpacity style={styles.scanAgainBtn} onPress={() => router.back()}>
            <Text style={styles.scanAgainLabel}>← Scan another item</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A110A' },

  hero: { width: SCREEN_W, height: 300 },
  heroGradient: {
    position: 'absolute',
    top: 220,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'transparent',
    // Pseudo-gradient via layered shadow (native gradient needs expo-linear-gradient)
    borderBottomWidth: 80,
    borderBottomColor: '#0A110A',
    borderLeftWidth: SCREEN_W / 2,
    borderRightWidth: SCREEN_W / 2,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    opacity: 0.6,
  },

  topRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  sheet: {
    flex: 1,
    backgroundColor: '#0F1A0F',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
  },
  sheetContent: { padding: 24, paddingBottom: 48 },

  verdictRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
  },
  emojiBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emojiText: { fontSize: 30 },
  verdictText: { flex: 1 },
  foodName: {
    color: '#E8F5E2',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  statePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  stateDot: { width: 7, height: 7, borderRadius: 4 },
  stateLabel: { fontSize: 14, fontWeight: '600' },
  pctBox: { alignItems: 'flex-end' },
  pctValue: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  pctSub: { color: '#5A7A56', fontSize: 11, marginTop: 2 },

  barSection: { marginBottom: 24 },
  barTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4 },
  barTicks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  barTick: { color: '#3A5A36', fontSize: 10 },

  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 24 },

  feedbackSection: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 20,
    marginBottom: 20,
  },
  feedbackHeading: {
    color: '#E8F5E2',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  feedbackSub: {
    color: '#5A7A56',
    fontSize: 13,
    marginBottom: 18,
    lineHeight: 19,
  },
  feedbackBtns: { flexDirection: 'row', gap: 10 },
  btn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnPrimary: {},
  btnPrimaryLabel: { color: '#0A110A', fontWeight: '700', fontSize: 15 },
  btnGhost: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  btnGhostLabel: { color: '#C8E5C4', fontWeight: '600', fontSize: 15 },

  labelGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  labelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  labelChipActive: {
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  labelChipEmoji: { fontSize: 16 },
  labelChipText: { color: '#C8E5C4', fontSize: 13, fontWeight: '600' },
  labelChipTextActive: { color: '#E8F5E2' },
  labelChipState: { fontSize: 11, fontWeight: '500' },
  labelChipFresh: { color: '#4ABA4E' },
  labelChipRotten: { color: '#E05C5C' },

  cancelRow: { marginTop: 14, alignItems: 'center' },
  cancelLabel: { color: '#5A7A56', fontSize: 14 },

  thankYou: { alignItems: 'center', paddingVertical: 8 },
  checkCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(74,186,78,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  checkMark: { color: '#4ABA4E', fontSize: 22, fontWeight: '700' },
  thankTitle: { color: '#E8F5E2', fontSize: 17, fontWeight: '700', marginBottom: 6 },
  thankBody: {
    color: '#5A7A56',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },

  scanAgainBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  scanAgainLabel: { color: '#7A9E76', fontSize: 15, fontWeight: '600' },
});
