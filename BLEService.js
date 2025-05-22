import { BleManager } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';

class BLEService {
  constructor() {
    this.bleManager = new BleManager();
    this.device = null;
    this.isConnected = false;
    this.characteristicUUID = ''; // Will be set during scanning/connection
    this.serviceUUID = '';       // Will be set during scanning/connection

    // Test modu - ESP32 olmadan test edebilmek için
    this.testMode = false;
    this.testDevices = [
      { id: 'test-esp32-01', name: 'Test ESP32 #1' },
      { id: 'test-esp32-02', name: 'Test ESP32 #2' },
      { id: 'test-esp32-03', name: 'Test ESP32 #3' },
    ];

    // Log optimizasyonu için değişkenler
    this.lastLogTime = 0;
    this.logThrottleTime = 500; // ms cinsinden - aynı log kategorisinde en az bu kadar ms geçsin
    this.logCount = 0;
    this.MAX_LOGS = 100; // En fazla bu kadar log basılsın
  }

  // Akıllı loglama - çok fazla log basılmasını önlemek için
  log(message, category = 'general') {
    this.logCount++;

    // Maksimum log sayısına ulaşıldıysa ve önemli bir mesaj değilse, loglamayı atla
    if (this.logCount > this.MAX_LOGS && !category.includes('error') && !category.includes('critical')) {
      return;
    }

    // Son log ile aynı kategorideki log arasında yeterli zaman geçmiş mi?
    const now = Date.now();
    if (now - this.lastLogTime < this.logThrottleTime && category !== 'error') {
      return; // Throttle zamanı dolmadıysa loglama
    }

    // Log basmaya devam et
    this.lastLogTime = now;
    console.log(message);
  }

  // Test modunu açma/kapama
  setTestMode(enabled) {
    this.testMode = enabled;
    this.log(`Test modu ${enabled ? 'açıldı' : 'kapatıldı'}`);
    return this.testMode;
  }

  // Request necessary permissions for BLE
  async requestPermissions() {
    if (Platform.OS === 'android' && Platform.Version >= 23) {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        return (
          granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
          granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED &&
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        this.log('İzin isteğinde hata: ' + err, 'error');
        return false;
      }
    }
    return true;
  }

  // Start BLE scanning
  async startScan(onDeviceDiscovered) {
    try {
      // Test modundaysa, test cihazlarını göster
      if (this.testMode) {
        this.log('Test modunda tarama başlatıldı');
        setTimeout(() => {
          this.testDevices.forEach(device => {
            onDeviceDiscovered(device);
          });
        }, 1000);
        return true;
      }

      const granted = await this.requestPermissions();
      if (!granted) {
        this.log('BLE izinleri verilmedi', 'error');
        return false;
      }

      this.log('BLE taraması başlıyor...');
      this.bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          this.log('Tarama hatası: ' + error, 'error');
          return;
        }

        // Call callback with the discovered device
        if (device && device.name) {
          this.log(`Cihaz bulundu: ${device.name} (${device.id})`, 'discover');
          onDeviceDiscovered(device);
        }
      });

      return true;
    } catch (error) {
      this.log('Taramayı başlatma hatası: ' + error, 'error');
      return false;
    }
  }

  // Stop scanning
  stopScan() {
    if (!this.testMode) {
      try {
        this.log('BLE taraması durdurulması için istek gönderildi');
        this.bleManager.stopDeviceScan();
        this.log('BLE taraması durduruldu');
      } catch (error) {
        this.log('Taramayı durdurma hatası: ' + error, 'error');
      }
    } else {
      this.log('Test modunda tarama durduruldu');
    }
  }

  // Gerçek bağlantı durumunu kontrol eder
  async isDeviceConnected() {
    // Test modunda her zaman bağlı kabul edelim
    if (this.testMode) {
      return true;
    }

    // Cihaz nesnesi yoksa kesinlikle bağlı değiliz
    if (!this.device) {
      this.isConnected = false;
      return false;
    }

    // İç flag değerine göre durumu kontrol et
    if (!this.isConnected) {
      return false;
    }

    // Performans için her 5 saniyede bir gerçek durumu kontrol edelim ve flag ile saklayalım
    // Bu, çok sık yapılan isDeviceConnected() çağrılarında BLE operasyonunu sürekli tekrarlamamak için
    const now = Date.now();
    if (!this._lastConnectionCheck || now - this._lastConnectionCheck > 5000) {
      try {
        this._lastConnectionCheck = now;

        // isConnected metodunu kullanarak cihazın bağlı olup olmadığını kontrol et
        // Bu metod connectedDevices'dan daha hafif bir operasyondur
        const isConnected = await this.device.isConnected();

        // Eğer bağlantı durumunda bir tutarsızlık varsa, flag'i güncelle
        if (this.isConnected !== isConnected) {
          this.log(`Bağlantı durumu tutarsızlığı tespit edildi.
                  İç durum: ${this.isConnected ? 'Bağlı' : 'Bağlı değil'},
                  Gerçek durum: ${isConnected ? 'Bağlı' : 'Bağlı değil'}`, 'warning');
          this.isConnected = isConnected;
        }

        return isConnected;
      } catch (error) {
        this.log('Bağlantı durumu kontrolünde hata: ' + error, 'error');
        // Oluşan hata büyük ihtimalle cihazın artık mevcut olmaması
        // Bu durumda bağlantıyı kopmuş kabul et
        this.isConnected = false;
        return false;
      }
    }

    // Eğer çok yakın zamanda bir kontrol yapıldıysa, sakladığımız flag değerini kullan
    return this.isConnected;
  }

  // Connect to a device
  async connectToDevice(device) {
    try {
      // Test modunda bağlantıyı simüle et
      if (this.testMode) {
        this.log(`Test modunda ${device.name || device.id} cihazına bağlanılıyor...`);
        // Bağlantıyı simüle et
        await new Promise(resolve => setTimeout(resolve, 1000));

        this.device = device;
        this.isConnected = true;
        this.serviceUUID = 'TEST-SERVICE-UUID';
        this.characteristicUUID = 'TEST-CHAR-UUID';

        this.log('Test cihazına bağlantı başarılı');
        return true;
      }

      // Stop scanning when connecting
      this.stopScan();

      this.log(`${device.name || device.id} cihazına bağlanılıyor...`);

      // Önce mevcut bağlantıyı temizle
      if (this.device) {
        try {
          this.log('Önceki bağlantı temizleniyor...');
          await this.device.cancelConnection();
          this.device = null;
          this.isConnected = false;
        } catch (error) {
          this.log('Önceki bağlantıyı temizlerken hata: ' + error, 'warning');
          // Devam et, bu önemli bir hata değil
        }
      }

      // Connect to the device with timeout
      let connectedDevice;
      try {
        connectedDevice = await device.connect({
          timeout: 10000, // 10 saniye bağlantı zaman aşımı
          autoConnect: false // Android için önemli
        });
        this.log('Cihaza bağlanıldı, servisler keşfediliyor...');
      } catch (connectError) {
        this.log('Cihaza bağlantı başarısız: ' + connectError, 'error');
        this.isConnected = false;
        return false;
      }

      // Disconnect listener'ı ayarla
      try {
        connectedDevice.onDisconnected((error, disconnectedDevice) => {
          if (disconnectedDevice && disconnectedDevice.id === this.device?.id) {
            this.log('Cihaz bağlantısı kesildi: ' + disconnectedDevice.id, 'error');
            this.isConnected = false;
            this.device = null;
          }
        });
      } catch (listenerError) {
        this.log('Bağlantı dinleyici hatası (önemli değil): ' + listenerError, 'warning');
      }

      try {
        // Discover all services and characteristics
        const discoverDevice = await connectedDevice.discoverAllServicesAndCharacteristics();
        this.log('Servisler ve karakteristikler keşfedildi');

        // Cihaz referansını sakla ve durumu güncelle
        this.device = discoverDevice;
        this.isConnected = true;

        // Get services
        const services = await discoverDevice.services();
        this.log(`${services.length} servis bulundu`);

        // Find the service and characteristic for our ESP32
        let found = false;

        for (const service of services) {
          this.log(`Servis UUID: ${service.uuid} inceleniyor`);
          const characteristics = await service.characteristics();

          if (characteristics.length > 0) {
            this.log(`Bu serviste ${characteristics.length} karakteristik bulundu`);
          }

          for (const characteristic of characteristics) {
            if (characteristic.isWritableWithResponse || characteristic.isWritableWithoutResponse) {
              this.log(`Yazılabilir karakteristik bulundu: ${characteristic.uuid}`);
              this.characteristicUUID = characteristic.uuid;
              this.serviceUUID = service.uuid;
              found = true;
              break;
            }
          }

          if (found) break;
        }

        if (!found) {
          this.log('Uygun yazılabilir karakteristik bulunamadı!', 'error');
          // Yine de devam et, belki başka bir serviste bulunabilir
        }

        return true;
      } catch (discoverError) {
        this.log('Servis keşfetme hatası: ' + discoverError, 'error');
        // Bağlantı kuruldu ama servisler bulunamadıysa yine de başarılı kabul et
        // UI'da uyarı gösterilecek ama bağlantı açık kalacak
        this.isConnected = true;
        this.device = connectedDevice;
        return true;
      }
    } catch (error) {
      this.log('Bağlantı hatası: ' + error, 'error');
      this.isConnected = false;
      this.device = null;
      return false;
    }
  }

  // Send joystick data to the ESP32
  async sendJoystickData(motorValues) {
    if (this.testMode && this.isConnected) {
      this.log(`📤 JOYSTICK VERİSİ GÖNDERİLDİ (Test modu): A:${motorValues.a}, B:${motorValues.b}, C:${motorValues.c}`, 'data');
      return true;
    }

    // Bağlantı durumunu kontrol et - minimum log ile
    if (!this.isConnected || !this.device) {
      this.log('❌ Joystick verisi gönderilemedi: Bağlı cihaz yok', 'error');
      return false;
    }

    try {
      // Format the data to send - basit ve Arduino'nun anlayacağı bir format
      const dataString = `A${motorValues.a.toFixed(0)},B${motorValues.b.toFixed(0)},C${motorValues.c.toFixed(0)}`;

      // Joystick verilerini daha seyrek loglayalım
      if (this.logCount % 10 === 0) { // Her 10 veride bir log basalım
        this.log(`🔄 Joystick verisi: ${dataString}`, 'data');
      }

      // Servis ve karakteristik UUID'leri kontrol et
      if (!this.serviceUUID || !this.characteristicUUID) {
        this.log('❌ Geçerli servis veya karakteristik UUID bulunamadı', 'error');
        return false;
      }

      try {
        // writeCharacteristicWithResponseForDevice kullanacağız
        await this.bleManager.writeCharacteristicWithResponseForDevice(
          this.device.id,
          this.serviceUUID,
          this.characteristicUUID,
          btoa(dataString) // Base64 encode
        );

        // Başarılı gönderim durumunu sadece zaman zaman loglayalım
        if (this.logCount % 20 === 0) { // Her 20 veride bir başarı logu
          this.log(`📤 JOYSTICK VERİSİ GÖNDERİLDİ: ${dataString}`, 'success');
        }
        return true;
      } catch (writeError) {
        this.log(`❌ Karakteristiğe veri yazma hatası: ${writeError}`, 'error');

        // Farklı bir format deneyelim (sadece hata durumunda)
        try {
          this.log('⚠️ Alternatif veri formatı deneniyor...', 'error');
          // Daha basit bir format deneyelim
          const plainText = `J:${motorValues.a.toFixed(0)}:${motorValues.b.toFixed(0)}:${motorValues.c.toFixed(0)}`;

          await this.bleManager.writeCharacteristicWithResponseForDevice(
            this.device.id,
            this.serviceUUID,
            this.characteristicUUID,
            btoa(plainText)
          );
          this.log(`📤 ALTERNATİF FORMAT İLE VERİ GÖNDERİLDİ: ${plainText}`, 'success');
          return true;
        } catch (alternativeError) {
          this.log(`❌ Alternatif format ile veri gönderimi de başarısız: ${alternativeError}`, 'error');
        }

        // Hata nedeniyle bağlantı durumunu güncelle
        if (writeError.toString().includes('disconnected') || writeError.toString().includes('bağlantı')) {
          this.log('📡 Cihaz bağlantısı kopmuş, bağlantı durumu güncellendi', 'error');
          this.isConnected = false;
        }

        throw writeError;
      }
    } catch (error) {
      this.log(`❌ Joystick verisi gönderme hatası: ${error}`, 'error');
      return false;
    }
  }

  // Helper to convert string to bytes
  stringToBytes(string) {
    // Convert string to bytes array for BLE transmission
    let bytes = [];
    for (let i = 0; i < string.length; i++) {
      bytes.push(string.charCodeAt(i));
    }
    return this.bytesToBase64(bytes);
  }

  // Helper to convert bytes to base64 (React Native uyumlu)
  bytesToBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  // Test verisi gönderme - debug için
  async sendTestData(testString = "HELLO_ESP32") {
    if (this.testMode && this.isConnected) {
      this.log(`📤 TEST VERİSİ GÖNDERİLDİ (Test modu): "${testString}"`, 'test');
      return true;
    }

    if (!this.isConnected || !this.device) {
      this.log('❌ Test verisi gönderilemedi: Bağlı cihaz yok', 'error');
      return false;
    }

    try {
      this.log(`📡 Test verisi gönderiliyor: "${testString}"`, 'test');

      // BLE yazma işlemi bleManager üzerinden yapılmalı
      await this.bleManager.writeCharacteristicWithResponseForDevice(
        this.device.id,
        this.serviceUUID,
        this.characteristicUUID,
        btoa(testString) // Base64 encode
      );

      this.log('✅ TEST VERİSİ BAŞARIYLA GÖNDERİLDİ!', 'success');
      return true;
    } catch (error) {
      this.log(`❌ Test verisi gönderim hatası: ${error}`, 'error');
      return false;
    }
  }

  // JSON to base64 (React Native uyumlu)
  jsonToBase64(json) {
    const jsonStr = JSON.stringify(json);
    return btoa(jsonStr);
  }

  // Disconnect from device
  disconnect() {
    if (this.testMode && this.isConnected) {
      this.log('Test cihaz bağlantısı kesiliyor...');
      this.isConnected = false;
      this.device = null;
      return;
    }

    if (this.device) {
      this.device.cancelConnection();
      this.isConnected = false;
      this.device = null;
      this.log('Cihaz bağlantısı kesildi');
    }
  }

  // Check if BLE is enabled
  async checkBleState() {
    if (this.testMode) {
      this.log('Test modunda Bluetooth durumu kontrolü yapılıyor');
      return true;
    }

    const state = await this.bleManager.state();
    this.log(`Bluetooth durumu: ${state}`);
    return state === 'PoweredOn';
  }
}

// Export as a singleton
export default new BLEService();