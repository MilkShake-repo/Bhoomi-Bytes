#ifndef FARM_CONTROLLER_H
#define FARM_CONTROLLER_H

#include <Arduino.h>
#include <DHT.h>
#include <Firebase_ESP_Client.h>

struct SensorPins
{
    int moisture;
    int ph;
    int tds;
};

struct SensorCalibration
{
    int moistureDryRaw;
    int moistureWetRaw;
    float phNeutralVoltage;
    float phSlope;
    float adcReferenceVoltage;
    float tdsFactor;
};

bool isAuthRevoked(int httpCode, const String& errorReason) {
    if (httpCode == 401 || httpCode == 403) return true;
    String err = errorReason;
    err.toLowerCase();
    if (err.indexOf("permission") >= 0) return true;
    if (err.indexOf("user_not_found") >= 0) return true;
    if (err.indexOf("user_disabled") >= 0) return true;
    if (err.indexOf("invalid_id_token") >= 0) return true;
    if (err.indexOf("unauthorized") >= 0) return true;
    if (err.indexOf("auth error") >= 0) return true;
    return false;
}

float readAdcVoltage(int pin, float referenceVoltage)
{
    return analogRead(pin) * (referenceVoltage / 4095.0);
}

float readMoisturePercent(int pin, const SensorCalibration &calibration)
{
    int raw = analogRead(pin);
    int percent = map(raw, calibration.moistureDryRaw, calibration.moistureWetRaw, 0, 100);
    return constrain(percent, 0, 100);
}

float readPh(int pin, const SensorCalibration &calibration)
{
    float voltage = readAdcVoltage(pin, calibration.adcReferenceVoltage);
    float ph = 7.0 + ((voltage - calibration.phNeutralVoltage) * calibration.phSlope);
    return constrain(ph, 0.0, 14.0);
}

float readTdsPpm(int pin, float temperatureC, const SensorCalibration &calibration)
{
    float voltage = readAdcVoltage(pin, calibration.adcReferenceVoltage);
    float compensation = 1.0 + 0.02 * (temperatureC - 25.0);
    float compensatedVoltage = voltage / compensation;
    float tds = (133.42 * compensatedVoltage * compensatedVoltage * compensatedVoltage -
                 255.86 * compensatedVoltage * compensatedVoltage +
                 857.39 * compensatedVoltage) *
                calibration.tdsFactor;

    return max(0.0f, tds);
}

bool uploadSensors(FirebaseData &firebase, DHT &dht, const SensorPins &pins, const SensorCalibration &calibration, const String &sensorPath)
{
    Serial.println("Reading sensors...");

    Serial.println("Reading DHT humidity...");
    float humidity = dht.readHumidity();
    Serial.print("DHT humidity raw: ");
    Serial.println(humidity);

    float temperature = dht.readTemperature();
    Serial.print("DHT temperature raw: ");
    Serial.println(temperature);

    if (isnan(humidity)) humidity = 0;
    if (isnan(temperature)) temperature = 25;

    float moisture = readMoisturePercent(pins.moisture, calibration);
    Serial.print("Moisture percent: ");
    Serial.println(moisture);

    float ph = readPh(pins.ph, calibration);
    Serial.print("pH value: ");
    Serial.println(ph);

    float tds = readTdsPpm(pins.tds, temperature, calibration);
    Serial.print("TDS ppm: ");
    Serial.println(tds);

    FirebaseJson data;
    data.set("moisture", round(moisture));
    data.set("temp", temperature);
    data.set("humidity", humidity);
    data.set("ph", ph);
    data.set("tds", round(tds));

    if (Firebase.RTDB.updateNode(&firebase, sensorPath.c_str(), &data))
    {
        Serial.printf("Sensors: moisture=%d%% temp=%.1fC humidity=%.1f%% ph=%.2f tds=%dppm\n",
                      (int)round(moisture), temperature, humidity, ph, (int)round(tds));
        return true;
    }
    else
    {
        Serial.print("Sensor upload failed | HTTP ");
        Serial.print(firebase.httpCode());
        Serial.print(" | ");
        Serial.println(firebase.errorReason());
        
        if (isAuthRevoked(firebase.httpCode(), firebase.errorReason())) {
            return false;
        }
        return true;
    }
}

void setPump(FirebaseData &firebase, int relayPin, bool turnOn, int relayOn, int relayOff, bool &pumpOn, const String &pumpStatusPath)
{
    pumpOn = turnOn;
    digitalWrite(relayPin, turnOn ? relayOn : relayOff);

    if (!Firebase.RTDB.setString(&firebase, pumpStatusPath.c_str(), turnOn ? "on" : "off"))
    {
        Serial.print("Pump status update failed | HTTP ");
        Serial.print(firebase.httpCode());
        Serial.print(" | ");
        Serial.println(firebase.errorReason());
    }

    Serial.println(turnOn ? "Pump ON" : "Pump OFF");
}

bool checkPumpActive(FirebaseData &firebase, int relayPin, int relayOn, int relayOff, bool &pumpOn, const String &pumpActivePath, const String &pumpStatusPath)
{
    if (!Firebase.RTDB.getBool(&firebase, pumpActivePath.c_str()))
    {
        Serial.print("Pump active read failed | HTTP ");
        Serial.print(firebase.httpCode());
        Serial.print(" | ");
        Serial.println(firebase.errorReason());
        
        if (isAuthRevoked(firebase.httpCode(), firebase.errorReason())) {
            return false;
        }
        return true;
    }

    bool requestedPumpOn = firebase.boolData();

    if (requestedPumpOn == pumpOn) return true;

    Serial.print("Pump active requested: ");
    Serial.println(requestedPumpOn ? "true" : "false");

    setPump(firebase, relayPin, requestedPumpOn, relayOn, relayOff, pumpOn, pumpStatusPath);
    return true;
}

#endif
