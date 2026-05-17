# Smart Farming App - Setup Guide

## Project Overview
NEXUS AGRI-AI is a real-time farm monitoring and control system that integrates:
- **Web Dashboard**: Real-time sensor monitoring & pump control
- **Firebase Realtime Database**: Data storage & synchronization
- **ESP32 Microcontroller**: Sensor reading & pump control

---

## Quick Start: ESP32 + Website

1. Open `esp32/SmartFarmFirebase/SmartFarmFirebase.ino` in Arduino IDE.
2. Install these Arduino libraries:
   - `Firebase ESP Client` by Mobizt
   - `DHT sensor library` by Adafruit
   - `Adafruit Unified Sensor`
3. In the sketch, change:
   - `YOUR_WIFI_NAME`
   - `YOUR_WIFI_PASSWORD`
   - sensor pins if your wiring is different
   - `MOISTURE_DRY_RAW` and `MOISTURE_WET_RAW` after calibration
4. Enable Firebase Authentication:
   - Anonymous sign-in for ESP32 and guest website login
   - Email/password sign-in for normal users
5. Upload the sketch to ESP32.
6. Open `index.html`, login, finish farm setup, and watch the dashboard update from Firebase.

### PlatformIO / Arduino Framework

This repo also includes `platformio.ini` for VS Code + PlatformIO:

```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino
```

PlatformIO will use `esp32/SmartFarmFirebase` as the source directory and install the Firebase/DHT dependencies listed in the config.

The website now also includes a **Manual Sensor Input** panel. You can enter test values there before connecting the ESP32; it writes to the same Firebase paths the ESP32 uses.

### ESP32 Wiring Used By The Sketch

| Part | ESP32 pin |
| --- | --- |
| Pump relay input | GPIO 5 |
| Soil moisture analog output | GPIO 34 |
| pH analog output | GPIO 35 |
| TDS analog output | GPIO 32 |
| DHT22 data | GPIO 4 |

If your relay is active-low, change `RELAY_ON` to `LOW` and `RELAY_OFF` to `HIGH` in the sketch.

---

## 1. Firebase Configuration

The app is ready to connect to Firebase. The config is located at the top of `js/app.js`:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyDWThEN0weYvtQ_k7qQqvF1X8HbBhuUpAE",
    authDomain: "bhumibytes.firebaseapp.com",
    databaseURL: "https://bhumibytes-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "bhumibytes",
    storageBucket: "bhumibytes.firebasestorage.app",
    messagingSenderId: "986382416103",
    appId: "1:986382416103:web:cff8fe7472b5cac68f0a42"
};
```

### Firebase Database Structure (Required)

Create the following structure in Firebase Realtime Database:

```
bhumibytes-default-rtdb.asia-southeast1.firebasedatabase.app/
├── sensors/
│   ├── moisture: <number 0-100>
│   ├── temp: <number in °C>
│   ├── humidity: <number 0-100>
│   ├── ph: <number>
│   └── tds: <number in ppm>
├── pump/
│   ├── status: "on" | "off"
│   └── command: "start" | "stop"
└── farm/
    ├── waterUsed: <number in liters>
    └── energyUsed: <number in kWh>
```

---

## 2. Authentication System

The app now includes two authentication methods:

### Email/Password Login
- Users can create accounts with email and password
- Account credentials stored in Firebase Authentication
- Full access to all features

### Guest Access (Anonymous Login)
- Use the app without creating an account
- Limited features (some data tracking disabled)
- Perfect for testing

**Firebase Authentication Setup:**
1. Enable Anonymous authentication in Firebase Console
2. Enable Email/Password authentication in Firebase Console
3. Set up authentication rules as needed

---

## 3. Hosting on GitHub Pages

### Step 1: Create GitHub Repository
```bash
git init
git add .
git commit -m "Initial commit - Smart Farming App"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/smart_farming.git
git push -u origin main
```

### Step 2: Enable GitHub Pages
1. Go to repository settings
2. Navigate to "Pages" section
3. Select "Deploy from a branch"
4. Choose branch: `main`
5. Choose folder: `/ (root)` or `/docs` if files are in docs folder
6. Click "Save"

### Step 3: Access Your App
Your app will be live at: `https://YOUR_USERNAME.github.io/smart_farming/`

---

## 4. ESP32 Integration

### Required Libraries
```cpp
#include <WiFi.h>
#include <Firebase_ESP_Client.h>

// Firebase config
FirebaseData fbdo;
FirebaseConfig config;
FirebaseAuth auth;
```

### 3.1 Reading Sensors and Sending to Firebase

```cpp
void readAndSendSensors() {
    // Example: Read moisture sensor
    int moistureValue = analogRead(MOISTURE_PIN);
    int moisturePercent = map(moistureValue, 0, 4095, 0, 100);
    
    // Send to Firebase
    Firebase.RTDB.setInt(&fbdo, "sensors/moisture", moisturePercent);
    
    // Similarly for other sensors
    Firebase.RTDB.setInt(&fbdo, "sensors/temp", readTemperature());
    Firebase.RTDB.setInt(&fbdo, "sensors/humidity", readHumidity());
    Firebase.RTDB.setFloat(&fbdo, "sensors/ph", readPH());
    Firebase.RTDB.setInt(&fbdo, "sensors/tds", readTDS());
}
```

### 3.2 Listening for Pump Commands

```cpp
void listenPumpCommand() {
    Firebase.RTDB.getJSON(&fbdo, "pump/command");
    
    if (fbdo.dataType() == fb_esp_rtdb_data_type_string) {
        String command = fbdo.stringData();
        
        if (command == "start") {
            digitalWrite(RELAY_PIN, HIGH);  // Turn pump ON
            Firebase.RTDB.setString(&fbdo, "pump/status", "on");
        } 
        else if (command == "stop") {
            digitalWrite(RELAY_PIN, LOW);   // Turn pump OFF
            Firebase.RTDB.setString(&fbdo, "pump/status", "off");
        }
    }
}
```

### 3.3 Complete ESP32 Example

```cpp
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

#define WIFI_SSID "YOUR_SSID"
#define WIFI_PASSWORD "YOUR_PASSWORD"
#define API_KEY "AIzaSyDWThEN0weYvtQ_k7qQqvF1X8HbBhuUpAE"
#define DATABASE_URL "https://bhumibytes-default-rtdb.asia-southeast1.firebasedatabase.app"
#define RELAY_PIN 5
#define MOISTURE_PIN 34

FirebaseData fbdo;
FirebaseConfig config;
FirebaseAuth auth;

void setup() {
    Serial.begin(115200);
    pinMode(RELAY_PIN, OUTPUT);
    
    // Connect WiFi
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nWiFi Connected");
    
    // Firebase setup
    config.api_key = API_KEY;
    config.database_url = DATABASE_URL;
    Firebase.begin(&config, &auth);
    Firebase.reconnectWiFi(true);
    
    // Start periodic tasks
    xTaskCreatePinnedToCore(sensorTask, "Sensors", 5000, NULL, 1, NULL, 0);
    xTaskCreatePinnedToCore(pumpTask, "Pump", 5000, NULL, 1, NULL, 1);
}

void sensorTask(void * pvParameters) {
    while (true) {
        if (Firebase.ready()) {
            // Read moisture
            int raw = analogRead(MOISTURE_PIN);
            int moisture = map(raw, 0, 4095, 0, 100);
            Firebase.RTDB.setInt(&fbdo, "sensors/moisture", moisture);
            
            Serial.println("Moisture: " + String(moisture) + "%");
        }
        delay(5000); // Update every 5 seconds
    }
}

void pumpTask(void * pvParameters) {
    while (true) {
        if (Firebase.ready()) {
            Firebase.RTDB.getJSON(&fbdo, "pump/command");
            
            if (fbdo.dataType() == fb_esp_rtdb_data_type_string) {
                String cmd = fbdo.stringData();
                if (cmd == "start") {
                    digitalWrite(RELAY_PIN, HIGH);
                    Firebase.RTDB.setString(&fbdo, "pump/status", "on");
                    Serial.println("Pump: ON");
                } 
                else if (cmd == "stop") {
                    digitalWrite(RELAY_PIN, LOW);
                    Firebase.RTDB.setString(&fbdo, "pump/status", "off");
                    Serial.println("Pump: OFF");
                }
            }
        }
        delay(1000);
    }
}

void loop() {
    // Tasks handled by FreeRTOS
}
```

---

## 5. Data Flow Architecture

```
┌─────────────────────────────────────────────────────┐
│         WEB DASHBOARD (GitHub Pages)                │
│  - Real-time sensor visualization                   │
│  - Pump control buttons                             │
│  - Weather integration                              │
└────────────────────┬────────────────────────────────┘
                     │
                     │ (Firebase SDK)
                     │
┌────────────────────▼────────────────────────────────┐
│      FIREBASE REALTIME DATABASE                     │
│  - sensors/moisture, temp, humidity, ph, tds       │
│  - pump/status, pump/command                        │
└────────────────────┬────────────────────────────────┘
                     │
                     │ (WiFi via REST API)
                     │
┌────────────────────▼────────────────────────────────┐
│         ESP32 MICROCONTROLLER                       │
│  - Read ADC sensors                                 │
│  - Control relay for pump                          │
│  - Write to Firebase                               │
└─────────────────────────────────────────────────────┘
```

---

## 5. How Data Flows

### Sensor Data (ESP32 → Web)
1. ESP32 reads analog sensors every 5 seconds
2. Converts values and sends to Firebase: `sensors/moisture`, `sensors/temp`, etc.
3. Web app listens to Firebase changes and updates UI in real-time

### Pump Control (Web → ESP32)
1. User clicks "START PUMP" button on web dashboard
2. App writes "start" to `pump/command` in Firebase
3. ESP32 detects change and activates relay
4. ESP32 updates `pump/status` to "on"
5. Web app receives status update and refreshes UI

---

## 6. Testing Checklist

- [ ] Firebase project created and credentials configured
- [ ] Database rules set to allow read/write (for testing)
- [ ] GitHub repo created and Pages enabled
- [ ] App accessible via GitHub Pages URL
- [ ] ESP32 connected to WiFi
- [ ] Sensors reading values correctly
- [ ] Sensor data appearing in Firebase
- [ ] Sensor data updating in web dashboard
- [ ] Pump control commands received by ESP32
- [ ] Relay activating on command
- [ ] Status updating in Firebase and web dashboard

---

## 7. Security Notes

**For Production:**
1. Set proper Firebase Realtime Database rules:
```json
{
  "rules": {
    "sensors": {
      ".read": true,
      ".write": "auth != null"
    },
    "pump": {
      ".read": true,
      ".write": "auth != null"
    }
  }
}
```

2. Secure your ESP32 credentials
3. Use environment variables for sensitive data
4. Enable Firebase authentication

---

## 8. Troubleshooting

**Firebase not connecting on web:**
- Check if Firebase SDK scripts loaded (check browser console)
- Verify `firebaseConfig` is correct
- Check browser console for errors

**ESP32 not sending data:**
- Verify WiFi connection
- Check Firebase credentials
- Enable Firebase database logging

**Sensor values not updating:**
- Verify sensors connected to correct GPIO pins
- Check ADC calibration values
- Monitor ESP32 serial output

---

## File Structure
```
smart_farming/
|-- platformio.ini      # PlatformIO ESP32 Arduino framework config
|-- index.html          # Main HTML
|-- js/
|   |-- app.js          # Firebase config + Main app logic
|   |-- data.js         # Crop data
|   `-- i18n.js         # Multi-language support
|-- css/
|   `-- style.css       # Styling
|-- esp32/
|   `-- SmartFarmFirebase/
|       `-- SmartFarmFirebase.ino
`-- README.md           # This file
```

---

**Ready to deploy! Happy farming! 🌾**
