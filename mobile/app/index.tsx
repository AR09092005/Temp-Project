import { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { classifyImage } from '@/lib/inference';

export default function ScanScreen() {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing] = useState<CameraType>('back');
  const [analysing, setAnalysing] = useState(false);

  const navigate = useCallback(
    (uri: string, food: string, state: string, label: string, confidence: number) => {
      router.push({
        pathname: '/result',
        params: {
          imageUri: uri,
          label,
          food,
          state,
          confidence: String(confidence),
          capturedAt: new Date().toISOString(),
        },
      });
    },
    []
  );

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || analysing) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAnalysing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (!photo) return;
      const p = await classifyImage(photo.uri);
      navigate(photo.uri, p.food, p.state, p.label, p.confidence);
    } catch {
      Alert.alert('Scan failed', 'Could not analyse the image. Please try again.');
    } finally {
      setAnalysing(false);
    }
  }, [analysing, navigate]);

  const handlePickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const uri = result.assets[0].uri;
    setAnalysing(true);
    try {
      const p = await classifyImage(uri);
      navigate(uri, p.food, p.state, p.label, p.confidence);
    } catch {
      Alert.alert('Scan failed', 'Could not analyse the image. Please try again.');
    } finally {
      setAnalysing(false);
    }
  }, [navigate]);

  if (!permission) return <View style={styles.bg} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permScreen}>
        <StatusBar style="light" />
        <View style={styles.permIcon}>
          <Text style={styles.permIconText}>📷</Text>
        </View>
        <Text style={styles.permTitle}>Camera access needed</Text>
        <Text style={styles.permBody}>
          FreshScan photographs food items to check their freshness. Nothing leaves
          your device without your consent.
        </Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnLabel}>Allow camera</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.bg}>
      <StatusBar style="light" />
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />

      {/* Top bar */}
      <SafeAreaView edges={['top']} style={styles.topBar}>
        <Text style={styles.wordmark}>FreshScan</Text>
        <View style={styles.badge}>
          <View style={styles.badgeDot} />
          <Text style={styles.badgeLabel}>On-device AI</Text>
        </View>
      </SafeAreaView>

      {/* Viewfinder */}
      <View style={styles.viewfinder} pointerEvents="none">
        <Text style={styles.hint}>
          {analysing ? 'Analysing…' : 'Frame a fruit or vegetable'}
        </Text>
        <View style={styles.frame}>
          {(['TL', 'TR', 'BL', 'BR'] as const).map((pos) => (
            <View key={pos} style={[styles.corner, styles[`corner${pos}`]]} />
          ))}
          {analysing && (
            <View style={styles.scanLine} />
          )}
        </View>
      </View>

      {/* Bottom controls */}
      <SafeAreaView edges={['bottom']} style={styles.controls}>
        <TouchableOpacity style={styles.sideBtn} onPress={handlePickImage} disabled={analysing}>
          <Text style={styles.sideBtnIcon}>🖼</Text>
          <Text style={styles.sideBtnLabel}>Gallery</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shutter, analysing && styles.shutterBusy]}
          onPress={handleCapture}
          disabled={analysing}
          activeOpacity={0.8}
        >
          {analysing ? (
            <ActivityIndicator color="#0F1A0F" size="large" />
          ) : (
            <View style={styles.shutterRing}>
              <View style={styles.shutterCore} />
            </View>
          )}
        </TouchableOpacity>

        {/* Balance spacer */}
        <View style={styles.sideBtn} />
      </SafeAreaView>
    </View>
  );
}

const CORNER_SIZE = 28;
const CORNER_W = 3;

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: '#0A110A' },

  // Permission screen
  permScreen: {
    flex: 1,
    backgroundColor: '#0A110A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  permIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(74,186,78,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  permIconText: { fontSize: 36 },
  permTitle: {
    color: '#E8F5E2',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  permBody: {
    color: '#7A9E76',
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
  },
  permBtn: {
    marginTop: 36,
    backgroundColor: '#4ABA4E',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 14,
  },
  permBtnLabel: { color: '#0A110A', fontSize: 16, fontWeight: '700' },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  wordmark: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ABA4E',
  },
  badgeLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500' },

  // Viewfinder
  viewfinder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  hint: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.2,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    overflow: 'hidden',
  },
  frame: {
    width: 256,
    height: 256,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#4ABA4E',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_W, borderLeftWidth: CORNER_W, borderTopLeftRadius: 4 },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_W, borderRightWidth: CORNER_W, borderTopRightRadius: 4 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_W, borderLeftWidth: CORNER_W, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_W, borderRightWidth: CORNER_W, borderBottomRightRadius: 4 },
  scanLine: {
    position: 'absolute',
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(74,186,78,0.6)',
    top: '50%',
  },

  // Controls
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 36,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 12 : 20,
    backgroundColor: 'rgba(10,17,10,0.7)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  sideBtn: {
    width: 56,
    alignItems: 'center',
    gap: 4,
  },
  sideBtnIcon: { fontSize: 22 },
  sideBtnLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },

  shutter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4ABA4E',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  shutterBusy: { backgroundColor: 'rgba(255,255,255,0.85)' },
  shutterRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: 'rgba(0,0,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterCore: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#fff',
  },
});
