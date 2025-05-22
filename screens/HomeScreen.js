import { StyleSheet, Text, View, PanResponder, Animated, TouchableOpacity } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import BLEService from '../BLEService';
import { useTheme } from '../themes/ThemeContext';

const HomeScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [displayPosition, setDisplayPosition] = useState({ x: 0, y: 0 });
  const [motorValues, setMotorValues] = useState({ a: 0, b: 0, c: 0 });
  const [sendSuccess, setSendSuccess] = useState(null); // null: no attempt, true: success, false: failed
  const [connected, setConnected] = useState(false);
  const lastSendTimeRef = useRef(0);
  const throttleDelayRef = useRef(200); // 200ms throttling (daha az veri gönderimi için arttırıldı)
  const sendingRef = useRef(false);

  // Log optimizasyonu için sayaç
  const logCountRef = useRef(0);
  const lastLogTimeRef = useRef(0);

  // Akıllı loglama fonksiyonu - çok fazla log basılmasını önlemek için
  const smartLog = (message, category = 'general') => {
    logCountRef.current++;

    // Bazı kategoriler için daha az sıklıkta loglama yap
    const now = Date.now();
    const timeDiff = now - lastLogTimeRef.current;

    // Loglama sıklığını kategoriye göre ayarla
    let logThisMessage = true;

    if (category === 'position' && timeDiff < 1000) { // Pozisyon sadece saniyede bir
      logThisMessage = false;
    }
    else if (category === 'motor' && timeDiff < 2000) { // Motor değerleri 2 saniyede bir
      logThisMessage = false;
    }
    else if (category === 'throttle' && logCountRef.current % 10 !== 0) { // Throttle her 10 seferde bir
      logThisMessage = false;
    }

    if (logThisMessage) {
      console.log(message);
      lastLogTimeRef.current = now;
    }
  };

  // Varsayılan sabit değerler
  const defaultConstants = {
    d: 60.0,
    e: 80.0,
    f: 45.0,
    g: 95.0,
    hz: 91.5,
    SCALE: 0.174
  };

  // Constants for calculations - route'dan gelen değerleri al veya varsayılanları kullan
  const [constants, setConstants] = useState(defaultConstants);

  // Bağlantı durumunu kontrol et (basitleştirilmiş)
  const checkConnectionStatus = () => {
    const isConnected = BLEService.isDeviceConnected();
    if (isConnected !== connected) {
      smartLog(`Bağlantı durumu değişti: ${isConnected ? 'Bağlı' : 'Bağlı Değil'}`);
      setConnected(isConnected);
    }
    return isConnected;
  };

  // İlk başlangıçta bağlantı durumunu kontrol et
  useEffect(() => {
    const isConnected = BLEService.isDeviceConnected();
    smartLog(`İlk BLE bağlantı durumu: ${isConnected ? 'Bağlı' : 'Bağlı Değil'}`);
    setConnected(isConnected);
  }, []);

  // Update constants when route params change
  useEffect(() => {
    if (route.params?.constants) {
      setConstants(route.params.constants);
      smartLog('Sabit değerler güncellendi');
    }
  }, [route.params?.constants]);

  // Update connected state when route params change
  useEffect(() => {
    if (route.params?.connected !== undefined) {
      smartLog('Bağlantı durumu güncellendi (paramdan): ' + route.params.connected);
      setConnected(route.params.connected);
    }
  }, [route.params?.connected]);

  const pan = useRef(new Animated.ValueXY()).current;

  // Throttled send data function
  const sendDataThrottled = async (newMotorValues) => {
    const now = Date.now();
    const timeSinceLastSend = now - lastSendTimeRef.current;

    // Throttling logları sadece arada bir göster
    if (logCountRef.current % 10 === 0) {
      smartLog(`⏱️ Son gönderimden bu yana geçen süre: ${timeSinceLastSend}ms, throttle: ${throttleDelayRef.current}ms`, 'throttle');
    }

    // If we're already sending or haven't waited long enough, skip
    if (sendingRef.current) {
      smartLog("🔄 Zaten veri gönderiliyor, yeni istek atlanıyor", 'throttle');
      return;
    }

    if (timeSinceLastSend < throttleDelayRef.current) {
      // Bu logları çok sık basma
      if (logCountRef.current % 20 === 0) {
        smartLog(`⏭️ Throttling nedeniyle veri gönderimi atlanıyor`, 'throttle');
      }
      return;
    }

    // Basit bağlantı kontrolü - BLEService'in durumunu doğrudan kullan
    if (!BLEService.isConnected || !BLEService.device) {
      smartLog("❌ BLE bağlantısı yok, veri gönderilemiyor", 'error');
      setConnected(false); // UI'ı güncelle
      setSendSuccess(false);
      return;
    }

    // Mark that we're sending data
    sendingRef.current = true;

    try {
      // Send motor values via BLE
      smartLog('⚙️ Joystick verileri gönderiliyor', 'data');
      const success = await BLEService.sendJoystickData(newMotorValues);

      // Update last send time only if successful
      lastSendTimeRef.current = Date.now();
      setSendSuccess(success);

      if (success) {
        // Her başarılı gönderime log basma, arada bir göster
        if (logCountRef.current % 20 === 0) {
          smartLog('✅ Joystick verisi başarıyla gönderildi', 'success');
        }
      } else {
        smartLog('❌ Joystick verisi gönderilemedi', 'error');
        // Bağlantı durumunu güncelle
        checkConnectionStatus();
      }
    } catch (error) {
      smartLog('❌ Veri gönderim hatası: ' + error, 'error');
      setSendSuccess(false);
      // Bağlantı durumunu güncelle
      checkConnectionStatus();
    } finally {
      // Mark that we're done sending
      sendingRef.current = false;
    }
  };

  // Helper functions ported from Python script
  const unitNormal = (nx, ny) => {
    const nmag = Math.sqrt(nx*nx + ny*ny + 1.0);
    return [nx/nmag, ny/nmag, 1.0/nmag];
  };

  const calculateTheta = (leg, nx, ny) => {
    const [nxNormal, nyNormal, nzNormal] = unitNormal(nx, ny);
    const nz = nzNormal;
    const { d, e, f, g, hz } = constants;

    if (leg === 'A') {
      const y = d + (e/2)*(1 - (nxNormal**2 + 3*nzNormal**2 + 3*nzNormal) /
            (nzNormal + 1 - nxNormal**2 + (nxNormal**4 - 3*nxNormal**2*nyNormal**2) /
            ((nzNormal + 1)*(nzNormal + 1 - nxNormal**2))));
      const z = hz + e*nyNormal;
      const mag = Math.sqrt(y*y + z*z);
      return ((Math.acos(y/mag) +
              Math.acos((mag**2 + f**2 - g**2)/(2*mag*f))) * 180 / Math.PI);
    }
    if (leg === 'B') {
      const x = (Math.sqrt(3)/2)*(e*(1 - (nxNormal**2 + Math.sqrt(3)*nxNormal*nyNormal)/(nzNormal+1)) - d);
      const y = x / Math.sqrt(3);
      const z = hz - (e/2)*(Math.sqrt(3)*nxNormal + nyNormal);
      const mag = Math.sqrt(x*x + y*y + z*z);
      return ((Math.acos((Math.sqrt(3)*x + y)/(-2*mag)) +
              Math.acos((mag**2 + f**2 - g**2)/(2*mag*f))) * 180 / Math.PI);
    }
    if (leg === 'C') {
      const x = (Math.sqrt(3)/2)*(d - e*(1 - (nxNormal**2 - Math.sqrt(3)*nxNormal*nyNormal)/(nzNormal+1)));
      const y = -x / Math.sqrt(3);
      const z = hz + (e/2)*(Math.sqrt(3)*nxNormal - nyNormal);
      const mag = Math.sqrt(x*x + y*y + z*z);
      return ((Math.acos((Math.sqrt(3)*x - y)/(2*mag)) +
              Math.acos((mag**2 + f**2 - g**2)/(2*mag*f))) * 180 / Math.PI);
    }

    return 0; // Default value if leg is not recognized
  };

  // Calculate motor values whenever joystick position changes
  useEffect(() => {
    // Joystick pozisyonu logları daha az sıklıkta göster
    if (logCountRef.current % 10 === 0) {
      smartLog("Position değişti: " + JSON.stringify(position), 'position');
    }

    // Apply the transformations from the Python script
    const nx = position.x * constants.SCALE;
    const ny = position.y * constants.SCALE;

    try {
      // Calculate motor angles
      const a = calculateTheta('A', nx, ny);
      const b = calculateTheta('B', nx, ny);
      const c = calculateTheta('C', nx, ny);

      // Subtract 180 degrees from each angle
      const newMotorValues = {
        a: parseFloat((a - 180).toFixed(2)),
        b: parseFloat((b - 180).toFixed(2)),
        c: parseFloat((c - 180).toFixed(2))
      };

      // Update motor values
      setMotorValues(newMotorValues);

      // Motor değerlerini daha az sıklıkla logla
      if (logCountRef.current % 15 === 0) {
        smartLog("Motor değerleri hesaplandı: " + JSON.stringify(newMotorValues), 'motor');
      }

      // Send motor values via BLE if connected
      if (connected) {
        if (logCountRef.current % 20 === 0) {
          smartLog("Veri gönderimi başlatılıyor", 'data');
        }
        sendDataThrottled(newMotorValues);
      } else {
        // Bağlı değil uyarısını çok sık basma
        if (logCountRef.current % 30 === 0) {
          smartLog("BLE bağlantısı yok, veri gönderilmiyor", 'info');
        }
      }
    } catch (error) {
      smartLog('Calculation error: ' + error, 'error');
    }
  }, [position, constants, connected]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (event, gesture) => {
        // Calculate the joystick position within a circular boundary
        const maxDistance = 50; // Maximum distance from center
        let dx = gesture.dx;
        let dy = gesture.dy;

        // Calculate the distance from the center
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Normalize the position if it exceeds the maximum distance
        if (distance > maxDistance) {
          const angle = Math.atan2(dy, dx);
          dx = Math.cos(angle) * maxDistance;
          dy = Math.sin(angle) * maxDistance;
        }

        // Update the pan value
        pan.setValue({ x: dx, y: dy });

        // Calculate normalized values between -1 and 1
        // Actual values for calculation (top is -x, right is -y)
        const normalizedX = parseFloat((dy / maxDistance).toFixed(2));
        const normalizedY = parseFloat((-dx / maxDistance).toFixed(2));

        // Display values for frontend (standard coordinate system: right is +x, up is +y)
        const displayX = parseFloat((dx / maxDistance).toFixed(2));
        const displayY = parseFloat((-dy / maxDistance).toFixed(2));

        console.log("Joystick hareket etti:", { normalizedX, normalizedY });

        // Bu satırlar çok önemli, state'i güncelliyor
        setPosition({ x: normalizedX, y: normalizedY });
        setDisplayPosition({ x: displayX, y: displayY });
      },
      onPanResponderRelease: () => {
        // Reset to center when released
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();

        console.log("Joystick bırakıldı, merkeze dönülüyor");
        setPosition({ x: 0, y: 0 });
        setDisplayPosition({ x: 0, y: 0 });
      },
    })
  ).current;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.backgroundColor }]}
      edges={['top', 'left', 'right']}
    >
      <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
        {/* Header */}
        <View style={[styles.header, {
          backgroundColor: theme.secondaryBackground,
          borderBottomColor: theme.borderColor
        }]}>
          <Text style={[styles.title, { color: theme.textColor }]}>JOYSTICK KUMANDA</Text>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: theme.secondaryBackground }]}
            onPress={() => navigation.navigate('Constants', { constants })}
          >
            <Text style={[styles.headerButtonText, { color: theme.textColor }]}>Sabit Değerler</Text>
          </TouchableOpacity>
        </View>

        {/* Connection Status Indicator */}
        <View style={styles.statusIndicatorContainer}>
          <View
            style={[
              styles.statusDot,
              connected ?
                (sendSuccess === false ? styles.warningDot : styles.connectedDot) :
                styles.disconnectedDot
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: theme.textColor },
              connected ?
                (sendSuccess === false ? styles.warningText : styles.connectedText) :
                styles.disconnectedText
            ]}
          >
            {connected ?
              (sendSuccess === false ? "Bağlı (Veri gönderimi başarısız)" : "Bağlı") :
              "Bağlı Değil"}
          </Text>
        </View>

        {/* Joystick */}
        <View style={styles.joystickContainer}>
          <View style={[styles.joystickBase, {
            backgroundColor: theme.cardBackground,
            borderColor: theme.borderColor,
            shadowColor: theme.borderColor
          }]}>
            <Animated.View
              style={{
                transform: [{ translateX: pan.x }, { translateY: pan.y }],
                ...styles.joystickHandle,
                backgroundColor: theme.primaryColor,
                borderColor: theme.primaryDarkColor,
                shadowColor: theme.primaryColor
              }}
              {...panResponder.panHandlers}
            />
          </View>
        </View>

        {/* Coordinates Display */}
        <View style={styles.coordinatesContainer}>
          <View style={[styles.coordinateBox, {
            backgroundColor: theme.cardBackground,
            borderColor: theme.borderColor
          }]}>
            <Text style={[styles.coordinateLabel, { color: theme.secondaryTextColor }]}>X</Text>
            <Text style={[styles.coordinateValue, { color: theme.textColor }]}>{displayPosition.x}</Text>
          </View>
          <View style={[styles.coordinateBox, {
            backgroundColor: theme.cardBackground,
            borderColor: theme.borderColor
          }]}>
            <Text style={[styles.coordinateLabel, { color: theme.secondaryTextColor }]}>Y</Text>
            <Text style={[styles.coordinateValue, { color: theme.textColor }]}>{displayPosition.y}</Text>
          </View>
        </View>

        {/* Motor Values */}
        <View style={[styles.motorsContainer, {
          backgroundColor: theme.cardBackground,
          borderColor: theme.borderColor
        }]}>
          <Text style={[styles.motorsTitle, { color: theme.textColor }]}>Motor Açıları</Text>
          <View style={styles.motorsGrid}>
            <View style={[styles.motorBox, {
              backgroundColor: `${theme.primaryColor}10`,
              borderColor: `${theme.primaryColor}30`
            }]}>
              <Text style={[styles.motorLabel, { color: theme.secondaryTextColor }]}>A</Text>
              <Text style={[styles.motorValue, { color: theme.primaryColor }]}>{motorValues.a.toFixed(2)}</Text>
            </View>
            <View style={[styles.motorBox, {
              backgroundColor: `${theme.primaryColor}10`,
              borderColor: `${theme.primaryColor}30`
            }]}>
              <Text style={[styles.motorLabel, { color: theme.secondaryTextColor }]}>B</Text>
              <Text style={[styles.motorValue, { color: theme.primaryColor }]}>{motorValues.b.toFixed(2)}</Text>
            </View>
            <View style={[styles.motorBox, {
              backgroundColor: `${theme.primaryColor}10`,
              borderColor: `${theme.primaryColor}30`
            }]}>
              <Text style={[styles.motorLabel, { color: theme.secondaryTextColor }]}>C</Text>
              <Text style={[styles.motorValue, { color: theme.primaryColor }]}>{motorValues.c.toFixed(2)}</Text>
            </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 8,
    borderRadius: 5,
  },
  headerButtonText: {
    fontWeight: 'bold',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  joystickContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 30,
  },
  joystickBase: {
    width: 180,
    height: 180,
    borderRadius: 90,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  joystickHandle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  coordinatesContainer: {
    flexDirection: 'row',
    width: '85%',
    justifyContent: 'space-around',
    marginVertical: 20,
    alignSelf: 'center',
  },
  coordinateBox: {
    padding: 15,
    borderRadius: 15,
    width: '40%',
    alignItems: 'center',
    borderWidth: 1,
  },
  coordinateLabel: {
    fontSize: 16,
    marginBottom: 5,
  },
  coordinateValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  motorsContainer: {
    width: '85%',
    marginHorizontal: '7.5%',
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
  },
  motorsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  motorsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  motorBox: {
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    width: '30%',
    borderWidth: 1,
  },
  motorLabel: {
    fontSize: 16,
    marginBottom: 5,
  },
  motorValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statusIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  connectedDot: {
    backgroundColor: '#00C853',
  },
  disconnectedDot: {
    backgroundColor: '#FF1744',
  },
  warningDot: {
    backgroundColor: '#FFC400',
  },
  statusText: {
    fontSize: 16,
  },
  connectedText: {
    fontWeight: 'bold',
  },
  warningText: {
    fontWeight: 'bold',
    color: '#FFC400',
  },
  disconnectedText: {
    fontWeight: 'bold',
    color: '#FF1744',
  },
});

export default HomeScreen;