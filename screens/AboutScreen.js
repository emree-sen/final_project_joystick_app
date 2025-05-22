import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const AboutScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← Geri</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Hakkında</Text>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Image
            source={require('../assets/acilis.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />

          <Text style={styles.appTitle}>Joystick Kontrol Uygulaması</Text>
          <Text style={styles.version}>Sürüm 1.0.0</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Proje Hakkında</Text>
            <Text style={styles.aboutText}>
              Bu uygulama, ESP32 tabanlı bir Stewart platformunu kontrol etmek için
              tasarlanmış bir bitirme projesi çalışmasıdır. Bluetooth Low Energy (BLE)
              üzerinden ESP32 Arduino modülüne bağlanır ve joystick hareketlerini kullanarak
              platformdaki motorları kontrol etmenizi sağlar.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Özellikler</Text>
            <View style={styles.featureItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.featureText}>BLE üzerinden ESP32 ile kablosuz iletişim</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.featureText}>Hassas joystick kontrolü</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.featureText}>Motor açı hesaplamaları</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.featureText}>Test modu ile donanım olmadan simülasyon</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.featureText}>Detaylı log ekranı</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Geliştiriciler</Text>
            <Text style={styles.aboutText}>
              Bu uygulama, lisans bitirme projesi kapsamında öğrenciler tarafından geliştirilmiştir.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => Linking.openURL('https://github.com/username/joystick-app')}
          >
            <Text style={styles.linkButtonText}>GitHub Sayfası</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#232342',
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#4a4e69',
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  backButtonText: {
    color: '#0099ff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
    color: '#e6e6e6',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  logoImage: {
    width: 120,
    height: 120,
    marginVertical: 20,
  },
  appTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#e6e6e6',
    textAlign: 'center',
  },
  version: {
    fontSize: 16,
    color: '#9a9a9a',
    marginTop: 5,
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 15,
    width: '90%',
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#4a4e69',
  },
  sectionTitle: {
    color: '#e6e6e6',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  aboutText: {
    color: '#e6e6e6',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'justify',
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  bullet: {
    color: '#0099ff',
    fontSize: 16,
    marginRight: 8,
    lineHeight: 20,
  },
  featureText: {
    color: '#e6e6e6',
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  linkButton: {
    backgroundColor: '#0099ff',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 30,
  },
  linkButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AboutScreen;