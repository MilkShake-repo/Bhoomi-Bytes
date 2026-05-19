#ifndef CONFIG_DEFAULTS_H
#define CONFIG_DEFAULTS_H

// Edit this file to change the values used when preferences are reset.
#define DEFAULT_WIFI_SSID_1 "CirkitWifi"
#define DEFAULT_WIFI_PASSWORD_1 ""
#define DEFAULT_WIFI_SSID_2 "BackupWifi"
#define DEFAULT_WIFI_PASSWORD_2 "BackupPassword"

#define DEFAULT_API_KEY "AIzaSyB-I2MqvcDyAgV24KVukTWAF3dMqvZQCmc"
#define DEFAULT_DATABASE_URL "https://bhoomi-bytes-2d514-default-rtdb.firebaseio.com"

// Paste the Firebase Email and Password used in the Bhoomi Bytes dashboard
#define DEFAULT_FIREBASE_EMAIL ""
#define DEFAULT_FIREBASE_PASSWORD ""
#define DEFAULT_FIREBASE_DATA_FIELD_ID "field_1"
#define DEFAULT_FIREBASE_DEVICE_TOKEN "device_1"
// Config portal opens only while the trigger pin is HIGH.
#define DEFAULT_CONFIG_PORTAL_TRIGGER_LEVEL HIGH

#if defined(CONFIG_IDF_TARGET_ESP32S3)
  // Safe default pins for ESP32-S3 dev boards
  #define DEFAULT_PUMP_RELAY_PIN 7
  #define DEFAULT_MOISTURE_PIN 4
  #define DEFAULT_PH_PIN 5
  #define DEFAULT_TDS_PIN 6
  #define DEFAULT_DHT_PIN 8
  #define DEFAULT_CONFIG_PORTAL_PIN 9
#else
  // Safe default pins for classic ESP32 dev boards
  #define DEFAULT_PUMP_RELAY_PIN 5
  #define DEFAULT_MOISTURE_PIN 34
  #define DEFAULT_PH_PIN 35
  #define DEFAULT_TDS_PIN 32
  #define DEFAULT_DHT_PIN 4
  #define DEFAULT_CONFIG_PORTAL_PIN 13
#endif

#endif
