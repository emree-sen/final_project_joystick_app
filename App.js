import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, PanResponder, Animated, Image, TouchableOpacity, Modal, TextInput, ScrollView } from 'react-native';
import { useState, useRef, useEffect } from 'react';

export default function App() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [displayPosition, setDisplayPosition] = useState({ x: 0, y: 0 });
  const [motorValues, setMotorValues] = useState({ a: 0, b: 0, c: 0 });
  const [showSettings, setShowSettings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Define variable names for display in settings
  const constantLabels = {
    d: 'Taban Yarıçapı',
    e: 'Platform Yarıçapı',
    f: 'Tahrik Kolu Uzunluğu',
    g: 'Asalak Kol Uzunluğu',
    hz: 'Platform Yüksekliği',
    SCALE: 'Yatış Katsayısı'
  };

  const [constants, setConstants] = useState({
    d: 60.0,
    e: 80.0,
    f: 45.0,
    g: 95.0,
    hz: 91.5,
    SCALE: 0.174
  });
  const [tempConstants, setTempConstants] = useState({});
  const pan = useRef(new Animated.ValueXY()).current;

  // Hide splash screen after 2.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

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
    // Apply the transformations from the Python script
    const nx = position.x * constants.SCALE;
    const ny = position.y * constants.SCALE;

    try {
      // Calculate motor angles
      const a = calculateTheta('A', nx, ny);
      const b = calculateTheta('B', nx, ny);
      const c = calculateTheta('C', nx, ny);

      // Subtract 180 degrees from each angle
      setMotorValues({
        a: parseFloat((a - 180).toFixed(2)),
        b: parseFloat((b - 180).toFixed(2)),
        c: parseFloat((c - 180).toFixed(2))
      });
    } catch (error) {
      console.log('Calculation error:', error);
    }
  }, [position, constants]);

  const openSettings = () => {
    setTempConstants({...constants});
    setShowSettings(true);
  };

  const saveSettings = () => {
    setConstants(tempConstants);
    setShowSettings(false);
  };

  const openAbout = () => {
    setShowAbout(true);
  };

  // Add a new state and functions for warning modal
  const [showWarning, setShowWarning] = useState(false);

  const showSettingsWarning = () => {
    setShowWarning(true);
  };

  const confirmOpenSettings = () => {
    setShowWarning(false);
    openSettings();
  };

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

        setPosition({ x: normalizedX, y: normalizedY });
        setDisplayPosition({ x: displayX, y: displayY });
      },
      onPanResponderRelease: () => {
        // Reset to center when released
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
        setPosition({ x: 0, y: 0 });
        setDisplayPosition({ x: 0, y: 0 });
      },
    })
  ).current;

  const updateConstant = (key, value) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setTempConstants({
        ...tempConstants,
        [key]: numValue
      });
    }
  };

  // If showing splash screen
  if (showSplash) {
    return (
      <View style={styles.splashContainer}>
        <Image
          source={require('./assets/acilis.png')}
          style={styles.splashImage}
          resizeMode="contain"
        />
        <Text style={styles.splashText}>
          BİTİRME PROJESİ{'\n'}KONTROL KUMANDASI UYGULAMASI
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Panel/Header with Logo and Title */}
      <View style={styles.topPanel}>
        <Text style={styles.topPanelTitle}>Kontrol Kumandası</Text>
        <Image
          source={require('./assets/iuc_logo.png')}
          style={styles.topPanelLogo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.mainContent}>
        <View style={styles.coordinatesContainer}>
          <View style={styles.coordinateBox}>
            <Text style={styles.coordinateLabel}>X</Text>
            <Text style={styles.coordinateValue}>{displayPosition.x}</Text>
          </View>
          <View style={styles.coordinateBox}>
            <Text style={styles.coordinateLabel}>Y</Text>
            <Text style={styles.coordinateValue}>{displayPosition.y}</Text>
          </View>
        </View>

        <View style={styles.motorsContainer}>
          <Text style={styles.motorsTitle}>Motor Açıları</Text>
          <View style={styles.motorsGrid}>
            <View style={styles.motorBox}>
              <Text style={styles.motorLabel}>A</Text>
              <Text style={styles.motorValue}>{motorValues.a.toFixed(2)}</Text>
            </View>
            <View style={styles.motorBox}>
              <Text style={styles.motorLabel}>B</Text>
              <Text style={styles.motorValue}>{motorValues.b.toFixed(2)}</Text>
            </View>
            <View style={styles.motorBox}>
              <Text style={styles.motorLabel}>C</Text>
              <Text style={styles.motorValue}>{motorValues.c.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.joystickContainer}>
          <View style={styles.joystickBase}>
            <Animated.View
              style={[
                styles.joystickHandle,
                {
                  transform: [{ translateX: pan.x }, { translateY: pan.y }],
                },
              ]}
              {...panResponder.panHandlers}
            />
          </View>
        </View>
      </View>

      {/* Bottom Panel */}
      <View style={styles.bottomPanel}>
        <TouchableOpacity style={styles.panelButton} onPress={openAbout}>
          <View style={styles.buttonIconWrapper}>
            <Text style={styles.panelButtonText}>ℹ️</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.centerIndicator}>
          <View style={styles.indicator}></View>
        </View>

        <TouchableOpacity style={styles.panelButton} onPress={showSettingsWarning}>
          <View style={styles.buttonIconWrapper}>
            <Text style={styles.panelButtonText}>⚙️</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ayarlar</Text>
            <ScrollView style={styles.constantsContainer}>
              {Object.keys(tempConstants).map((key) => (
                <View key={key} style={styles.inputRow}>
                  <Text style={styles.inputLabel}>{constantLabels[key] || key}:</Text>
                  <TextInput
                    style={styles.input}
                    value={tempConstants[key].toString()}
                    onChangeText={(text) => updateConstant(key, text)}
                    keyboardType="numeric"
                  />
                </View>
              ))}
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowSettings(false)}
              >
                <Text style={styles.buttonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveSettings}
              >
                <Text style={styles.buttonText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* About Modal */}
      <Modal
        visible={showAbout}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAbout(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Hakkında</Text>
            <ScrollView style={styles.aboutContainer}>
              <Text style={styles.aboutText}>
                Bu uygulama ilgili bitirme projesinin kumanda kontrolü için geliştirilmiştir.
              </Text>
              <Text style={styles.aboutText}>
                Joystick'i hareket ettirerek A, B ve C motorlarının açısal değerlerini kontrol edebilirsiniz.
              </Text>
              <Text style={styles.aboutText}>
                Hesaplamalar için robotun fiziksel boyutları ve ölçekleme faktörü ayarlar menüsünden değiştirilebilir.
              </Text>
              <Text style={styles.aboutText}>
                Versiyon: 1.3.7
              </Text>

              <Text style={styles.aboutTitle}>Proje Sahipleri</Text>

              <Text style={styles.aboutMember}>Mahmut ŞEN</Text>
              <Text style={styles.aboutMemberId}>1308200035</Text>

              <Text style={styles.aboutMember}>Ahmet Kürşat TECER</Text>
              <Text style={styles.aboutMemberId}>1308200005</Text>

              <Text style={styles.aboutMember}>Orkun AYSEL</Text>
              <Text style={styles.aboutMemberId}>1308200070</Text>

              <View style={styles.aboutDivider} />

              <Text style={styles.aboutTitle}>Danışman</Text>
              <Text style={styles.aboutMember}>Doç. Dr. Yüksel HACIOĞLU</Text>
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalButton, styles.closeButton]}
              onPress={() => setShowAbout(false)}
            >
              <Text style={styles.buttonText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add Warning Modal */}
      <Modal
        visible={showWarning}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowWarning(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.warningModalContent}>
            <View style={styles.warningIconContainer}>
              <Text style={styles.warningIcon}>⚠️</Text>
            </View>
            <Text style={styles.warningTitle}>Dikkat!</Text>
            <Text style={styles.warningText}>
              Parametre değerlerini değiştirmek, robotun hareket karakteristiğini ve güvenlik sınırlarını etkileyebilir.
            </Text>
            <Text style={styles.warningText}>
              Yanlış değerler, robotun hasar görmesine veya beklenmeyen hareketlere neden olabilir.
            </Text>
            <Text style={styles.warningText}>
              Sadece ne yaptığınızı biliyorsanız değerleri değiştirin.
            </Text>
            <View style={styles.warningButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowWarning(false)}
              >
                <Text style={styles.buttonText}>Vazgeç</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmOpenSettings}
              >
                <Text style={styles.buttonText}>Devam Et</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  topPanel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#232342',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(74, 78, 105, 0.3)',
  },
  topPanelTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e6e6e6',
    letterSpacing: 0.5,
  },
  topPanelLogo: {
    width: 80,
    height: 40,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 20,
  },
  coordinatesContainer: {
    flexDirection: 'row',
    width: '85%',
    justifyContent: 'space-around',
    marginTop: 10,
    marginBottom: 10,
  },
  coordinateBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 15,
    width: '40%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4a4e69',
  },
  coordinateLabel: {
    fontSize: 16,
    color: '#9a9a9a',
    marginBottom: 5,
  },
  coordinateValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e6e6e6',
  },
  motorsContainer: {
    width: '85%',
    marginHorizontal: '7.5%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: '#4a4e69',
  },
  motorsTitle: {
    fontSize: 18,
    color: '#e6e6e6',
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
    backgroundColor: 'rgba(0, 153, 255, 0.1)',
    borderRadius: 10,
    width: '30%',
    borderWidth: 1,
    borderColor: 'rgba(0, 153, 255, 0.3)',
  },
  motorLabel: {
    fontSize: 16,
    color: '#9a9a9a',
    marginBottom: 5,
  },
  motorValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0099ff',
  },
  bottomPanel: {
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
    width: '100%',
    height: 65,
    backgroundColor: '#232342',
    justifyContent: 'space-between',
    paddingHorizontal: 50,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(74, 78, 105, 0.3)',
  },
  panelButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  panelButtonText: {
    fontSize: 22,
  },
  centerIndicator: {
    alignItems: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 10,
  },
  indicator: {
    width: 50,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#2a2a40',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
    borderWidth: 1,
    borderColor: '#4a4e69',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e6e6e6',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  constantsContainer: {
    width: '100%',
    maxHeight: 300,
  },
  aboutContainer: {
    width: '100%',
    maxHeight: 300,
    marginBottom: 20,
  },
  aboutText: {
    color: '#e6e6e6',
    fontSize: 16,
    marginBottom: 15,
    lineHeight: 22,
  },
  aboutTitle: {
    color: '#0099ff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  aboutMember: {
    color: '#e6e6e6',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 2,
  },
  aboutMemberId: {
    color: '#9a9a9a',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  aboutDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 10,
    width: '80%',
    alignSelf: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    width: '100%',
    paddingVertical: 5,
  },
  inputLabel: {
    fontSize: 16,
    color: '#e6e6e6',
    width: '40%',
    fontWeight: '600',
    letterSpacing: 0.3,
    opacity: 0.9,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    width: '60%',
    padding: 12,
    borderRadius: 10,
    color: '#0099ff',
    fontSize: 17,
    fontWeight: '500',
    borderWidth: 1,
    borderColor: 'rgba(74, 78, 105, 0.5)',
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 10,
    width: '45%',
    alignItems: 'center',
  },
  closeButton: {
    backgroundColor: '#0099ff',
    width: '100%',
    marginTop: 10,
  },
  cancelButton: {
    backgroundColor: '#4a4e69',
  },
  saveButton: {
    backgroundColor: '#0099ff',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  joystickContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 75,
    marginTop: 20,
  },
  joystickBase: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4a4e69',
    shadowColor: '#4a4e69',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  joystickHandle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#0099ff',
    borderWidth: 2,
    borderColor: '#0077cc',
    shadowColor: '#0099ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },
  // Custom splash screen styles
  splashContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  splashImage: {
    width: '80%',
    height: '50%',
    marginBottom: 30,
  },
  splashText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
    lineHeight: 30,
  },
  warningModalContent: {
    width: '85%',
    backgroundColor: '#2a2a40',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
    borderWidth: 1,
    borderColor: '#ff9c00',
  },
  warningIconContainer: {
    marginBottom: 10,
  },
  warningIcon: {
    fontSize: 50,
  },
  warningTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff9c00',
    marginBottom: 15,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  warningText: {
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 12,
    lineHeight: 22,
    textAlign: 'center',
  },
  warningButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 15,
  },
  confirmButton: {
    backgroundColor: '#ff9c00',
  },
});

