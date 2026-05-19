#ifndef WEBPAGE_H
#define WEBPAGE_H

const char LOGIN_HTML[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bhoomi Bytes - Controller Login</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --bg-color: #0b0c10;
            --card-bg: rgba(26, 29, 38, 0.65);
            --primary: #40c057;
            --primary-hover: #37b24d;
            --text-color: #e9ecef;
            --text-muted: #909296;
            --border: rgba(255, 255, 255, 0.08);
            --danger: #ff6b6b;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Outfit', sans-serif;
        }

        body {
            background-color: var(--bg-color);
            background-image: 
                radial-gradient(circle at 10% 20%, rgba(64, 192, 87, 0.05) 0%, transparent 40%),
                radial-gradient(circle at 90% 80%, rgba(51, 154, 240, 0.05) 0%, transparent 40%);
            background-size: cover;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            color: var(--text-color);
            padding: 20px;
        }

        .login-container {
            width: 100%;
            max-width: 420px;
            background: var(--card-bg);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 40px 30px;
            box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5);
            text-align: center;
            animation: fadeIn 0.6s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .logo {
            font-size: 2.2rem;
            font-weight: 700;
            background: linear-gradient(135deg, #40c057 0%, #339af0 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 8px;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 10px;
        }

        .logo i {
            background: linear-gradient(135deg, #40c057 0%, #339af0 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .subtitle {
            font-size: 0.95rem;
            color: var(--text-muted);
            margin-bottom: 35px;
        }

        .input-group {
            margin-bottom: 20px;
            text-align: left;
            position: relative;
        }

        .input-group label {
            display: block;
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--text-muted);
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .input-wrapper {
            position: relative;
        }

        .input-wrapper i {
            position: absolute;
            left: 15px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-muted);
            font-size: 1rem;
            transition: color 0.3s;
        }

        .input-wrapper input {
            width: 100%;
            padding: 14px 15px 14px 45px;
            background: rgba(15, 17, 23, 0.6);
            border: 1px solid var(--border);
            border-radius: 12px;
            color: var(--text-color);
            font-size: 1rem;
            outline: none;
            transition: all 0.3s;
        }

        .input-wrapper input:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(64, 192, 87, 0.15);
        }

        .input-wrapper input:focus + i {
            color: var(--primary);
        }

        .btn-submit {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, var(--primary) 0%, #2f9e44 100%);
            border: none;
            border-radius: 12px;
            color: white;
            font-size: 1rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s;
            margin-top: 10px;
            box-shadow: 0 4px 12px rgba(64, 192, 87, 0.2);
        }

        .btn-submit:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(64, 192, 87, 0.3);
        }

        .btn-submit:active {
            transform: translateY(0);
        }

        .error-message {
            background: rgba(255, 107, 107, 0.1);
            border: 1px solid var(--danger);
            color: var(--danger);
            padding: 12px;
            border-radius: 10px;
            font-size: 0.9rem;
            margin-bottom: 20px;
            display: none;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="logo">
            <i class="fa-solid fa-leaf"></i> Bhoomi Bytes
        </div>
        <div class="subtitle">Controller Web Configuration Panel</div>
        
        <div class="error-message" id="errorBlock">
            <i class="fa-solid fa-circle-exclamation"></i> Invalid username or password.
        </div>

        <form action="/login" method="POST" id="loginForm">
            <div class="input-group">
                <label>Username</label>
                <div class="input-wrapper">
                    <input type="text" name="username" placeholder="Enter admin username" required>
                    <i class="fa-solid fa-user"></i>
                </div>
            </div>

            <div class="input-group">
                <label>Password</label>
                <div class="input-wrapper">
                    <input type="password" name="password" placeholder="Enter admin password" required>
                    <i class="fa-solid fa-lock"></i>
                </div>
            </div>

            <button type="submit" class="btn-submit">
                <i class="fa-solid fa-right-to-bracket"></i> Authenticate
            </button>
        </form>
    </div>

    <script>
        // Check url query for error flag
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('error') === '1') {
            document.getElementById('errorBlock').style.display = 'block';
        }
    </script>
</body>
</html>
)rawliteral";

const char INDEX_HTML[] PROGMEM = R"rawliteral(
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bhoomi Bytes - Controller Config</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root {
            --bg-color: #0b0c10;
            --card-bg: rgba(26, 29, 38, 0.65);
            --primary: #40c057;
            --primary-hover: #37b24d;
            --text-color: #e9ecef;
            --text-muted: #909296;
            --border: rgba(255, 255, 255, 0.08);
            --danger: #ff6b6b;
            --warning: #fcc419;
            --blue: #339af0;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
            font-family: 'Outfit', sans-serif;
        }

        body {
            background-color: var(--bg-color);
            background-image: 
                radial-gradient(circle at 10% 20%, rgba(64, 192, 87, 0.03) 0%, transparent 40%),
                radial-gradient(circle at 90% 80%, rgba(51, 154, 240, 0.03) 0%, transparent 40%);
            background-size: cover;
            min-height: 100vh;
            color: var(--text-color);
            padding: 40px 20px;
        }

        .dashboard-container {
            max-width: 800px;
            margin: 0 auto;
            animation: fadeIn 0.6s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 40px;
            border-bottom: 1px solid var(--border);
            padding-bottom: 20px;
        }

        .brand {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .brand i {
            font-size: 2.2rem;
            background: linear-gradient(135deg, #40c057 0%, #339af0 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .brand h1 {
            font-size: 1.8rem;
            font-weight: 700;
            background: linear-gradient(135deg, #40c057 0%, #339af0 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .btn-logout {
            padding: 8px 16px;
            background: rgba(255, 107, 107, 0.1);
            border: 1px solid var(--danger);
            border-radius: 8px;
            color: var(--danger);
            font-weight: 600;
            font-size: 0.9rem;
            cursor: pointer;
            text-decoration: none;
            transition: all 0.3s;
        }

        .btn-logout:hover {
            background: var(--danger);
            color: white;
        }

        .alert-box {
            background: rgba(51, 154, 240, 0.1);
            border: 1px solid var(--blue);
            color: #d0ebff;
            border-radius: 12px;
            padding: 16px 20px;
            margin-bottom: 30px;
            display: flex;
            align-items: center;
            gap: 15px;
            font-size: 0.95rem;
        }

        .alert-box i {
            font-size: 1.2rem;
        }

        .backup-alert {
            display: none;
            background: rgba(252, 196, 25, 0.1);
            border-color: var(--warning);
            color: #fff3bf;
        }

        form {
            display: flex;
            flex-direction: column;
            gap: 30px;
        }

        .card {
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 30px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
        }

        .card-title {
            font-size: 1.2rem;
            font-weight: 700;
            margin-bottom: 25px;
            color: #f1f3f5;
            display: flex;
            align-items: center;
            gap: 10px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            padding-bottom: 12px;
        }

        .card-title i {
            color: var(--primary);
        }

        .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }

        @media (max-width: 600px) {
            .grid-2 {
                grid-template-columns: 1fr;
            }
        }

        .grid-3 {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 15px;
        }

        @media (max-width: 600px) {
            .grid-3 {
                grid-template-columns: 1fr;
            }
        }

        .form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-bottom: 15px;
        }

        .form-group label {
            font-size: 0.85rem;
            font-weight: 600;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .form-group input,
        .form-group select {
            padding: 12px 16px;
            background: rgba(15, 17, 23, 0.6);
            border: 1px solid var(--border);
            border-radius: 10px;
            color: var(--text-color);
            font-size: 0.95rem;
            outline: none;
            transition: all 0.3s;
        }

        .form-group input:focus,
        .form-group select:focus {
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(64, 192, 87, 0.12);
        }

        .action-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
        }

        @media (max-width: 600px) {
            .action-row {
                grid-template-columns: 1fr;
            }
        }

        .btn-save,
        .btn-reset {
            padding: 16px;
            border: none;
            border-radius: 12px;
            color: white;
            font-size: 1.1rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s;
            box-shadow: 0 4px 15px rgba(64, 192, 87, 0.2);
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 10px;
        }

        .btn-save {
            background: linear-gradient(135deg, var(--primary) 0%, #2f9e44 100%);
        }

        .btn-reset {
            background: linear-gradient(135deg, var(--danger) 0%, #c92a2a 100%);
            box-shadow: 0 4px 15px rgba(255, 107, 107, 0.2);
        }

        .btn-save:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(64, 192, 87, 0.3);
        }

        .btn-reset:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(255, 107, 107, 0.3);
        }

        .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 0.85rem;
            color: var(--text-muted);
        }

        /* Success screen modal */
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(11, 12, 16, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            display: none;
        }

        .modal-content {
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 40px;
            max-width: 450px;
            width: 90%;
            text-align: center;
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
        }

        .success-icon {
            font-size: 4rem;
            color: var(--primary);
            margin-bottom: 20px;
            animation: scaleUp 0.5s ease-out;
        }

        @keyframes scaleUp {
            0% { transform: scale(0.5); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
        }

        .modal-content h2 {
            font-size: 1.6rem;
            font-weight: 700;
            margin-bottom: 15px;
        }

        .modal-content p {
            color: var(--text-muted);
            font-size: 0.95rem;
            line-height: 1.5;
            margin-bottom: 25px;
        }

        .reboot-loader {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
        }

        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(64, 192, 87, 0.1);
            border-top: 4px solid var(--primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="dashboard-container">
        <header>
            <div class="brand">
                <i class="fa-solid fa-leaf"></i>
                <h1>Bhoomi Bytes</h1>
            </div>
            <a href="/logout" class="btn-logout"><i class="fa-solid fa-right-from-bracket"></i> Logout</a>
        </header>

        <div class="alert-box">
            <i class="fa-solid fa-circle-info"></i>
            <div>
                <strong>Active Controller Configuration:</strong> <span id="connectionStatus">Update values below and save. The controller will automatically apply preferences and reboot.</span>
            </div>
        </div>

        <div class="alert-box backup-alert" id="backupNotice">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <div>
                <strong>Backup WiFi Active:</strong> The controller is connected through the backup network. Review the primary WiFi values below, then save or reset defaults.
            </div>
        </div>

        <form action="/save" method="POST" id="configForm">
            <!-- WiFi Credentials -->
            <div class="card">
                <div class="card-title">
                    <i class="fa-solid fa-wifi"></i> WiFi Connection Profiles
                </div>
                <div class="grid-2">
                    <div class="form-group">
                        <label>Primary SSID</label>
                        <input type="text" name="wifi_ssid_1" id="wifi_ssid_1" placeholder="Primary WiFi SSID" required>
                    </div>
                    <div class="form-group">
                        <label>Primary Password</label>
                        <input type="password" name="wifi_password_1" id="wifi_password_1" placeholder="Primary Password">
                    </div>
                </div>
                <div class="grid-2">
                    <div class="form-group">
                        <label>Backup SSID</label>
                        <input type="text" name="wifi_ssid_2" id="wifi_ssid_2" placeholder="Backup WiFi SSID">
                    </div>
                    <div class="form-group">
                        <label>Backup Password</label>
                        <input type="password" name="wifi_password_2" id="wifi_password_2" placeholder="Backup Password">
                    </div>
                </div>
            </div>

            <!-- Device Link -->
            <div class="card">
                <div class="card-title">
                    <i class="fa-solid fa-link"></i> Bhoomi Bytes Device Link
                </div>
                <div class="form-group">
                    <label>Bhoomi Account Email</label>
                    <input type="email" name="fb_email" id="fb_email" placeholder="Email used for login">
                </div>
                <div class="form-group">
                    <label>Bhoomi Account Password</label>
                    <input type="password" name="fb_password" id="fb_password" placeholder="Account password">
                </div>
                <div class="form-group">
                    <label>Target Field ID</label>
                    <input type="text" name="fb_field_id" id="fb_field_id" placeholder="Paste active field ID">
                </div>
                <div class="form-group">
                    <label>Device ID</label>
                    <input type="text" name="fb_device_token" id="fb_device_token" placeholder="Paste device_1, device_2, etc.">
                    <span id="deviceTokenHint" style="font-size:0.8rem; margin-top:4px; display:none;"></span>
                </div>
            </div>

            <!-- Hardware Pin Mappings -->
            <div class="card">
                <div class="card-title">
                    <i class="fa-solid fa-microchip"></i> ESP32 Hardware Pin Mappings
                </div>
                <div class="grid-3">
                    <div class="form-group">
                        <label>Moisture Sensor (GPIO)</label>
                        <input type="number" name="pin_moisture" id="pin_moisture" min="0" max="48" required>
                    </div>
                    <div class="form-group">
                        <label>pH Sensor (GPIO)</label>
                        <input type="number" name="pin_ph" id="pin_ph" min="0" max="48" required>
                    </div>
                    <div class="form-group">
                        <label>TDS Sensor (GPIO)</label>
                        <input type="number" name="pin_tds" id="pin_tds" min="0" max="48" required>
                    </div>
                </div>
                <div class="grid-2">
                    <div class="form-group">
                        <label>Pump Relay (GPIO)</label>
                        <input type="number" name="pin_pump" id="pin_pump" min="0" max="48" required>
                    </div>
                    <div class="form-group">
                        <label>DHT22 Temp/Hum (GPIO)</label>
                        <input type="number" name="pin_dht" id="pin_dht" min="0" max="48" required>
                    </div>
                </div>
            </div>

            <div class="action-row">
                <button type="submit" class="btn-save">
                    <i class="fa-solid fa-cloud-arrow-up"></i> Save Preferences & Apply
                </button>
                <button type="button" class="btn-reset" id="resetDefaultsBtn">
                    <i class="fa-solid fa-rotate-left"></i> Reset Values & Reboot
                </button>
            </div>
        </form>

        <div class="footer">
            Bhoomi Bytes © 2026 • Premium Smart Farming Solutions
        </div>
    </div>

    <!-- Success reboot overlay -->
    <div class="modal-overlay" id="successModal">
        <div class="modal-content">
            <div class="success-icon">
                <i class="fa-solid fa-circle-check"></i>
            </div>
            <h2 id="modalTitle">Preferences Saved</h2>
            <p id="modalMessage">Your hardware pins and cloud parameters have been written to EEPROM. The ESP32 is applying configurations and rebooting...</p>
            <div class="reboot-loader">
                <div class="spinner"></div>
                <span style="color: var(--text-muted); font-size: 0.85rem;">Reconnecting to target network...</span>
            </div>
        </div>
    </div>

    <script>
        // Auto-populate fields from ESP32 state injection
        // The ESP32 will replace these JSON assignments before serving the page!
        const espState = %ESP_STATE_JSON%;

        if (espState) {
            document.getElementById('wifi_ssid_1').value = espState.wifi_ssid_1 || '';
            document.getElementById('wifi_password_1').value = espState.wifi_password_1 || '';
            document.getElementById('wifi_ssid_2').value = espState.wifi_ssid_2 || '';
            document.getElementById('wifi_password_2').value = espState.wifi_password_2 || '';
            
            document.getElementById('fb_email').value = espState.fb_email || '';
            document.getElementById('fb_password').value = espState.fb_password || '';
            document.getElementById('fb_field_id').value = espState.fb_field_id || '';
            document.getElementById('fb_device_token').value = espState.fb_device_token || '';

            document.getElementById('pin_moisture').value = espState.pin_moisture !== undefined ? espState.pin_moisture : 1;
            document.getElementById('pin_ph').value = espState.pin_ph !== undefined ? espState.pin_ph : 2;
            document.getElementById('pin_tds').value = espState.pin_tds !== undefined ? espState.pin_tds : 3;
            document.getElementById('pin_pump').value = espState.pin_pump !== undefined ? espState.pin_pump : 5;
            document.getElementById('pin_dht').value = espState.pin_dht !== undefined ? espState.pin_dht : 6;

            const profileLabel = espState.wifi_profile === 'backup' ? 'backup WiFi' :
                espState.wifi_profile === 'primary' ? 'primary WiFi' :
                espState.wifi_profile === 'ap' ? 'configuration access point' : 'network';
            document.getElementById('connectionStatus').textContent =
                'Connected through ' + profileLabel + ' at ' + (espState.ip_address || 'current IP') + '. Update values below and save.';

            if (espState.wifi_profile === 'backup') {
                document.getElementById('backupNotice').style.display = 'flex';
            }
        }

        // === Real-time Device ID validation ===
        const deviceTokenInput = document.getElementById('fb_device_token');
        const deviceTokenHint  = document.getElementById('deviceTokenHint');
        const DEVICE_TOKEN_RE  = /^device_\d+$/;

        function validateDeviceToken(value) {
            const v = value.trim();
            if (v.length === 0) {
                deviceTokenHint.style.display = 'none';
                deviceTokenInput.style.borderColor = '';
                return;
            }
            if (DEVICE_TOKEN_RE.test(v)) {
                deviceTokenHint.style.display = 'block';
                deviceTokenHint.style.color = 'var(--primary)';
                deviceTokenHint.textContent = '\u2713 Valid format (e.g. device_1)';
                deviceTokenInput.style.borderColor = 'var(--primary)';
            } else {
                deviceTokenHint.style.display = 'block';
                deviceTokenHint.style.color = 'var(--danger)';
                deviceTokenHint.textContent = '\u2717 Must be device_1, device_2, etc. \u2014 copy from Bhoomi Bytes dashboard.';
                deviceTokenInput.style.borderColor = 'var(--danger)';
            }
        }

        deviceTokenInput.addEventListener('input', function() {
            validateDeviceToken(this.value);
        });

        // Run on page load too (in case fields are pre-filled)
        validateDeviceToken(deviceTokenInput.value);

        // === Form submit validation ===
        document.getElementById('configForm').addEventListener('submit', function(e) {
            const email      = document.getElementById('fb_email').value.trim();
            const password   = document.getElementById('fb_password').value.trim();
            const fieldId    = document.getElementById('fb_field_id').value.trim();
            const deviceTok  = deviceTokenInput.value.trim();

            // Only validate cloud fields if any one of them is filled in
            const anyCloudField = email.length > 0 || password.length > 0 || fieldId.length > 0 || deviceTok.length > 0;

            if (anyCloudField) {
                if (email.length === 0 || password.length === 0) {
                    e.preventDefault();
                    alert('Bhoomi account email and password are required when configuring the cloud link.');
                    document.getElementById('fb_email').focus();
                    return;
                }
                if (fieldId.length === 0) {
                    e.preventDefault();
                    alert('Target Field ID is required. Paste the active Field ID shown in the Bhoomi Bytes dashboard.');
                    document.getElementById('fb_field_id').focus();
                    return;
                }
                if (!DEVICE_TOKEN_RE.test(deviceTok)) {
                    e.preventDefault();
                    alert('Device ID must be in the format device_1, device_2, etc.\nCopy it from the Bhoomi Bytes dashboard \u2192 Settings \u2192 Device ID.\nA wrong Device ID will be rejected by the controller and will NOT be saved to the database.');
                    deviceTokenInput.focus();
                    return;
                }
            }

            document.getElementById('modalTitle').textContent = 'Preferences Saved';
            document.getElementById('modalMessage').textContent = 'Your hardware pins and cloud parameters have been written to EEPROM. The ESP32 is applying configurations and rebooting...';
            document.getElementById('successModal').style.display = 'flex';
        });

        document.getElementById('resetDefaultsBtn').addEventListener('click', function() {
            if (!confirm('Reset all saved configuration values to config_defaults.h and reboot the ESP32?')) {
                return;
            }

            document.getElementById('modalTitle').textContent = 'Defaults Restored';
            document.getElementById('modalMessage').textContent = 'All saved configuration values are being reset from config_defaults.h. The ESP32 is rebooting...';
            document.getElementById('successModal').style.display = 'flex';

            fetch('/reset', { method: 'POST' }).catch(function() {});
        });
    </script>
</body>
</html>
)rawliteral";

#endif
