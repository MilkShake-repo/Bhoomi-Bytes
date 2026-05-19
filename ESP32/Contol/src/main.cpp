#include <Arduino.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <DHT.h>
#include <WebServer.h>
#include <Preferences.h>

#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"
#include "config_defaults.h"
#include "func.h"
#include "webpage.h"

#define DHT_TYPE DHT11

#define RELAY_ON LOW
#define RELAY_OFF HIGH

// === DYNAMIC PREFERENCES VARIABLES ===
Preferences prefs;
String dynamicSSID1;
String dynamicPass1;
String dynamicSSID2;
String dynamicPass2;
String dynamicApiKey;
String dynamicDbUrl;
String dynamicEmail;
String dynamicPassword;
String dynamicFbUid;
String dynamicFbFieldId;
String dynamicDeviceToken;

int dynamicPinMoisture;
int dynamicPinPh;
int dynamicPinTds;
int dynamicPinPump;
int dynamicPinDht;
int dynamicPinConfigPortal;
int dynamicConfigPortalTriggerLevel;

SensorPins SENSOR_PINS;

const SensorCalibration SENSOR_CALIBRATION = {
  3300,  // moistureDryRaw
  1300,  // moistureWetRaw
  2.50,  // phNeutralVoltage
  -5.70, // phSlope
  3.30,  // adcReferenceVoltage
  0.50   // tdsFactor
};

// Timers
const unsigned long SENSOR_INTERVAL_MS = 5000;
const unsigned long PUMP_ACTIVE_INTERVAL_MS = 1000;
const unsigned long RESET_CHECK_INTERVAL_MS = 5000;

// Firebase objects
FirebaseData sensorFbdo;
FirebaseData commandFbdo;
FirebaseAuth auth;
FirebaseConfig config;

// DHT sensor (initialized dynamically in setup)
DHT dht(DEFAULT_DHT_PIN, DHT_TYPE);

// Local Web Server
WebServer server(80);
bool apModeActive = false;
bool webServerActive = false;
bool cloudClientStarted = false;
bool cloudPathsConfigured = false;
String activeWiFiProfile = "none";

// State
unsigned long lastSensorUpload = 0;
unsigned long lastPumpActiveCheck = 0;
unsigned long lastResetCheck = 0;
unsigned long lastHeartbeat = 0;
unsigned long lastCloudNotReadyLog = 0;
bool pumpOn = false;
String firebaseDataUid = "";
String userBasePath = "";
String sensorsPath = "";
String pumpActivePath = "";
String pumpStatusPath = "";
String deviceOnlinePath = "";
String deviceResetPath = "";

void connectWiFi();
bool setupFirebase();
bool initializeCloudData();

// === Load Configurations from Flash (Preferences) ===
void loadPreferences()
{
  prefs.begin("bhoomi", false);

  dynamicSSID1 = prefs.getString("wifi_ssid_1", DEFAULT_WIFI_SSID_1);
  dynamicPass1 = prefs.getString("wifi_password_1", DEFAULT_WIFI_PASSWORD_1);
  dynamicSSID2 = prefs.getString("wifi_ssid_2", DEFAULT_WIFI_SSID_2);
  dynamicPass2 = prefs.getString("wifi_password_2", DEFAULT_WIFI_PASSWORD_2);

  dynamicApiKey = DEFAULT_API_KEY;
  dynamicDbUrl = DEFAULT_DATABASE_URL;
  dynamicEmail = prefs.getString("fb_email", DEFAULT_FIREBASE_EMAIL);
  dynamicPassword = prefs.getString("fb_password", DEFAULT_FIREBASE_PASSWORD);
  dynamicFbUid = "";
  dynamicFbFieldId = prefs.getString("fb_field_id", DEFAULT_FIREBASE_DATA_FIELD_ID);
  dynamicDeviceToken = prefs.getString("fb_device_token", DEFAULT_FIREBASE_DEVICE_TOKEN);

  dynamicPinMoisture = prefs.getInt("pin_moisture", DEFAULT_MOISTURE_PIN);
  dynamicPinPh = prefs.getInt("pin_ph", DEFAULT_PH_PIN);
  dynamicPinTds = prefs.getInt("pin_tds", DEFAULT_TDS_PIN);
  dynamicPinPump = prefs.getInt("pin_pump", DEFAULT_PUMP_RELAY_PIN);
  dynamicPinDht = prefs.getInt("pin_dht", DEFAULT_DHT_PIN);
  dynamicPinConfigPortal = prefs.getInt("pin_config_portal", DEFAULT_CONFIG_PORTAL_PIN);
  dynamicConfigPortalTriggerLevel = DEFAULT_CONFIG_PORTAL_TRIGGER_LEVEL;

  prefs.end();

  Serial.println("\n--- Loaded Preferences ---");
  Serial.print("Primary WiFi configured: "); Serial.println(dynamicSSID1.length() > 0 ? "yes" : "no");
  Serial.print("Backup WiFi configured: "); Serial.println(dynamicSSID2.length() > 0 ? "yes" : "no");
  Serial.print("Firebase email configured: "); Serial.println(dynamicEmail.length() > 0 ? "yes" : "no");
  Serial.print("Field ID configured: "); Serial.println(dynamicFbFieldId.length() > 0 ? "yes" : "no");
  Serial.print("Device ID configured: "); Serial.println(dynamicDeviceToken.length() > 0 ? "yes" : "no");
  Serial.printf("Pins: Moisture=%d, pH=%d, TDS=%d, Pump=%d, DHT=%d, ConfigPortal=%d, TriggerLevel=%s\n\n",
                dynamicPinMoisture, dynamicPinPh, dynamicPinTds, dynamicPinPump, dynamicPinDht,
                dynamicPinConfigPortal, dynamicConfigPortalTriggerLevel == HIGH ? "HIGH" : "LOW");
}

void writeDefaultPreferences()
{
  prefs.begin("bhoomi", false);

  prefs.putString("wifi_ssid_1", DEFAULT_WIFI_SSID_1);
  prefs.putString("wifi_password_1", DEFAULT_WIFI_PASSWORD_1);
  prefs.putString("wifi_ssid_2", DEFAULT_WIFI_SSID_2);
  prefs.putString("wifi_password_2", DEFAULT_WIFI_PASSWORD_2);

  prefs.putString("api_key", DEFAULT_API_KEY);
  prefs.putString("database_url", DEFAULT_DATABASE_URL);
  prefs.putString("fb_email", DEFAULT_FIREBASE_EMAIL);
  prefs.putString("fb_password", DEFAULT_FIREBASE_PASSWORD);
  prefs.putString("fb_field_id", DEFAULT_FIREBASE_DATA_FIELD_ID);
  prefs.putString("fb_device_token", DEFAULT_FIREBASE_DEVICE_TOKEN);

  prefs.putInt("pin_moisture", DEFAULT_MOISTURE_PIN);
  prefs.putInt("pin_ph", DEFAULT_PH_PIN);
  prefs.putInt("pin_tds", DEFAULT_TDS_PIN);
  prefs.putInt("pin_pump", DEFAULT_PUMP_RELAY_PIN);
  prefs.putInt("pin_dht", DEFAULT_DHT_PIN);
  prefs.putInt("pin_config_portal", DEFAULT_CONFIG_PORTAL_PIN);
  prefs.putInt("config_portal_trigger_level", DEFAULT_CONFIG_PORTAL_TRIGGER_LEVEL);

  prefs.end();
}

bool isConfigPortalTriggered()
{
  return digitalRead(dynamicPinConfigPortal) == dynamicConfigPortalTriggerLevel;
}

void printConfigPortalTriggerState()
{
  int currentLevel = digitalRead(dynamicPinConfigPortal);

  Serial.print("Config portal trigger GPIO: ");
  Serial.print(dynamicPinConfigPortal);
  Serial.print(" | active when: ");
  Serial.print(dynamicConfigPortalTriggerLevel == HIGH ? "HIGH" : "LOW");
  Serial.print(" | current level: ");
  Serial.print(currentLevel == HIGH ? "HIGH" : "LOW");
  Serial.print(" | triggered: ");
  Serial.println(currentLevel == dynamicConfigPortalTriggerLevel ? "yes" : "no");
}

IPAddress getCurrentWebIp()
{
  if (apModeActive)
  {
    return WiFi.softAPIP();
  }
  return WiFi.localIP();
}

// === Web Server Helper: Authentication Check ===
bool isClientAuthenticated()
{
  if (server.hasHeader("Cookie"))
  {
    String cookie = server.header("Cookie");
    if (cookie.indexOf("session=active") != -1)
    {
      return true;
    }
  }
  return false;
}

// === Web Server Handlers ===
void handleLoginRoute()
{
  if (server.method() == HTTP_POST)
  {
    String username = server.arg("username");
    String password = server.arg("password");

    if (username == "admin" && password == "admin")
    {
      server.sendHeader("Set-Cookie", "session=active; Path=/; HttpOnly");
      server.sendHeader("Location", "/");
      server.send(302, "text/plain", "Authenticated");
      return;
    }
    else
    {
      server.sendHeader("Location", "/login?error=1");
      server.send(302, "text/plain", "Login Failed");
      return;
    }
  }
  server.send(200, "text/html", LOGIN_HTML);
}

void handleLogoutRoute()
{
  server.sendHeader("Set-Cookie", "session=expired; Path=/; Max-Age=0; HttpOnly");
  server.sendHeader("Location", "/login");
  server.send(302, "text/plain", "Logged out");
}

void handleRootRoute()
{
  if (!isClientAuthenticated())
  {
    server.sendHeader("Location", "/login");
    server.send(302, "text/plain", "Redirecting");
    return;
  }

  // Generate dynamic JSON representation of active configurations to inject
  String json = "{";
  json += "\"wifi_ssid_1\":\""; json += dynamicSSID1; json += "\",";
  json += "\"wifi_password_1\":\""; json += dynamicPass1; json += "\",";
  json += "\"wifi_ssid_2\":\""; json += dynamicSSID2; json += "\",";
  json += "\"wifi_password_2\":\""; json += dynamicPass2; json += "\",";
  json += "\"fb_email\":\""; json += dynamicEmail; json += "\",";
  json += "\"fb_password\":\""; json += dynamicPassword; json += "\",";
  json += "\"fb_field_id\":\""; json += dynamicFbFieldId; json += "\",";
  json += "\"fb_device_token\":\""; json += dynamicDeviceToken; json += "\",";
  json += "\"pin_moisture\":"; json += dynamicPinMoisture; json += ",";
  json += "\"pin_ph\":"; json += dynamicPinPh; json += ",";
  json += "\"pin_tds\":"; json += dynamicPinTds; json += ",";
  json += "\"pin_pump\":"; json += dynamicPinPump; json += ",";
  json += "\"pin_dht\":"; json += dynamicPinDht; json += ",";
  json += "\"wifi_profile\":\""; json += activeWiFiProfile; json += "\",";
  json += "\"ip_address\":\""; json += getCurrentWebIp().toString(); json += "\"";
  json += "}";

  String page = String(INDEX_HTML);
  page.replace("%ESP_STATE_JSON%", json);

  server.send(200, "text/html", page);
}

void handleSaveRoute()
{
  if (!isClientAuthenticated())
  {
    server.send(401, "text/plain", "Unauthorized");
    return;
  }

  if (server.method() != HTTP_POST)
  {
    server.send(405, "text/plain", "Method Not Allowed");
    return;
  }

  prefs.begin("bhoomi", false);

  prefs.putString("wifi_ssid_1", server.arg("wifi_ssid_1"));
  prefs.putString("wifi_password_1", server.arg("wifi_password_1"));
  prefs.putString("wifi_ssid_2", server.arg("wifi_ssid_2"));
  prefs.putString("wifi_password_2", server.arg("wifi_password_2"));

  prefs.putString("fb_email", server.arg("fb_email"));
  prefs.putString("fb_password", server.arg("fb_password"));
  prefs.putString("fb_field_id", server.arg("fb_field_id"));
  prefs.putString("fb_device_token", server.arg("fb_device_token"));

  prefs.putInt("pin_moisture", server.arg("pin_moisture").toInt());
  prefs.putInt("pin_ph", server.arg("pin_ph").toInt());
  prefs.putInt("pin_tds", server.arg("pin_tds").toInt());
  prefs.putInt("pin_pump", server.arg("pin_pump").toInt());
  prefs.putInt("pin_dht", server.arg("pin_dht").toInt());

  prefs.end();

  server.send(200, "text/plain", "OK");
  delay(1000);
  Serial.println("System configuration updated. Rebooting micro-controller...");
  ESP.restart();
}

void handleResetRoute()
{
  if (!isClientAuthenticated())
  {
    server.send(401, "text/plain", "Unauthorized");
    return;
  }

  if (server.method() != HTTP_POST)
  {
    server.send(405, "text/plain", "Method Not Allowed");
    return;
  }

  writeDefaultPreferences();

  server.send(200, "text/plain", "OK");
  delay(1000);
  Serial.println("System configuration reset to defaults. Rebooting micro-controller...");
  ESP.restart();
}

void setupLocalWebServer()
{
  if (webServerActive)
  {
    return;
  }

  const char * headerkeys[] = {"Cookie"};
  size_t headerkeyssize = sizeof(headerkeys) / sizeof(char*);
  server.collectHeaders(headerkeys, headerkeyssize);

  server.on("/", handleRootRoute);
  server.on("/login", handleLoginRoute);
  server.on("/logout", handleLogoutRoute);
  server.on("/save", handleSaveRoute);
  server.on("/reset", handleResetRoute);

  server.begin();
  webServerActive = true;
  Serial.println("Local Configuration Server started on Port 80.");
}

void stopLocalWebServer()
{
  if (!webServerActive)
  {
    return;
  }

  server.stop();
  webServerActive = false;
  Serial.println("Local Configuration Server stopped.");
}

// === WiFi Connect ===
bool tryWiFi(const char *ssid, const char *password, unsigned long timeoutMs)
{
  if (strlen(ssid) == 0) return false;

  Serial.println("Connecting to configured WiFi profile...");
  WiFi.begin(ssid, password);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < timeoutMs)
  {
    Serial.print(".");
    delay(500);
  }

  Serial.println();
  return WiFi.status() == WL_CONNECTED;
}

void startAccessPointMode()
{
  Serial.println("\nStarting configuration AP...");
  cloudClientStarted = false;
  cloudPathsConfigured = false;
  WiFi.disconnect(true);
  delay(200);
  WiFi.mode(WIFI_AP);
  WiFi.softAP("Bhoomi-Bytes-Config", "admin123");
  apModeActive = true;
  activeWiFiProfile = "ap";

  IPAddress myIP = WiFi.softAPIP();
  Serial.print("Configuration AP started. AP IP Address: ");
  Serial.println(myIP);
}

void startStationCloudMode()
{
  if (webServerActive)
  {
    stopLocalWebServer();
  }

  if (apModeActive)
  {
    WiFi.softAPdisconnect(true);
    apModeActive = false;
  }

  cloudClientStarted = false;
  cloudPathsConfigured = false;
  connectWiFi();

  if (apModeActive)
  {
    setupLocalWebServer();
    return;
  }

  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println("WiFi is not connected. Cloud startup skipped until WiFi reconnects.");
    return;
  }

  if (!setupFirebase())
  {
    Serial.println("Turn the config trigger HIGH, join the ESP32 hotspot, and provide the Bhoomi Account Email and Password.");
    return;
  }

  Serial.println("Waiting for cloud token...");
  unsigned long firebaseStart = millis();
  while (!Firebase.ready() && millis() - firebaseStart < 15000)
  {
    delay(50);
  }

  if (!Firebase.ready())
  {
    Serial.println("Cloud service is not ready yet. The loop will keep waiting.");
    Serial.println("If this continues, turn the config trigger HIGH, join the ESP32 hotspot, and confirm your Email, Password, and database rules.");
    return;
  }

  initializeCloudData();
}

void connectWiFi()
{
  if (isConfigPortalTriggered())
  {
    Serial.println("Config portal trigger is active. WiFi connection skipped.");
    startAccessPointMode();
    return;
  }

  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true);
  delay(200);

  if (tryWiFi(dynamicSSID1.c_str(), dynamicPass1.c_str(), 10000))
  {
    Serial.println("Connected to primary WiFi.");
    apModeActive = false;
    activeWiFiProfile = "primary";
  }
  else if (tryWiFi(dynamicSSID2.c_str(), dynamicPass2.c_str(), 10000))
  {
    Serial.println("Connected to backup WiFi.");
    apModeActive = false;
    activeWiFiProfile = "backup";
  }
  else
  {
    Serial.print("Failed to connect to primary or backup WiFi. Configuration AP remains disabled until trigger pin is ");
    Serial.print(dynamicConfigPortalTriggerLevel == HIGH ? "HIGH" : "LOW");
    Serial.println(".");
    apModeActive = false;
    activeWiFiProfile = "none";
  }
}

// === Firebase Setup ===
bool hasCloudCredentials()
{
  return dynamicApiKey.length() > 0 &&
         dynamicDbUrl.length() > 0 &&
         dynamicEmail.length() > 0 &&
         dynamicPassword.length() > 0 &&
         dynamicDeviceToken.length() > 0;
}

bool setupFirebase()
{
  dynamicEmail.trim();
  dynamicPassword.trim();
  dynamicDeviceToken.trim();

  if (!hasCloudCredentials())
  {
  Serial.println("Firebase Email/Password or device ID is not configured. Cloud startup skipped.");
    return false;
  }

  config.api_key = dynamicApiKey.c_str();
  config.database_url = dynamicDbUrl.c_str();
  config.timeout.socketConnection = 10000;
  config.timeout.serverResponse = 10000;
  config.timeout.networkReconnect = 10000;

  if (!dynamicDeviceToken.startsWith("device_"))
  {
    Serial.println("The device ID should look like device_1 or device_2. Copy it from the target field in Bhoomi Bytes.");
    return false;
  }

  config.token_status_callback = tokenStatusCallback;
  config.signer.preRefreshSeconds = 5 * 60;
  sensorFbdo.setBSSLBufferSize(4096, 1024);
  commandFbdo.setBSSLBufferSize(4096, 1024);

  Serial.println("Setting Email/Password for cloud service...");
  auth.user.email = dynamicEmail.c_str();
  auth.user.password = dynamicPassword.c_str();

  Serial.println("Starting cloud client...");
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  Firebase.reconnectNetwork(true);
  cloudClientStarted = true;
  Serial.println("Cloud client started.");
  return true;
}

bool setupFirebasePaths()
{
  firebaseDataUid = auth.token.uid.c_str();
  firebaseDataUid.trim();

  if (firebaseDataUid.length() == 0)
  {
    Serial.println("Firebase data UID is empty.");
    return false;
  }

  String targetFieldId = dynamicFbFieldId;
  String targetDeviceToken = dynamicDeviceToken;
  targetFieldId.trim();
  targetDeviceToken.trim();
  if (targetFieldId.length() == 0)
  {
    targetFieldId = "field_1";
  }
  if (targetDeviceToken.length() == 0)
  {
    Serial.println("Device ID is empty.");
    return false;
  }

  userBasePath = "/users/";
  userBasePath += firebaseDataUid;
  userBasePath += "/fields/";
  userBasePath += targetFieldId;
  userBasePath += "/devices/";
  userBasePath += targetDeviceToken;
  userBasePath += "/sensorData";

  sensorsPath = userBasePath;
  sensorsPath += "/sensors";
  pumpActivePath = userBasePath;
  pumpActivePath += "/pump/active";
  pumpStatusPath = userBasePath;
  pumpStatusPath += "/pump/status";
  deviceOnlinePath = userBasePath;
  deviceOnlinePath += "/device/online";
  deviceResetPath = userBasePath;
  deviceResetPath += "/device/reset";

  Serial.println("Cloud data paths configured.");
  Serial.print("Firebase owner UID: ");
  Serial.println(firebaseDataUid);
  Serial.print("Firebase field ID: ");
  Serial.println(targetFieldId);
  Serial.print("Firebase device ID: ");
  Serial.println(targetDeviceToken);
  Serial.print("Sensor upload path: ");
  Serial.println(sensorsPath);
  Serial.print("Pump active path: ");
  Serial.println(pumpActivePath);
  return true;
}

void printFirebaseError(const char *label, FirebaseData &firebase)
{
  Serial.print(label);
  Serial.print(" | HTTP ");
  Serial.print(firebase.httpCode());
  Serial.print(" | ");
  Serial.println(firebase.errorReason());
}

bool initializeCloudData()
{
  if (cloudPathsConfigured)
  {
    return true;
  }

  if (!setupFirebasePaths())
  {
    return false;
  }

  // === Firebase rules are the gate: writes only succeed if deviceRegistry/{deviceId} exists ===
  // The anonymous ESP32 user cannot read deviceRegistry (rules block it), so we skip a pre-read
  // and let the write attempts act as the validation. Permission errors mean wrong/unregistered token.

  bool pumpActiveOk  = Firebase.RTDB.setBool(&commandFbdo, pumpActivePath.c_str(), false);
  bool pumpStatusOk  = false;
  bool deviceOnlineOk = false;

  if (pumpActiveOk)
  {
    Serial.println("Pump active initialized");
  }
  else
  {
    int httpCode = commandFbdo.httpCode();
    printFirebaseError("Pump active init failed", commandFbdo);
    if (isAuthRevoked(httpCode, commandFbdo.errorReason()))
    {
      Serial.println(">>> PERMISSION DENIED: Device token is not registered in the database, or account was deleted.");
      Serial.print  ("    Token '");
      Serial.print  (dynamicDeviceToken);
      Serial.println("' was not found in the field's deviceRegistry.");
      Serial.println("    1. Open the Bhoomi Bytes web app.");
      Serial.println("    2. Go to Settings and click Add Device.");
      Serial.println("    3. Copy the Device ID shown and paste it into this config portal.");
      
      Serial.println(">>> Account or device deleted. Resetting to Config Portal...");
      writeDefaultPreferences();
      ESP.restart();
      
      return false;
    }
  }

  pumpStatusOk = Firebase.RTDB.setString(&commandFbdo, pumpStatusPath.c_str(), "off");
  if (pumpStatusOk)
  {
    Serial.println("Pump status initialized");
  }
  else
  {
    printFirebaseError("Pump status init failed", commandFbdo);
  }

  deviceOnlineOk = Firebase.RTDB.setString(&commandFbdo, deviceOnlinePath.c_str(), "yes");
  if (deviceOnlineOk)
  {
    Serial.println("Cloud write test OK");
  }
  else
  {
    printFirebaseError("Firebase write test failed", commandFbdo);
  }

  cloudPathsConfigured = true;
  lastSensorUpload = millis() - SENSOR_INTERVAL_MS;
  lastPumpActiveCheck = millis() - PUMP_ACTIVE_INTERVAL_MS;
  lastResetCheck = millis() - RESET_CHECK_INTERVAL_MS;
  return true;
}

// === Setup ===
void setup()
{
  Serial.begin(115200);

  // 1. Load preferences from NVS Flash
  loadPreferences();

  // 2. Initialize Hardware pins loaded from Preferences
  pinMode(dynamicPinPump, OUTPUT);
  pinMode(dynamicPinMoisture, INPUT);
  pinMode(dynamicPinPh, INPUT);
  pinMode(dynamicPinTds, INPUT);
  pinMode(dynamicPinConfigPortal, dynamicConfigPortalTriggerLevel == HIGH ? INPUT_PULLDOWN : INPUT_PULLUP);
  delay(20);
  printConfigPortalTriggerState();
  analogReadResolution(12);
  digitalWrite(dynamicPinPump, RELAY_OFF);

  SENSOR_PINS = {
    dynamicPinMoisture,
    dynamicPinPh,
    dynamicPinTds
  };

  // Re-initialize DHT dynamically with the loaded pin
  dht = DHT(dynamicPinDht, DHT_TYPE);
  dht.begin();

  // 3. HIGH trigger starts config hotspot; LOW trigger starts WiFi/cloud mode.
  if (isConfigPortalTriggered())
  {
    Serial.println("Config portal trigger is active. Starting configuration AP...");
    startAccessPointMode();
    setupLocalWebServer();
  }
  else
  {
    startStationCloudMode();
  }
}

// === Loop ===
void loop()
{
  if (webServerActive)
  {
    server.handleClient();
  }

  if (!apModeActive && isConfigPortalTriggered())
  {
    Serial.println("Config portal trigger became active. Starting configuration AP...");
    startAccessPointMode();
    setupLocalWebServer();
  }

  if (apModeActive && !isConfigPortalTriggered())
  {
    Serial.println("Config portal trigger is inactive. Switching to WiFi/cloud mode...");
    startStationCloudMode();
  }

  // If in AP configuration mode, we don't stream to Firebase
  if (apModeActive)
  {
    delay(10);
    return;
  }

  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println("WiFi disconnected. Reconnecting...");
    connectWiFi();
  }

  if (!cloudClientStarted)
  {
    if (WiFi.status() == WL_CONNECTED)
    {
      setupFirebase();
    }
    delay(200);
    return;
  }

  if (!Firebase.ready())
  {
    unsigned long now = millis();
    if (now - lastCloudNotReadyLog >= 10000)
    {
      lastCloudNotReadyLog = now;
      Serial.println("Cloud service not ready. Waiting for token exchange.");
    }
    delay(200);
    return;
  }

  if (!initializeCloudData())
  {
    delay(200);
    return;
  }

  unsigned long now = millis();

  if (now - lastHeartbeat >= 10000)
  {
    lastHeartbeat = now;
    Serial.print("Loop OK. Pump is ");
    Serial.println(pumpOn ? "on" : "off");
  }

  // Upload sensors
  if (now - lastSensorUpload >= SENSOR_INTERVAL_MS)
  {
    lastSensorUpload = now;
    if (!uploadSensors(sensorFbdo, dht, SENSOR_PINS, SENSOR_CALIBRATION, sensorsPath)) {
      Serial.println(">>> Account or device deleted (auth revoked). Resetting to Config Portal...");
      writeDefaultPreferences();
      ESP.restart();
      return;
    }
  }

  // Check desired pump state
  if (now - lastPumpActiveCheck >= PUMP_ACTIVE_INTERVAL_MS)
  {
    lastPumpActiveCheck = now;
    if (!checkPumpActive(commandFbdo, dynamicPinPump, RELAY_ON, RELAY_OFF, pumpOn, pumpActivePath, pumpStatusPath)) {
      Serial.println(">>> Account or device deleted (auth revoked). Resetting to Config Portal...");
      writeDefaultPreferences();
      ESP.restart();
      return;
    }
  }

  // Check remote reset command
  if (now - lastResetCheck >= RESET_CHECK_INTERVAL_MS)
  {
    lastResetCheck = now;
    if (Firebase.RTDB.getBool(&commandFbdo, deviceResetPath.c_str()))
    {
      if (commandFbdo.dataType() == "boolean" && commandFbdo.boolData() == true)
      {
        Serial.println(">>> Remote reset command received! Stopping WiFi and resetting to defaults...");
        WiFi.disconnect(true);
        writeDefaultPreferences();
        ESP.restart();
        return;
      }
    }
  }

  delay(10);
}
