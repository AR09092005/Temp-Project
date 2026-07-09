import { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { classifyImage } from '@/lib/inference';

export default function ScanScreen() {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing] = useState<CameraType>('back');
  const [analysing, setAnalysing] = useState(false);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || analysing) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAnalysing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (!photo) return;

      const prediction = await classifyImage(photo.uri);
      router.push({
        pathname: '/result',
        params: {
          imageUri: photo.uri,
          label: prediction.label,
          food: prediction.food,
          state: prediction.state,
          confidence: String(prediction.confidence),
          capturedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error('Classification failed:', err);
    } finally {
      setAnalysing(false);
    }
  }, [analysing]);

  const handlePickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;
    setAnalysing(true);
    try {
      const prediction = await classifyImage(uri);
      router.push({
        pathname: '/result',
        params: {
          imageUri: uri,
          label: prediction.label,
          food: prediction.food,
          state: prediction.state,
          confidence: String(prediction.confidence),
          capturedAt: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error('Classification failed:', err);
    } finally {
      setAnalysing(false);
    }
  }, []);

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionBody}>
          FreshScan uses your camera to photograph food. Nothing is sent without your consent.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonLabel}>Allow camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
        {/* Viewfinder frame */}
        <View style={styles.overlay}>
          <View style={styles.frameContainer}>
            <Text style={styles.hint}>Point at a fruit or vegetable</Text>
            <View style={styles.frame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity style={styles.galleryButton} onPress={handlePickImage}>
              <Text style={styles.galleryLabel}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shutterButton, analysing && styles.shutterDisabled]}
              onPress={handleCapture}
              disabled={analysing}
            >
              {analysing ? (
                <ActivityIndicator color="#0F1A0F" />
              ) : (
                <View style={styles.shutterInner} />
              )}
            </TouchableOpacity>

            <View style={styles.galleryButton} />
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const CORNER = 24;
const CORNER_BORDER = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F1A0F' },
  camera: { flex: 1 },

  permissionContainer: {
    flex: 1,
    backgroundColor: '#0F1A0F',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  permissionTitle: { color: '#E8F5E2', fontSize: 22, fontWeight: '600', marginBottom: 12 },
  permissionBody: { color: '#8AAF84', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  permissionButton: {
    marginTop: 32,
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  permissionButtonLabel: { color: '#0F1A0F', fontSize: 16, fontWeight: '700' },

  overlay: { flex: 1, justifyContent: 'space-between' },
  frameContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  hint: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  frame: {
    width: 260,
    height: 260,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: '#4CAF50',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_BORDER, borderLeftWidth: CORNER_BORDER },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_BORDER, borderRightWidth: CORNER_BORDER },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_BORDER, borderLeftWidth: CORNER_BORDER },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_BORDER, borderRightWidth: CORNER_BORDER },

  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
    paddingTop: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  galleryButton: { width: 56, alignItems: 'center' },
  galleryLabel: { color: '#fff', fontSize: 13 },
  shutterButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  shutterDisabled: { opacity: 0.5 },
  shutterInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#fff',
  },
});
