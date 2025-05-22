import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../themes/ThemeContext';

const AboutScreen = ({ navigation }) => {
  const { theme } = useTheme();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.backgroundColor }]}
      edges={['top', 'left', 'right']}
    >
      <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
        <View style={[styles.header, {
          backgroundColor: theme.secondaryBackground,
          borderBottomColor: theme.borderColor
        }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={[styles.backButtonText, { color: theme.primaryColor }]}>← Geri</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.textColor }]}>Hakkında</Text>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Image
            source={require('../assets/acilis.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />

          <Text style={[styles.appTitle, { color: theme.textColor }]}>Kumanda Kontrol Uygulaması</Text>
          <Text style={[styles.version, { color: theme.secondaryTextColor }]}>Sürüm 1.0.0</Text>

          <View style={[styles.section, {
            backgroundColor: theme.cardBackground,
            borderColor: theme.borderColor
          }]}>
            <Text style={[styles.sectionTitle, { color: theme.textColor }]}>Proje Hakkında</Text>
            <Text style={[styles.aboutText, { color: theme.textColor }]}>
              Bu uygulama, ESP32 tabanlı bir Stewart platformunu kontrol etmek için
              tasarlanmış bir bitirme projesi çalışmasıdır. Bluetooth Low Energy (BLE)
              üzerinden ESP32 Arduino modülüne bağlanır ve joystick hareketlerini kullanarak
              platformdaki motorları kontrol etmenizi sağlar.
            </Text>
          </View>

          <View style={[styles.section, {
            backgroundColor: theme.cardBackground,
            borderColor: theme.borderColor
          }]}>
            <Text style={[styles.sectionTitle, { color: theme.textColor }]}>Özellikler</Text>
            <View style={styles.featureItem}>
              <Text style={[styles.bullet, { color: theme.primaryColor }]}>•</Text>
              <Text style={[styles.featureText, { color: theme.textColor }]}>BLE üzerinden ESP32 ile kablosuz iletişim</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={[styles.bullet, { color: theme.primaryColor }]}>•</Text>
              <Text style={[styles.featureText, { color: theme.textColor }]}>Hassas joystick kontrolü</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={[styles.bullet, { color: theme.primaryColor }]}>•</Text>
              <Text style={[styles.featureText, { color: theme.textColor }]}>Motor açı hesaplamaları</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={[styles.bullet, { color: theme.primaryColor }]}>•</Text>
              <Text style={[styles.featureText, { color: theme.textColor }]}>Test modu ile donanım olmadan simülasyon</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={[styles.bullet, { color: theme.primaryColor }]}>•</Text>
              <Text style={[styles.featureText, { color: theme.textColor }]}>Detaylı log ekranı</Text>
            </View>
          </View>

          <View style={[styles.section, {
            backgroundColor: theme.cardBackground,
            borderColor: theme.borderColor
          }]}>
            <Text style={[styles.sectionTitle, { color: theme.textColor }]}>Proje Ekibi</Text>
            <Text style={[styles.memberTitle, { color: theme.primaryColor }]}>Proje Sahipleri</Text>

            <View style={styles.memberItem}>
              <Text style={[styles.bullet, { color: theme.primaryColor }]}>•</Text>
              <Text style={[styles.memberText, { color: theme.textColor }]}>İbrahim Semih Aşiroğlu</Text>
            </View>
            <View style={styles.memberItem}>
              <Text style={[styles.bullet, { color: theme.primaryColor }]}>•</Text>
              <Text style={[styles.memberText, { color: theme.textColor }]}>Barış Özgün Yılmaz</Text>
            </View>
            <View style={styles.memberItem}>
              <Text style={[styles.bullet, { color: theme.primaryColor }]}>•</Text>
              <Text style={[styles.memberText, { color: theme.textColor }]}>Ali Demirören</Text>
            </View>

            <Text style={[styles.memberTitle, { color: theme.primaryColor, marginTop: 20 }]}>Proje Danışmanı</Text>
            <Text style={[styles.memberText, { color: theme.textColor, fontWeight: '500', marginLeft: 15 }]}>
              Dr. Öğr. Üyesi Vildan Atalay Aydın
            </Text>

            <Text style={[styles.institutionText, { color: theme.secondaryTextColor, marginTop: 20 }]}>
              İstanbul Üniversitesi - Cerrahpaşa{'\n'}
              Bilgisayar Mühendisliği Bölümü{'\n'}
              2023-2024 Akademik Yılı
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.linkButton, { backgroundColor: theme.primaryColor }]}
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
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  title: {
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
    textAlign: 'center',
  },
  version: {
    fontSize: 16,
    marginTop: 5,
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    borderRadius: 10,
    padding: 15,
    width: '90%',
    marginVertical: 10,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  aboutText: {
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
    fontSize: 16,
    marginRight: 8,
    lineHeight: 20,
  },
  featureText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  memberTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 8,
  },
  memberItem: {
    flexDirection: 'row',
    marginBottom: 5,
    alignItems: 'center',
    marginLeft: 10,
  },
  memberText: {
    fontSize: 14,
    flex: 1,
  },
  institutionText: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  linkButton: {
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