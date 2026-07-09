import { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CLASS_NAMES } from '@/lib/labels';
import { submitFeedback } from '@/lib/api';

type FeedbackState = 'pending' | 'submitted';

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
  const [feedbackState, setFeedbackState] = useState<FeedbackState>('pending');
  const [correcting, setCorrecting] = useState(false);

  const handleConfirm = useCallback(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setFeedbackState('submitted');
    await submitFeedback({
      imageUri: params.imageUri,
      predictedLabel: params.label,
      confirmedLabel: params.label,
      confidence,
      capturedAt: params.capturedAt,
    });
  }, [params, confidence]);

  const handleCorrect = useCallback(async (correctLabel: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFeedbackState('submitted');
    setCorrecting(false);
    await submitFeedback({
      imageUri: params.imageUri,
      predictedLabel: params.label,
      confirmedLabel: correctLabel,
      confidence,
      capturedAt: params.capturedAt,
    });
  }, [params, confidence]);

  const foodName = (params.food ?? '').replace(/\b\w/g, (c) => c.toUpperCase());
  const confidencePct = Math.round(confidence * 100);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      bounces={false}
    >
      {/* Image */}
      <Image source={{ uri: params.imageUri }} style={styles.image} resizeMode="cover" />

      {/* Verdict banner */}
      <View style={[styles.verdict, isFresh ? styles.verdictFresh : styles.verdictRotten]}>
        <Text style={styles.verdictEmoji}>{isFresh ? '✓' : '✕'}</Text>
        <View>
          <Text style={styles.verdictFood}>{foodName}</Text>
          <Text style={styles.verdictState}>{isFresh ? 'Fresh' : 'Spoiled'}</Text>
        </View>
        <View style={styles.confidencePill}>
          <Text style={styles.confidenceText}>{confidencePct}%</Text>
        </View>
      </View>

      {/* Confidence bar */}
      <View style={styles.barContainer}>
        <Text style={styles.barLabel}>Confidence</Text>
        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              { width: `${confidencePct}%` },
              isFresh ? styles.barFresh : styles.barRotten,
            ]}
          />
        </View>
        <Text style={styles.barPct}>{confidencePct}%</Text>
      </View>

      {/* Feedback section */}
      <View style={styles.feedbackSection}>
        {feedbackState === 'pending' && !correcting && (
          <>
            <Text style={styles.feedbackQuestion}>Was this correct?</Text>
            <View style={styles.feedbackButtons}>
              <TouchableOpacity style={styles.btnConfirm} onPress={handleConfirm}>
                <Text style={styles.btnConfirmLabel}>Yes, correct</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnCorrect}
                onPress={() => setCorrecting(true)}
              >
                <Text style={styles.btnCorrectLabel}>No, fix it</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {correcting && (
          <>
            <Text style={styles.feedbackQuestion}>What should it be?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.labelPills}>
                {CLASS_NAMES.map((name) => (
                  <TouchableOpacity
                    key={name}
                    style={[
                      styles.labelPill,
                      name === params.label && styles.labelPillCurrent,
                    ]}
                    onPress={() => handleCorrect(name)}
                  >
                    <Text style={styles.labelPillText}>
                      {name.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity onPress={() => setCorrecting(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}

        {feedbackState === 'submitted' && (
          <View style={styles.thankYou}>
            <Text style={styles.thankYouText}>Thanks — feedback recorded.</Text>
            <Text style={styles.thankYouSub}>
              Your correction helps improve future predictions.
            </Text>
          </View>
        )}
      </View>

      {/* Back */}
      <TouchableOpacity style={styles.scanAgain} onPress={() => router.back()}>
        <Text style={styles.scanAgainLabel}>Scan another item</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1A0F' },
  content: { paddingBottom: 48 },

  image: { width: '100%', height: 320 },

  verdict: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 20,
  },
  verdictFresh: { backgroundColor: '#1A2E1A' },
  verdictRotten: { backgroundColor: '#2E1A1A' },
  verdictEmoji: { fontSize: 28 },
  verdictFood: { color: '#E8F5E2', fontSize: 22, fontWeight: '700' },
  verdictState: { color: '#8AAF84', fontSize: 14, marginTop: 2 },
  confidencePill: {
    marginLeft: 'auto',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  confidenceText: { color: '#E8F5E2', fontSize: 13, fontWeight: '600' },

  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  barLabel: { color: '#8AAF84', fontSize: 12, width: 72 },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
  barFresh: { backgroundColor: '#4CAF50' },
  barRotten: { backgroundColor: '#E57373' },
  barPct: { color: '#8AAF84', fontSize: 12, width: 32, textAlign: 'right' },

  feedbackSection: {
    marginTop: 24,
    marginHorizontal: 20,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 20,
  },
  feedbackQuestion: {
    color: '#E8F5E2',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  feedbackButtons: { flexDirection: 'row', gap: 12 },
  btnConfirm: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnConfirmLabel: { color: '#0F1A0F', fontWeight: '700', fontSize: 15 },
  btnCorrect: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnCorrectLabel: { color: '#E8F5E2', fontWeight: '600', fontSize: 15 },

  labelPills: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  labelPill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  labelPillCurrent: { backgroundColor: 'rgba(76,175,80,0.15)', borderWidth: 1, borderColor: '#4CAF50' },
  labelPillText: { color: '#E8F5E2', fontSize: 13 },
  cancelText: { color: '#8AAF84', marginTop: 14, fontSize: 14, textAlign: 'center' },

  thankYou: { alignItems: 'center', paddingVertical: 8 },
  thankYouText: { color: '#4CAF50', fontSize: 16, fontWeight: '600' },
  thankYouSub: { color: '#8AAF84', fontSize: 13, marginTop: 6, textAlign: 'center' },

  scanAgain: {
    margin: 20,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  scanAgainLabel: { color: '#E8F5E2', fontSize: 15, fontWeight: '600' },
});
