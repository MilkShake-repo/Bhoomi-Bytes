# Bhoomi Bytes

Bhoomi Bytes is a smart farm monitoring dashboard for viewing live sensor readings, checking weather, managing crop threshold defaults, and sending irrigation pump commands through Firebase Realtime Database.

This README avoids personal project credentials. Replace every placeholder value with your own Firebase and hosting details before deploying.

## Features

- Email/password, Google, guest login, password reset, and account deletion support
- 10 minute inactive-session timeout
- Authenticated per-user dashboard for soil moisture, soil temperature, air humidity, pH, and TDS nutrients
- Crop-specific default values with editable overrides
- Pump start/stop commands through Firebase
- Water and energy usage summary
- Weather and 7 day forecast using Open-Meteo
- Multi-language UI support

## Project Structure

```text
.
|-- index.html
|-- css/
|   `-- style.css
|-- js/
|   |-- app.js
|   |-- config.js
|   |-- data.js
|   |-- i18n.js
|   `-- translations.json
`-- README.md
```

## Run Locally

Open `index.html` in a browser.

For Firebase login and realtime data to work, configure your Firebase project in `js/app.js` and enable the required Firebase services.

## Firebase Setup

In `js/app.js`, replace the Firebase config with your own values:

```js
const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT-default-rtdb.REGION.firebasedatabase.app",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

Enable these Firebase Authentication providers as needed:

- Email/password
- Anonymous
- Google

The web app shows an `ESP32 token` after login. This value is the user's stable Firebase UID and is used by the ESP32 as the database owner path.

## Firebase Database Paths

```text
users/{uid}/sensors/
|-- moisture: number, percent
|-- temp: number, Celsius
|-- humidity: number, percent
|-- ph: number
`-- tds: number, ppm

users/{uid}/pump/
|-- command: "start" or "stop"
`-- status: "on" or "off"

users/{uid}/usage/
|-- waterUsed: number, liters
`-- energyUsed: number, kWh
```

## ESP32 Auth Setup

In `ESP32/Contol/src/main.cpp`, edit these values before flashing:

```cpp
#define WIFI_SSID_1 "YourPrimaryWifi"
#define WIFI_PASSWORD_1 "YourPrimaryPassword"
#define WIFI_SSID_2 "YourBackupWifi"
#define WIFI_PASSWORD_2 "YourBackupPassword"

#define FIREBASE_USER_EMAIL "device-or-user@example.com"
#define FIREBASE_USER_PASSWORD "YourFirebasePassword"
#define CREATE_FIREBASE_ACCOUNT false
#define FIREBASE_DATA_UID "paste-the-web-esp32-token-here"
```

Use `CREATE_FIREBASE_ACCOUNT true` only for the first flash when you want the ESP32 to create a new Email/Password Firebase user. Set it back to `false` after the account exists. Google login tokens expire, so do not paste a Google ID token into firmware; paste the stable `ESP32 token` UID shown by the web app.

Example authenticated Realtime Database rules:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid == $uid",
        ".write": "auth != null && auth.uid == $uid"
      }
    }
  }
}
```

If the ESP32 signs in with a separate device account but writes to another user's `FIREBASE_DATA_UID`, adjust your Firebase rules to allow that device account for that user path.

## Default App Values

| Setting | Default value |
| --- | --- |
| Language | `en` |
| User | `null` |
| Field size | `null` |
| Field unit | `null` |
| Crop | `null` until onboarding |
| Pump active | `false` |
| Water used | `null` |
| Energy used | `null` |
| User ID | `null` |
| Guest mode | `false` |
| Crop overrides | `{}` |
| Session timeout | 10 minutes |
| Default weather fallback | New Delhi, India |

## Sensor Defaults

| Sensor | Firebase path | Unit | Decimals | Default ideal range |
| --- | --- | --- | --- | --- |
| Soil Moisture | `users/{uid}/sensors/moisture` | `%` | `0` | Uses selected crop |
| Soil Temp | `users/{uid}/sensors/temp` | `C` | `1` | Uses selected crop |
| Air Humidity | `users/{uid}/sensors/humidity` | `%` | `1` | `40-80` |
| pH Level | `users/{uid}/sensors/ph` | none | `1` | Uses selected crop |
| Nutrients/TDS | `users/{uid}/sensors/tds` | `ppm` | `0` | Uses selected crop |

Each sensor starts with this default runtime state:

```js
{
    val: null,
    trend: "stable",
    history: []
}
```

## Crop Default Values

| Crop | Water demand | Moisture % | Temp C | pH | TDS ppm | Start pump below % | Stop pump above % |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Rice | Very High | `75-90` | `20-35` | `5.5-6.5` | `400-600` | `70` | `90` |
| Paddy | Very High | `80-100` | `22-32` | `5.5-7.0` | `300-500` | `75` | `95` |
| Potato | Low to Moderate | `50-70` | `15-20` | `5.0-6.0` | `600-800` | `45` | `65` |
| Mixed Vegetables | Moderate | `60-80` | `18-25` | `6.0-7.0` | `500-700` | `55` | `75` |
| Wheat (Gehunu) | Moderate | `50-65` | `10-25` | `6.0-7.5` | `400-600` | `45` | `60` |
| Tea | High but well-drained | `60-75` | `13-28` | `4.5-5.5` | `300-500` | `55` | `70` |
| General Crop | Moderate | `50-70` | `15-30` | `6.0-7.0` | `400-600` | `45` | `65` |

## Onboarding Defaults

The onboarding form does not hard-code a farmer name or land size. The user enters those values.

Available crop choices:

- Rice
- Paddy
- Potato
- Vegetables
- Wheat/Gehunu
- Tea
- Other

Available land units:

- Bigha
- Katha

## Language Defaults

Default language: English (`en`)

Available language codes:

```text
en, hi, bn, te, mr, ta, gu, ur, pa, as
```

## Pump Command Defaults

| Value | Meaning |
| --- | --- |
| `users/{uid}/pump/command = "start"` | Request pump start |
| `users/{uid}/pump/command = "stop"` | Request pump stop |
| `users/{uid}/pump/status = "on"` | Pump is running |
| `users/{uid}/pump/status = "off"` | Pump is stopped |

The app starts with pump state set to `false` until Firebase sends a status value.

## Security Notes

- Do not commit private Wi-Fi passwords, personal emails, private Firebase rules, or service account files.
- Firebase web config values are public identifiers, but this README uses placeholders so project-specific information is not exposed.
- Use Firebase Authentication and per-user database rules before production deployment.

## Deployment

The app can be deployed as a static website because it uses HTML, CSS, JavaScript, CDN scripts, Firebase, and browser APIs.

Common options:

- GitHub Pages
- Firebase Hosting
- Netlify
- Vercel

Before deploying, verify that `js/app.js` contains your own Firebase config and that Authentication and Realtime Database are enabled.
