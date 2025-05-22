import { BleManager } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';

class BLEService {
  constructor() {
    this.bleManager = new BleManager();
    this.device = null;
    this.isConnected = false;
    this.characteristicUUID = ''; // Will be set during scanning/connection
    this.serviceUUID = '';       // Will be set during scanning/connection
    this.useResponseMode = true; // Default to using with response mode

    // Test modu - ESP32 olmadan test edebilmek için
    this.testMode = false;
    this.testDevices = [
      { id: 'test-esp32-01', name: 'Test ESP32 #1' },
      { id: 'test-esp32-02', name: 'Test ESP32 #2' },
      { id: 'test-esp32-03', name: 'Test ESP32 #3' },
    ];
  }

  // Test modunu açma/kapama
  setTestMode(enabled) {
    this.testMode = enabled;
    console.log(`Test modu ${enabled ? 'açıldı' : 'kapatıldı'}`);
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
        console.log('İzin isteğinde hata:', err);
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
        console.log('Test modunda tarama başlatıldı');
        setTimeout(() => {
          this.testDevices.forEach(device => {
            onDeviceDiscovered(device);
          });
        }, 1000);
        return true;
      }

      const granted = await this.requestPermissions();
      if (!granted) {
        console.log('BLE izinleri verilmedi');
        return false;
      }

      console.log('BLE taraması başlıyor...');
      this.bleManager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.log('Tarama hatası:', error);
          return;
        }

        // Call callback with the discovered device
        if (device && device.name) {
          console.log(`Cihaz bulundu: ${device.name} (${device.id})`);
          onDeviceDiscovered(device);
        }
      });

      return true;
    } catch (error) {
      console.log('Taramayı başlatma hatası:', error);
      return false;
    }
  }

  // Stop scanning
  stopScan() {
    if (!this.testMode) {
      this.bleManager.stopDeviceScan();
      console.log('BLE taraması durduruldu');
    }
  }

  // Connect to a device
  async connectToDevice(device) {
    try {
      // Test modunda bağlantıyı simüle et
      if (this.testMode) {
        console.log(`Test modunda ${device.name} cihazına bağlanılıyor...`);
        // Bağlantıyı simüle et
        await new Promise(resolve => setTimeout(resolve, 1500));

        this.device = device;
        this.isConnected = true;
        this.serviceUUID = 'TEST-SERVICE-UUID';
        this.characteristicUUID = 'TEST-CHAR-UUID';

        console.log('Test cihazına bağlantı başarılı');
        return true;
      }

      // Stop scanning when connecting
      this.stopScan();

      console.log(`${device.name || device.id} cihazına bağlanılıyor...`);
      // Connect to the device
      const connectedDevice = await device.connect();
      console.log('Cihaza bağlanıldı, servisler keşfediliyor...');

      // Discover all services and characteristics
      const discoverDevice = await connectedDevice.discoverAllServicesAndCharacteristics();
      console.log('Servisler ve karakteristikler keşfedildi');

      // Get services
      const services = await discoverDevice.services();
      console.log(`${services.length} servis bulundu`);

      // Find the service and characteristic for our ESP32
      let found = false;

      for (const service of services) {
        console.log(`Servis UUID: ${service.uuid} inceleniyor`);
        const characteristics = await service.characteristics();
        console.log(`Bu serviste ${characteristics.length} karakteristik bulundu`);

        for (const characteristic of characteristics) {
          console.log(`Karakteristik: ${characteristic.uuid}`);
          // Check for writable characteristic which we'll use for sending joystick data
          if (characteristic.isWritableWithResponse || characteristic.isWritableWithoutResponse) {
            console.log(`Yazılabilir karakteristik bulundu: ${characteristic.uuid}`);
            this.characteristicUUID = characteristic.uuid;
            this.serviceUUID = service.uuid;
            found = true;
            break;
          }
        }

        if (found) break;
      }

      if (!found) {
        console.log('Uygun yazılabilir karakteristik bulunamadı!');
      }

      this.device = discoverDevice;
      this.isConnected = true;

      // Setup disconnection listener
      this.device.onDisconnected((error, disconnectedDevice) => {
        this.isConnected = false;
        this.device = null;
        console.log('Cihaz bağlantısı kesildi');
      });

      return true;
    } catch (error) {
      console.log('Bağlantı hatası:', error);
      return false;
    }
  }

  // Response modunu değiştirme
  setResponseMode(useResponse) {
    this.useResponseMode = useResponse;
    console.log(`BLE veri gönderme modu: ${useResponse ? 'withResponse' : 'withoutResponse'}`);
    return this.useResponseMode;
  }

  // Send joystick data to the ESP32
  async sendJoystickData(motorValues) {
    if (this.testMode && this.isConnected) {
      console.log(`📤 JOYSTICK VERİSİ GÖNDERİLDİ (Test modu): A:${motorValues.a}, B:${motorValues.b}, C:${motorValues.c}`);
      return true;
    }

    // Bağlantı durumunu kontrol et
    console.log(`BLE Bağlantı Kontrolü: isConnected=${this.isConnected}, device=${this.device ? 'var' : 'yok'}`);
    console.log(`BLE UUID Bilgileri: serviceUUID=${this.serviceUUID}, characteristicUUID=${this.characteristicUUID}`);

    if (!this.isConnected || !this.device) {
      console.log('❌ Joystick verisi gönderilemedi: Bağlı cihaz yok');
      return false;
    }

    try {
      // Format the data to send
      // Convert motor values to a string format that your ESP32 can parse
      // NMEA benzeri bir format: "$JSTK,A:123.45,B:67.89,C:0.12*XX" (XX: checksum)
      const baseDataString = `A:${motorValues.a},B:${motorValues.b},C:${motorValues.c}`;
      const dataString = `$JSTK,${baseDataString}*00`; // Basit bir başlık ekledik, checksum hesaplamayı atladık
      console.log(`🔄 Joystick verisi hazırlandı: ${dataString}`);

      // Convert the string to bytes
      const data = this.stringToBytes(dataString);
      console.log(`🔄 Veri bayt dizisine dönüştürüldü: ${data}`);

      // Servis ve karakteristik UUID'leri kontrol et
      if (!this.serviceUUID || !this.characteristicUUID) {
        console.log('❌ Geçerli servis veya karakteristik UUID bulunamadı');
        return false;
      }

      // Write to the characteristic
      console.log(`📡 Veri yazma işlemi başlatılıyor... (${this.useResponseMode ? 'withResponse' : 'withoutResponse'})`);

      try {
        // Alternatif olarak doğrudan motorValues kullanarak base64'e çevrilmiş JSON gönderelim
        const motorValuesJson = JSON.stringify(motorValues);
        const motorValueBytes = Buffer.from(motorValuesJson).toString('base64');

        console.log(`📡 Motor JSON verisi: ${motorValuesJson}`);

        if (this.useResponseMode) {
          await this.device.writeCharacteristicWithResponse(
            this.serviceUUID,
            this.characteristicUUID,
            data
          );
        } else {
          await this.device.writeCharacteristicWithoutResponse(
            this.serviceUUID,
            this.characteristicUUID,
            data
          );
        }
        console.log(`📤 JOYSTICK VERİSİ GÖNDERİLDİ: A:${motorValues.a}, B:${motorValues.b}, C:${motorValues.c}`);
        return true;
      } catch (writeError) {
        console.log(`❌ Karakteristiğe veri yazma hatası: ${writeError}`);

        // Farklı bir format deneyelim (sadece hata durumunda)
        try {
          console.log('⚠️ Alternatif veri formatı deneniyor...');
          const alternativeData = Buffer.from(JSON.stringify(motorValues)).toString('base64');

          if (this.useResponseMode) {
            await this.device.writeCharacteristicWithResponse(
              this.serviceUUID,
              this.characteristicUUID,
              alternativeData
            );
          } else {
            await this.device.writeCharacteristicWithoutResponse(
              this.serviceUUID,
              this.characteristicUUID,
              alternativeData
            );
          }
          console.log(`📤 ALTERNATİF FORMAT İLE VERİ GÖNDERİLDİ: ${JSON.stringify(motorValues)}`);
          return true;
        } catch (alternativeError) {
          console.log(`❌ Alternatif format ile veri gönderimi de başarısız: ${alternativeError}`);
        }

        // Cihazın hala bağlı olup olmadığını kontrol et
        try {
          const isDeviceConnected = await this.device.isConnected();
          console.log(`📡 Cihaz hala bağlı mı? ${isDeviceConnected ? 'Evet' : 'Hayır'}`);

          if (!isDeviceConnected) {
            this.isConnected = false;
            console.log('📡 Cihaz bağlantısı kopmuş, bağlantı durumu güncellendi');
          }
        } catch (deviceCheckError) {
          console.log(`📡 Cihaz durumu kontrolünde hata: ${deviceCheckError}`);
        }

        throw writeError;
      }
    } catch (error) {
      console.log(`❌ Joystick verisi gönderme hatası: ${error}`);
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
    return Buffer.from(bytes).toString('base64');
  }

  // Disconnect from device
  disconnect() {
    if (this.testMode && this.isConnected) {
      console.log('Test cihaz bağlantısı kesiliyor...');
      this.isConnected = false;
      this.device = null;
      return;
    }

    if (this.device) {
      this.device.cancelConnection();
      this.isConnected = false;
      this.device = null;
      console.log('Cihaz bağlantısı kesildi');
    }
  }

  // Check if BLE is enabled
  async checkBleState() {
    if (this.testMode) {
      console.log('Test modunda Bluetooth durumu kontrolü yapılıyor');
      return true;
    }

    const state = await this.bleManager.state();
    console.log(`Bluetooth durumu: ${state}`);
    return state === 'PoweredOn';
  }
}

// Export as a singleton
export default new BLEService();