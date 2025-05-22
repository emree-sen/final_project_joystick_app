import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BLEService from '../BLEService';
import { useTheme } from '../themes/ThemeContext';

const SettingsScreen = ({ navigation }) => {
  const { theme, toggleTheme } = useTheme();
  const [testMode, setTestMode] = useState(false);
  const [autoConnect, setAutoConnect] = useState(false);
  const [keepScreenOn, setKeepScreenOn] = useState(true);
  const [vibration, setVibration] = useState(true);
  const isDarkTheme = theme.name === 'dark';

  useEffect(() => {
    // Initialize settings from BLEService
    setTestMode(BLEService.testMode);
  }, []);

  // Toggle test mode
  const toggleTestMode = () => {
    const newValue = !testMode;
    BLEService.setTestMode(newValue);
    setTestMode(newValue);
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.backgroundColor }]}
      edges={['top', 'left', 'right']}
    >
      <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
        <View style={[styles.header, { backgroundColor: theme.secondaryBackground, borderBottomColor: theme.borderColor }]}>
          <Text style={[styles.title, { color: theme.textColor }]}>Ayarlar</Text>
        </View>

        <ScrollView style={styles.scrollView}>
          <View style={[styles.section, {
            backgroundColor: theme.cardBackground,
            borderColor: theme.borderColor
          }]}>
            <Text style={[styles.sectionTitle, { color: theme.textColor }]}>Bluetooth Ayarları</Text>

            <View style={[styles.settingRow, { borderBottomColor: 'rgba(255, 255, 255, 0.1)' }]}>
              <View style={styles.settingLabelContainer}>
                <Text style={[styles.settingLabel, { color: theme.textColor }]}>Test Modu</Text>
                <Text style={[styles.settingDesc, { color: theme.secondaryTextColor }]}>
                  ESP32 olmadan test için simülasyon modu
                </Text>
              </View>
              <Switch
                value={testMode}
                onValueChange={toggleTestMode}
                trackColor={{ false: '#4a4e69', true: theme.primaryColor }}
                thumbColor={testMode ? theme.primaryDarkColor : '#f4f3f4'}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingLabelContainer}>
                <Text style={[styles.settingLabel, { color: theme.textColor }]}>Otomatik Bağlan</Text>
                <Text style={[styles.settingDesc, { color: theme.secondaryTextColor }]}>
                  Uygulama açıldığında son cihaza bağlan
                </Text>
              </View>
              <Switch
                value={autoConnect}
                onValueChange={setAutoConnect}
                trackColor={{ false: '#4a4e69', true: theme.primaryColor }}
                thumbColor={autoConnect ? theme.primaryDarkColor : '#f4f3f4'}
              />
            </View>
          </View>

          <View style={[styles.section, {
            backgroundColor: theme.cardBackground,
            borderColor: theme.borderColor
          }]}>
            <Text style={[styles.sectionTitle, { color: theme.textColor }]}>Uygulama Ayarları</Text>

            <View style={[styles.settingRow, { borderBottomColor: 'rgba(255, 255, 255, 0.1)' }]}>
              <View style={styles.settingLabelContainer}>
                <Text style={[styles.settingLabel, { color: theme.textColor }]}>Koyu Tema</Text>
                <Text style={[styles.settingDesc, { color: theme.secondaryTextColor }]}>
                  Uygulama arayüzünü koyu veya açık tema ile görüntüle
                </Text>
              </View>
              <Switch
                value={isDarkTheme}
                onValueChange={toggleTheme}
                trackColor={{ false: '#4a4e69', true: theme.primaryColor }}
                thumbColor={isDarkTheme ? theme.primaryDarkColor : '#f4f3f4'}
              />
            </View>

            <View style={[styles.settingRow, { borderBottomColor: 'rgba(255, 255, 255, 0.1)' }]}>
              <View style={styles.settingLabelContainer}>
                <Text style={[styles.settingLabel, { color: theme.textColor }]}>Ekranı Açık Tut</Text>
                <Text style={[styles.settingDesc, { color: theme.secondaryTextColor }]}>
                  Uygulama kullanılırken ekranın kapanmasını engelle
                </Text>
              </View>
              <Switch
                value={keepScreenOn}
                onValueChange={setKeepScreenOn}
                trackColor={{ false: '#4a4e69', true: theme.primaryColor }}
                thumbColor={keepScreenOn ? theme.primaryDarkColor : '#f4f3f4'}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingLabelContainer}>
                <Text style={[styles.settingLabel, { color: theme.textColor }]}>Titreşim</Text>
                <Text style={[styles.settingDesc, { color: theme.secondaryTextColor }]}>
                  Joystick konumu değiştiğinde hafif titreşim
                </Text>
              </View>
              <Switch
                value={vibration}
                onValueChange={setVibration}
                trackColor={{ false: '#4a4e69', true: theme.primaryColor }}
                thumbColor={vibration ? theme.primaryDarkColor : '#f4f3f4'}
              />
            </View>
          </View>

          <View style={[styles.section, {
            backgroundColor: theme.cardBackground,
            borderColor: theme.borderColor
          }]}>
            <Text style={[styles.sectionTitle, { color: theme.textColor }]}>Uygulama Bilgileri</Text>

            <View style={[styles.infoRow, { borderBottomColor: 'rgba(255, 255, 255, 0.1)' }]}>
              <Text style={[styles.infoLabel, { color: theme.textColor }]}>Sürüm</Text>
              <Text style={[styles.infoValue, { color: theme.secondaryTextColor }]}>1.0.0</Text>
            </View>

            <View style={[styles.infoRow, { borderBottomColor: 'rgba(255, 255, 255, 0.1)' }]}>
              <Text style={[styles.infoLabel, { color: theme.textColor }]}>Geliştirici</Text>
              <Text style={[styles.infoValue, { color: theme.secondaryTextColor }]}>Bitirme Projesi Ekibi</Text>
            </View>

            <TouchableOpacity
              style={[styles.aboutButton, { backgroundColor: theme.primaryColor }]}
              onPress={() => navigation.navigate('About')}
            >
              <Text style={styles.aboutButtonText}>Hakkında</Text>
            </TouchableOpacity>
          </View>
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
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    borderRadius: 10,
    padding: 15,
    margin: 10,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingLabelContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
  },
  settingDesc: {
    fontSize: 12,
    marginTop: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoLabel: {
    fontSize: 16,
  },
  infoValue: {
    fontSize: 16,
  },
  aboutButton: {
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
    alignItems: 'center',
  },
  aboutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default SettingsScreen;