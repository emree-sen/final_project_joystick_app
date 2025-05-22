import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, Alert, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BLEService from '../BLEService';
import { useTheme } from '../themes/ThemeContext';

const BluetoothScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const [scanning, setScanning] = useState(false);
  const [connected, setConnected] = useState(false);
  const [devicesList, setDevicesList] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [testMode, setTestMode] = useState(false);
  const [useResponseMode, setUseResponseMode] = useState(true);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // Ekran açıldığında bağlantı durumunu kontrol et
    const checkConnection = async () => {
      if (BLEService.isConnected) {
        setConnected(true);
        setSelectedDevice(BLEService.device);
      }
    };

    checkConnection();

    // Test mode durumunu BLEService'den al
    setTestMode(BLEService.testMode);

    // Response mode durumunu BLEService'den al
    setUseResponseMode(BLEService.useResponseMode);

    // Ekrandan ayrılırken bağlantı bilgisini HomeScreen'e gönder
    return () => {
      if (connected) {
        navigation.navigate('Joystick', {
          connected: true
        });
      }
    };
  }, []);

  // Log ekleme fonksiyonu
  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prevLogs => {
      // En fazla 100 log tutuyoruz
      const newLogs = [`${timestamp}: ${message}`, ...prevLogs];
      if (newLogs.length > 100) {
        return newLogs.slice(0, 100);
      }
      return newLogs;
    });
  };

  // Test verisi gönderme fonksiyonu
  const sendTestData = async () => {
    if (!connected) {
      addLog("Test verisi gönderilemedi: Bağlı cihaz yok");
      return;
    }

    // Test motor değerleri oluştur
    const testMotorValues = {
      a: 10.50,
      b: -15.25,
      c: 20.00
    };

    addLog(`Test verisi gönderiliyor: A:${testMotorValues.a}, B:${testMotorValues.b}, C:${testMotorValues.c}`);

    try {
      const success = await BLEService.sendJoystickData(testMotorValues);
      if (success) {
        addLog("✅ TEST VERİSİ GÖNDERİLDİ");
      } else {
        addLog("❌ Test verisi gönderilemedi");
      }
    } catch (error) {
      addLog(`❌ Test verisi gönderme hatası: ${error}`);
    }
  };

  // Test modu değiştirme fonksiyonu
  const toggleTestMode = () => {
    const newTestMode = !testMode;
    BLEService.setTestMode(newTestMode);
    setTestMode(newTestMode);
    addLog(`Test modu ${newTestMode ? 'açıldı' : 'kapatıldı'}`);
  };

  // Response modu değiştirme fonksiyonu
  const toggleResponseMode = () => {
    const newResponseMode = !useResponseMode;
    BLEService.setResponseMode(newResponseMode);
    setUseResponseMode(newResponseMode);
    addLog(`Veri gönderme modu: ${newResponseMode ? 'withResponse' : 'withoutResponse'}`);
  };

  const startScan = async () => {
    try {
      // Check BLE state
      const bleEnabled = await BLEService.checkBleState();
      if (!bleEnabled) {
        Alert.alert('Bluetooth Kapalı', 'Lütfen Bluetooth\'u açın ve tekrar deneyin.');
        addLog('Bluetooth kapalı!');
        return;
      }

      addLog('Cihaz taraması başlatılıyor...');
      // Clear devices list and start scanning
      setDevicesList([]);
      setScanning(true);

      const startSuccess = await BLEService.startScan((device) => {
        // Add device if not already in list
        setDevicesList((prevList) => {
          if (!prevList.some(d => d.id === device.id)) {
            addLog(`Cihaz bulundu: ${device.name || 'İsimsiz'} (${device.id})`);
            return [...prevList, device];
          }
          return prevList;
        });
      });

      if (!startSuccess) {
        setScanning(false);
        addLog('Tarama başlatılamadı! İzinleri kontrol edin.');
        Alert.alert('Tarama Başlatılamadı', 'Bluetooth izinlerini kontrol edin.');
      }

      // Auto-stop scan after 10 seconds
      setTimeout(() => {
        if (scanning) {
          BLEService.stopScan();
          setScanning(false);
          addLog('Tarama otomatik olarak durduruldu (10 sn timeout)');
        }
      }, 10000);

    } catch (error) {
      console.log('Scan error:', error);
      setScanning(false);
      addLog(`Tarama hatası: ${error}`);
      Alert.alert('Hata', 'Tarama sırasında bir hata oluştu.');
    }
  };

  const connectToDevice = async (device) => {
    try {
      setSelectedDevice(device);
      addLog(`'${device.name || device.id}' cihazına bağlanılıyor...`);

      const connectionSuccessful = await BLEService.connectToDevice(device);

      if (connectionSuccessful) {
        setConnected(true);
        addLog(`'${device.name || device.id}' cihazına bağlantı başarılı!`);
        addLog(`Service UUID: ${BLEService.serviceUUID}`);
        addLog(`Characteristic UUID: ${BLEService.characteristicUUID}`);
        Alert.alert('Bağlantı Başarılı', `${device.name || device.id} cihazına bağlandı.`);
      } else {
        addLog(`'${device.name || device.id}' cihazına bağlanılamadı!`);
        Alert.alert('Bağlantı Hatası', 'Cihaza bağlanılamadı.');
      }
    } catch (error) {
      console.log('Connection error:', error);
      addLog(`Bağlantı hatası: ${error}`);
      Alert.alert('Bağlantı Hatası', 'Cihaza bağlanırken bir hata oluştu.');
    }
  };

  const disconnectDevice = () => {
    addLog('Cihaz bağlantısı kesiliyor...');
    BLEService.disconnect();
    setConnected(false);
    setSelectedDevice(null);
    addLog('Cihaz bağlantısı kesildi');
  };

  const renderDeviceItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.deviceItem, {
        backgroundColor: theme.cardBackground,
        borderLeftColor: theme.primaryColor
      }]}
      onPress={() => connectToDevice(item)}
    >
      <Text style={[styles.deviceName, { color: theme.textColor }]}>
        {item.name || 'İsimsiz Cihaz'}
      </Text>
      <Text style={[styles.deviceId, { color: theme.secondaryTextColor }]}>
        {item.id}
      </Text>
    </TouchableOpacity>
  );

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
          <Text style={[styles.title, { color: theme.textColor }]}>Bluetooth Ayarları</Text>
        </View>

        {/* Connection Status */}
        <View style={[styles.statusContainer, {
          backgroundColor: theme.cardBackground,
          borderColor: theme.borderColor
        }]}>
          <Text style={[styles.statusLabel, { color: theme.secondaryTextColor }]}>Durum:</Text>
          <Text style={[
            styles.statusValue,
            connected ? { color: theme.successColor } : { color: theme.accentColor }
          ]}>
            {connected ? 'Bağlı' : 'Bağlı Değil'}
          </Text>

          {connected && selectedDevice && (
            <Text style={[styles.deviceInfoText, { color: theme.textColor }]}>
              {selectedDevice.name || selectedDevice.id}
            </Text>
          )}
        </View>

        {/* Controls */}
        <View style={[styles.controlsSection, { backgroundColor: theme.cardBackground, borderColor: theme.borderColor }]}>
          <Text style={[styles.sectionTitle, { color: theme.textColor }]}>Kontroller</Text>

          <View style={styles.controlsContainer}>
            {!connected ? (
              <TouchableOpacity
                style={[
                  styles.scanButton,
                  scanning ?
                    { backgroundColor: theme.secondaryTextColor } :
                    { backgroundColor: theme.primaryColor }
                ]}
                onPress={scanning ? () => {
                  BLEService.stopScan();
                  setScanning(false);
                  addLog('Tarama manuel olarak durduruldu');
                } : startScan}
                disabled={scanning}
              >
                {scanning ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.buttonText}>Taranıyor...</Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>Cihazları Tara</Text>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.accentColor }]}
                  onPress={disconnectDevice}
                >
                  <Text style={styles.buttonText}>Bağlantıyı Kes</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: theme.successColor }]}
                  onPress={sendTestData}
                >
                  <Text style={styles.buttonText}>Test Verisi</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Settings */}
          <View style={styles.settingsContainer}>
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: theme.textColor }]}>Test Modu:</Text>
              <Switch
                value={testMode}
                onValueChange={toggleTestMode}
                trackColor={{ false: theme.borderColor, true: theme.primaryColor }}
                thumbColor={testMode ? theme.primaryDarkColor : '#f4f3f4'}
              />
            </View>

            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: theme.textColor }]}>Response Modu:</Text>
              <Switch
                value={useResponseMode}
                onValueChange={toggleResponseMode}
                trackColor={{ false: theme.borderColor, true: theme.primaryColor }}
                thumbColor={useResponseMode ? theme.primaryDarkColor : '#f4f3f4'}
              />
            </View>
          </View>
        </View>

        {/* Device List */}
        {!connected && (
          <View style={[styles.devicesContainer, {
            backgroundColor: theme.cardBackground,
            borderColor: theme.borderColor
          }]}>
            <Text style={[styles.sectionTitle, { color: theme.textColor }]}>
              {scanning ? 'Bulunan Cihazlar...' : 'Bulunan Cihazlar'}
            </Text>
            {devicesList.length > 0 ? (
              <FlatList
                data={devicesList}
                renderItem={renderDeviceItem}
                keyExtractor={item => item.id}
                style={styles.deviceList}
              />
            ) : (
              <Text style={[styles.emptyListText, { color: theme.secondaryTextColor }]}>
                {scanning ? 'Cihazlar aranıyor...' : 'Hiç cihaz bulunamadı. Tarama yapın.'}
              </Text>
            )}
          </View>
        )}

        {/* Logs Section */}
        <View style={[styles.logsSection, {
          backgroundColor: theme.cardBackground,
          borderColor: theme.borderColor
        }]}>
          <View style={styles.logsTitleRow}>
            <Text style={[styles.sectionTitle, { color: theme.textColor }]}>Loglar</Text>
            <TouchableOpacity
              style={[styles.clearButton, { backgroundColor: theme.secondaryBackground }]}
              onPress={() => setLogs([])}
            >
              <Text style={[styles.clearButtonText, { color: theme.textColor }]}>Temizle</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.logsContainer}>
            {logs.length > 0 ? (
              <FlatList
                data={logs}
                renderItem={({item}) => (
                  <Text style={[styles.logText, { color: '#0dd' }]}>{item}</Text>
                )}
                keyExtractor={(item, index) => index.toString()}
                style={styles.logsList}
              />
            ) : (
              <Text style={[styles.emptyLogText, { color: theme.secondaryTextColor }]}>
                Henüz log kaydı yok
              </Text>
            )}
          </View>
        </View>
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

  // Status Section
  statusContainer: {
    padding: 15,
    margin: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  statusLabel: {
    fontSize: 16,
    marginBottom: 5,
  },
  statusValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  deviceInfoText: {
    fontSize: 16,
  },

  // Controls Section
  controlsSection: {
    margin: 10,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginVertical: 10,
  },
  scanButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: '80%',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '48%',
    marginHorizontal: '1%',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },

  // Settings
  settingsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#4a4e6930',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  settingLabel: {
    fontSize: 14,
    marginRight: 8,
  },

  // Devices Section
  devicesContainer: {
    flex: 0.5,
    margin: 10,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
  },
  deviceList: {
    flex: 1,
  },
  deviceItem: {
    padding: 12,
    marginVertical: 5,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  deviceId: {
    fontSize: 14,
  },
  emptyListText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },

  // Logs Section
  logsSection: {
    flex: 0.5,
    margin: 10,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
  },
  logsTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  clearButton: {
    padding: 5,
    borderRadius: 5,
  },
  clearButtonText: {
    fontSize: 14,
  },
  logsContainer: {
    flex: 1,
  },
  logsList: {
    flex: 1,
  },
  logText: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  emptyLogText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
});

export default BluetoothScreen;