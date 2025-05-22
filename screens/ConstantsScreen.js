import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../themes/ThemeContext';

const ConstantsScreen = ({ navigation, route }) => {
  const { theme } = useTheme();

  // Varsayılan sabit değerler
  const defaultConstants = {
    d: 60.0,
    e: 80.0,
    f: 45.0,
    g: 95.0,
    hz: 91.5,
    SCALE: 0.174
  };

  // Route'dan gelen değerleri al veya varsayılanları kullan
  const [constants, setConstants] = useState(
    route.params?.constants || defaultConstants
  );

  // Geçici değerler (düzenleme için)
  const [tempConstants, setTempConstants] = useState({...constants});

  // Değer değişikliklerini işle
  const handleValueChange = (key, value) => {
    // Sayısal değer kontrolü
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setTempConstants({...tempConstants, [key]: numValue});
    } else if (value === '' || value === '-' || value === '.') {
      // Boş değer, eksi işareti veya nokta girişine izin ver
      setTempConstants({...tempConstants, [key]: value});
    }
  };

  // Değerleri kaydet
  const saveConstants = () => {
    // Tüm değerlerin sayısal olduğundan emin ol
    const numericConstants = {};
    let hasError = false;

    Object.entries(tempConstants).forEach(([key, value]) => {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        hasError = true;
        return;
      }
      numericConstants[key] = numValue;
    });

    if (hasError) {
      Alert.alert('Hata', 'Tüm değerler sayısal olmalıdır.');
      return;
    }

    // Uyarı mesajı göster
    Alert.alert(
      'Uyarı',
      'Sabit değerleri değiştirmek, joystick hesaplamalarını ve motor açılarını doğrudan etkileyecektir. Devam etmek istiyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Devam Et',
          onPress: () => {
            // Ana ekrana dön ve değerleri geri gönder
            navigation.navigate('Main', {
              screen: 'Joystick',
              params: { constants: numericConstants }
            });
          }
        }
      ]
    );
  };

  // Değerleri sıfırla
  const resetConstants = () => {
    Alert.alert(
      'Sıfırla',
      'Tüm değerler varsayılana dönecek. Emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sıfırla',
          onPress: () => setTempConstants({...defaultConstants})
        }
      ]
    );
  };

  // Sabit açıklamaları
  const constantDescriptions = {
    d: 'Platform merkezi ile motor arasındaki mesafe',
    e: 'Platform yarıçapı',
    f: 'Servo kol uzunluğu',
    g: 'Bağlantı çubuğu uzunluğu',
    hz: 'Platform yüksekliği',
    SCALE: 'Joystick ölçeklendirme faktörü'
  };

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
          <Text style={[styles.title, { color: theme.textColor }]}>Sabit Değerler</Text>
        </View>

        <ScrollView style={styles.scrollView}>
          <Text style={[styles.description, { color: theme.textColor }]}>
            Bu ekranda Stewart platformu için gerekli sabit değerleri düzenleyebilirsiniz.
            Değişiklikler joystick hesaplamalarını doğrudan etkileyecektir.
          </Text>

          {Object.keys(tempConstants).map((key) => (
            <View key={key} style={[styles.inputRow, {
              backgroundColor: theme.cardBackground,
              borderColor: theme.borderColor
            }]}>
              <View style={styles.labelContainer}>
                <Text style={[styles.inputLabel, { color: theme.primaryColor }]}>{key}</Text>
                <Text style={[styles.inputDescription, { color: theme.secondaryTextColor }]}>
                  {constantDescriptions[key]}
                </Text>
              </View>
              <TextInput
                style={[styles.input, {
                  backgroundColor: `${theme.secondaryBackground}80`,
                  color: theme.textColor,
                  borderColor: theme.borderColor
                }]}
                value={tempConstants[key].toString()}
                onChangeText={(value) => handleValueChange(key, value)}
                keyboardType="numeric"
                selectTextOnFocus
              />
            </View>
          ))}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.accentColor }]}
              onPress={resetConstants}
            >
              <Text style={styles.buttonText}>Sıfırla</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.primaryColor }]}
              onPress={saveConstants}
            >
              <Text style={styles.buttonText}>Kaydet</Text>
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
    padding: 15,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  labelContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  inputDescription: {
    fontSize: 12,
    marginTop: 3,
  },
  input: {
    width: 80,
    height: 40,
    borderRadius: 5,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    borderWidth: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ConstantsScreen;