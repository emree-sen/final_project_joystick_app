import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BLEService from '../BLEService';
import { useTheme } from '../themes/ThemeContext';

const BluetoothScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const [scanning, setScanning] = useState(false);
  const [scanTimer, setScanTimer] = useState(10); // 10 saniye geri sayım
  const [connected, setConnected] = useState(false);
  const [devicesList, setDevicesList] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [logs, setLogs] = useState([]);
  const timerRef = useRef(null);

  // Bağlantı durumunu güncelleme fonksiyonu (iyileştirilmiş ve sadece kontrol eden)
  const updateConnectionStatus = async () => {
    try {
      // Öncelikle BLEService'deki basit durumu kontrol et
      const isConnected = await BLEService.isDeviceConnected();

      // Eğer bağlı görünüyorsa, gerçekten bağlı olduğundan emin olmak için test et
      if (isConnected && BLEService.device) {
        const isReallyConnected = await testConnection();

        if (!isReallyConnected) {
          // Bağlantı kopmuş ancak servis bunu henüz bilmiyor
          addLog("Bağlantı durumu yanlış! Gerçekten bağlı değil.");
          BLEService.isConnected = false; // Strong force update
          return false;
        }
      }

      // Durumu sadece logla ama burada setState yapma
      if (isConnected !== connected) {
        addLog(`Bağlantı durumu kontrolü: ${isConnected ? 'Bağlı' : 'Bağlı Değil'}`);
      }

      return isConnected;
    } catch (error) {
      addLog(`Bağlantı durumu kontrolünde hata: ${error}`);
      return false;
    }
  };

  // Bağlantıyı test et - daha basit bir yaklaşım
  const testConnection = async () => {
    if (!BLEService.device) return false;

    try {
      // BleManager'dan durumu kontrol et
      return await BLEService.isDeviceConnected();
    } catch (error) {
      addLog(`Bağlantı testi hatası: ${error}`);
      return false;
    }
  };

  useEffect(() => {
    // Ekran açıldığında bağlantı durumunu kontrol et
    const checkConnection = async () => {
      try {
        const isConnected = await updateConnectionStatus();
        if (isConnected) {
          setConnected(true);
          setSelectedDevice(BLEService.device);
          addLog('Mevcut bağlantı bulundu');
        } else {
          // Eğer bağlantı yoksa, temiz başlangıç yap
          setConnected(false);
          setSelectedDevice(null);
          addLog('Mevcut aktif bağlantı yok');
        }
      } catch (error) {
        addLog(`Bağlantı durumu kontrolünde hata: ${error}`);
      }
    };

    checkConnection();

    // Bluetooth ekranı açık olduğu sürece her 5 saniyede bir bağlantı durumunu kontrol et
    const connectionCheckInterval = setInterval(async () => {
      try {
        // İç state güncellemesi her zaman yapılmasın, sadece gerçek durumla farklılık varsa
        const isConnected = await BLEService.isDeviceConnected();

        if (isConnected !== connected) {
          addLog(`Periyodik kontrolde bağlantı durumu değişimi tespit edildi: ${isConnected ? 'Bağlı' : 'Bağlı Değil'}`);
          setConnected(isConnected);

          if (isConnected) {
            setSelectedDevice(BLEService.device);
          } else {
            setSelectedDevice(null);
          }
        }
      } catch (error) {
        addLog(`Periyodik bağlantı kontrolünde hata: ${error}`);
      }
    }, 5000);

    // Ekrandan ayrılırken bağlantı bilgisini HomeScreen'e gönder ve interval temizle
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      clearInterval(connectionCheckInterval);

      if (BLEService.isDeviceConnected()) {
        navigation.navigate('Joystick', { connected: true });
        addLog('HomeScreen\'e bağlantı durumu iletiliyor: Bağlı');
      }
    };
  }, []); // Connected'ı dependency'den kaldırdık

  // Geri sayım timer'ı
  useEffect(() => {
    if (scanning) {
      // Başlangıçta timer'ı 10'a ayarla
      setScanTimer(10);

      // Her saniye timer'ı bir azalt
      timerRef.current = setInterval(() => {
        setScanTimer(prev => {
          if (prev <= 1) {
            // Zaman dolduğunda timer'ı temizle
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      // Tarama durduğunda timer'ı temizle
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    // Component unmount olduğunda timer'ı temizle
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [scanning]);

  // Log ekleme fonksiyonu
  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prevLogs => {
      // En fazla 50 log tutuyoruz (100 yerine 50'ye düşürdük)
      const newLogs = [`${timestamp}: ${message}`, ...prevLogs];
      if (newLogs.length > 50) {
        return newLogs.slice(0, 50);
      }
      return newLogs;
    });
  };

  // Düzenli aralıklarla log temizliği yapalım
  useEffect(() => {
    // Her 2 dakikada bir eski logları temizle
    const logCleanupInterval = setInterval(() => {
      setLogs(prevLogs => {
        if (prevLogs.length > 25) { // 25'ten fazla log varsa, en son 20 tanesini tut
          const trimmedLogs = prevLogs.slice(0, 20);
          addLog("Eskiyen loglar otomatik temizlendi");
          return trimmedLogs;
        }
        return prevLogs;
      });
    }, 120000); // 2 dakika = 120000ms

    return () => clearInterval(logCleanupInterval);
  }, []);

  // Logs Section'ı daha verimli hale getirelim ve daha geniş bir alanı kaplayacak şekilde ayarlayalım
  const renderLogs = () => {
    // Sadece son 10 log'u render edelim, kullanıcı isterse tam listeye bakabilir
    const visibleLogs = logs.slice(0, 10);

    if (visibleLogs.length === 0) {
      return (
        <Text style={[styles.emptyLogText, { color: theme.secondaryTextColor }]}>
          Henüz log kaydı yok
        </Text>
      );
    }

    return (
      <View style={styles.logsContainer}>
        {visibleLogs.map((log, index) => (
          <Text key={index} style={[styles.logText, { color: '#0dd' }]}>{log}</Text>
        ))}
        {logs.length > 10 && (
          <Text style={[styles.logText, { color: theme.accentColor }]}>
            ... ve {logs.length - 10} log daha ({logs.length} toplam)
          </Text>
        )}
      </View>
    );
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
      setScanTimer(10); // Reset timer to 10 seconds

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
        return;
      }

      // Auto-stop scan after 10 seconds
      setTimeout(() => {
        BLEService.stopScan();
        setScanning(false);
        addLog('Tarama otomatik olarak durduruldu (10 sn timeout)');
      }, 10000);

    } catch (error) {
      console.log('Scan error:', error);
      setScanning(false);
      addLog(`Tarama hatası: ${error}`);
      Alert.alert('Hata', 'Tarama sırasında bir hata oluştu.');
    }
  };

  const stopScan = () => {
    BLEService.stopScan();
    setScanning(false);
    addLog('Tarama manuel olarak durduruldu');
  };

  const connectToDevice = async (device) => {
    try {
      setSelectedDevice(device);
      addLog(`'${device.name || device.id}' cihazına bağlanılıyor...`);

      // Gerçek cihaz bağlantı işlemi
      const connectionSuccessful = await BLEService.connectToDevice(device);

      if (!connectionSuccessful) {
        // Bağlantı başarısız olduysa hemen hata ver
        addLog(`'${device.name || device.id}' cihazına bağlantı başarısız oldu!`);
        Alert.alert('Bağlantı Hatası', 'Cihaza bağlanılamadı.');
        return;
      }

      // Arayüzü güncelle - bu noktada bağlantı kurulmuştur
      setConnected(true);
      addLog(`'${device.name || device.id}' cihazına bağlantı kuruldu!`);

      // Bağlantının stabil olduğuna emin olmak için 500ms bekle ve test et
      setTimeout(async () => {
        try {
          // BLEService'den doğrudan bilgileri al
          addLog(`Service UUID: ${BLEService.serviceUUID}`);
          addLog(`Characteristic UUID: ${BLEService.characteristicUUID}`);

          // Servis/karakteristik bilgileri varsa başarılı kabul et
          if (BLEService.serviceUUID && BLEService.characteristicUUID) {
            addLog(`'${device.name || device.id}' cihazına bağlantı tamamlandı ve servisler hazır!`);
            Alert.alert('Bağlantı Başarılı', `${device.name || device.id} cihazına bağlandı.`);

            // Bağlantı durumunu HomeScreen'e gönder
            navigation.navigate('Joystick', { connected: true });
          } else {
            addLog(`'${device.name || device.id}' için gerekli servisler bulunamadı!`);
            Alert.alert('Uyarı', 'Cihaza bağlanıldı ancak gerekli BLE servisleri bulunamadı!');
          }
        } catch (finalCheckError) {
          addLog(`Son bağlantı kontrolünde hata: ${finalCheckError}`);
        }
      }, 500);

    } catch (error) {
      console.log('Connection error:', error);
      addLog(`Bağlantı hatası: ${error}`);
      Alert.alert('Bağlantı Hatası', 'Cihaza bağlanırken bir hata oluştu.');
      setConnected(false);
    }
  };

  const disconnectDevice = () => {
    addLog('Cihaz bağlantısı kesiliyor...');
    BLEService.disconnect();
    setConnected(false);
    setSelectedDevice(null);
    addLog('Cihaz bağlantısı kesildi');

    // Bağlantı durumunu HomeScreen'e gönder
    navigation.navigate('Joystick', { connected: false });
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
                onPress={scanning ? stopScan : startScan}
              >
                {scanning ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.buttonText}>Taranıyor... ({scanTimer}s)</Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>Cihazları Tara</Text>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.centerButtonContainer}>
                <TouchableOpacity
                  style={[styles.disconnectButton, { backgroundColor: theme.accentColor }]}
                  onPress={disconnectDevice}
                >
                  <Text style={styles.buttonText}>Bağlantıyı Kes</Text>
                </TouchableOpacity>
              </View>
            )}
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
          borderColor: theme.borderColor,
          flex: 1,
          marginTop: 10,
          marginBottom: 5
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

          {renderLogs()}
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
  centerButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginVertical: 10,
  },
  disconnectButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: '80%',
  },
});

export default BluetoothScreen;