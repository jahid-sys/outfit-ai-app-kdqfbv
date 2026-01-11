
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { IconSymbol } from '@/components/IconSymbol';
import { LinearGradient } from 'expo-linear-gradient';
import { BACKEND_URL } from '@/utils/api';

type OutfitCategory = 'Sport' | 'Casual' | 'Professional' | 'Chill';

interface AnalysisResult {
  category: OutfitCategory;
  explanation: string;
  confidence?: string;
}

const categoryColors: Record<OutfitCategory, string[]> = {
  Sport: ['#FF6B6B', '#FF8E53'],
  Casual: ['#4ECDC4', '#44A08D'],
  Professional: ['#667EEA', '#764BA2'],
  Chill: ['#F093FB', '#F5576C'],
};

const categoryIcons: Record<OutfitCategory, string> = {
  Sport: 'fitness-center',
  Casual: 'weekend',
  Professional: 'work',
  Chill: 'self-improvement',
};

export default function CameraScreen() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Camera permission is needed to take photos of your outfits.'
      );
      return false;
    }
    return true;
  };

  const takePhoto = async () => {
    console.log('Taking photo...');
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      console.log('Camera result:', result);

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setResult(null);
        console.log('Image selected:', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const pickImage = async () => {
    console.log('Picking image from library...');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      console.log('Image picker result:', result);

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setResult(null);
        console.log('Image selected:', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const analyzeOutfit = async () => {
    if (!selectedImage) {
      Alert.alert('No Image', 'Please take or select a photo first.');
      return;
    }

    console.log('[Camera] Starting outfit analysis...');
    console.log('[Camera] Backend URL:', BACKEND_URL);
    setAnalyzing(true);
    setResult(null);

    try {
      // Backend Integration: POST /api/analyze-outfit
      // Accepts multipart form data with 'image' field
      // Returns: { category: string, explanation: string, confidence: string }
      
      const formData = new FormData();
      
      // Create file object for the image
      const filename = selectedImage.split('/').pop() || 'outfit.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      
      console.log('[Camera] Image details:', { filename, type, uri: selectedImage });
      
      formData.append('image', {
        uri: selectedImage,
        name: filename,
        type: type,
      } as any);

      console.log('[Camera] Sending request to:', `${BACKEND_URL}/api/analyze-outfit`);
      const response = await fetch(`${BACKEND_URL}/api/analyze-outfit`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      console.log('[Camera] Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Camera] Backend error:', errorText);
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('[Camera] Analysis result:', data);
      
      // Validate response structure
      if (!data.category || !data.explanation) {
        console.error('[Camera] Invalid response structure:', data);
        throw new Error('Invalid response from server');
      }
      
      setResult(data);
    } catch (error) {
      console.error('[Camera] Error analyzing outfit:', error);
      Alert.alert(
        'Analysis Failed',
        error instanceof Error ? error.message : 'Could not analyze the outfit. Please try again.'
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    console.log('Resetting...');
    setSelectedImage(null);
    setResult(null);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Outfit Analyzer',
          headerStyle: {
            backgroundColor: '#1a1a2e',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>👔 Outfit Analyzer</Text>
          <Text style={styles.subtitle}>
            Take a photo of your outfit and get style suggestions
          </Text>
        </View>

        {/* Image Display */}
        {selectedImage ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: selectedImage }} style={styles.image} />
            <TouchableOpacity style={styles.resetButton} onPress={reset}>
              <IconSymbol
                ios_icon_name="xmark.circle.fill"
                android_material_icon_name="cancel"
                size={32}
                color="#fff"
              />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.placeholderContainer}>
            <IconSymbol
              ios_icon_name="camera.fill"
              android_material_icon_name="photo-camera"
              size={80}
              color="#666"
            />
            <Text style={styles.placeholderText}>No photo selected</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.cameraButton]}
            onPress={takePhoto}
          >
            <IconSymbol
              ios_icon_name="camera.fill"
              android_material_icon_name="photo-camera"
              size={24}
              color="#fff"
            />
            <Text style={styles.buttonText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.galleryButton]}
            onPress={pickImage}
          >
            <IconSymbol
              ios_icon_name="photo.fill"
              android_material_icon_name="photo-library"
              size={24}
              color="#fff"
            />
            <Text style={styles.buttonText}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>

        {/* Analyze Button */}
        {selectedImage && !result && (
          <TouchableOpacity
            style={[styles.analyzeButton, analyzing && styles.analyzeButtonDisabled]}
            onPress={analyzeOutfit}
            disabled={analyzing}
          >
            {analyzing ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.analyzeButtonText}>Analyzing...</Text>
              </>
            ) : (
              <>
                <IconSymbol
                  ios_icon_name="sparkles"
                  android_material_icon_name="auto-awesome"
                  size={24}
                  color="#fff"
                />
                <Text style={styles.analyzeButtonText}>Analyze Outfit</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Result Display */}
        {result && (
          <View style={styles.resultContainer}>
            <LinearGradient
              colors={categoryColors[result.category]}
              style={styles.resultGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.resultHeader}>
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name={categoryIcons[result.category]}
                  size={48}
                  color="#fff"
                />
                <Text style={styles.resultCategory}>{result.category}</Text>
              </View>

              <View style={styles.resultBody}>
                <Text style={styles.resultLabel}>Analysis:</Text>
                <Text style={styles.resultExplanation}>{result.explanation}</Text>
                
                {result.confidence && (
                  <View style={styles.confidenceContainer}>
                    <Text style={styles.confidenceLabel}>Confidence:</Text>
                    <Text style={styles.confidenceValue}>{result.confidence}</Text>
                  </View>
                )}
              </View>
            </LinearGradient>

            {/* Category Legend */}
            <View style={styles.legendContainer}>
              <Text style={styles.legendTitle}>Style Categories:</Text>
              <View style={styles.legendGrid}>
                {(['Sport', 'Casual', 'Professional', 'Chill'] as OutfitCategory[]).map((cat) => (
                  <View key={cat} style={styles.legendItem}>
                    <LinearGradient
                      colors={categoryColors[cat]}
                      style={styles.legendBadge}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <IconSymbol
                        ios_icon_name="checkmark"
                        android_material_icon_name={categoryIcons[cat]}
                        size={16}
                        color="#fff"
                      />
                    </LinearGradient>
                    <Text style={styles.legendText}>{cat}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Info Section */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>How it works:</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoNumber}>1</Text>
            <Text style={styles.infoText}>Take a photo or choose from gallery</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoNumber}>2</Text>
            <Text style={styles.infoText}>Tap &quot;Analyze Outfit&quot; button</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoNumber}>3</Text>
            <Text style={styles.infoText}>Get AI-powered style suggestions</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1e',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  resetButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 4,
  },
  placeholderContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 20,
    backgroundColor: '#1a1a2e',
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  placeholderText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  cameraButton: {
    backgroundColor: '#667EEA',
  },
  galleryButton: {
    backgroundColor: '#4ECDC4',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B6B',
    paddingVertical: 18,
    borderRadius: 12,
    marginBottom: 24,
    gap: 8,
  },
  analyzeButtonDisabled: {
    opacity: 0.6,
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultContainer: {
    marginBottom: 24,
  },
  resultGradient: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  resultHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  resultCategory: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  resultBody: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    opacity: 0.8,
    marginBottom: 8,
  },
  resultExplanation: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  confidenceLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    opacity: 0.8,
    marginRight: 8,
  },
  confidenceValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  legendContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendText: {
    fontSize: 14,
    color: '#999',
  },
  infoContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#667EEA',
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 32,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
  },
});
