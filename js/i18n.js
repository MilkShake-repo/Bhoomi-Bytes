const defaultTranslations = {
    en: {
        app_title: "Bhoomi Bytes",
        login_subtitle: "Smart Farm Monitoring System",
        btn_email_login: "Email Login",
        btn_guest_access: "Guest Access",
        label_email: "Email",
        label_password: "Password",
        label_name: "Full Name",
        btn_sign_in: "Sign In",
        btn_sign_up: "Create Account",
        btn_save_settings: "Save Settings",
        btn_forgot_password: "Forgot password?",
        btn_delete_account: "Delete Account",
        toggle_signup: "No account? Create one",
        toggle_signup_prefix: "No account?",
        toggle_signup_action: "Create one",
        toggle_login: "Already have account? Sign in",
        toggle_login_prefix: "Already have account?",
        toggle_login_action: "Sign in",
        guest_access_desc: "Use the app without creating an account. Guest access expires automatically after 10 minutes.",
        btn_continue_guest: "Continue as Guest",
        btn_google_login: "Continue with Google",
        login_email_divider: "or use email",
        login_email_placeholder: "Enter email",
        login_password_placeholder: "Enter password",
        signup_name_placeholder: "Enter name",
        signup_password_placeholder: "Min 6 characters",
        signup_provider_note: "Create your farm account with email, or use Google above for faster access.",
        session_timeout_note: "For security, inactive users are logged out after 10 minutes.",
        modal_farm_settings_title: "Farm Settings",
        onboarding_title: "System Initialization",
        onboarding_subtitle: "Configure AI parameters for your sector",
        label_field_size: "Field Size",
        label_unit: "Unit",
        unit_bigha: "Bigha",
        unit_katha: "Katha",
        label_crop_type: "Target Crop",
        crop_rice: "Rice",
        crop_paddy: "Paddy",
        crop_potato: "Potato",
        crop_vegetables: "Vegetables",
        crop_gehunu: "Wheat",
        crop_tea: "Tea",
        crop_other: "Other",
        btn_initialize: "Initialize System",
        panel_system_status: "System Status",
        status_online: "Online",
        info_operator: "Operator:",
        info_sector: "Sector Size:",
        info_crop: "Active Crop:",
        info_water_used: "Water Used:",
        info_energy_used: "Energy Used:",
        info_device_uid: "Device ID:",
        panel_weather: "Weather Data",
        weather_clear: "Clear Skies",
        weather_hot: "Scorching Heat",
        weather_cloudy: "Overcast",
        weather_rainy: "Heavy Rain",
        weather_storm: "Thunderstorm",
        weather_rain: "Rain",
        weather_humid: "Hum",
        weather_impact_normal: "Ideal conditions. No rain expected.",
        weather_impact_hot: "High evaporation. Increase irrigation frequency.",
        weather_impact_cloudy: "Low evaporation. Normal irrigation.",
        weather_impact_rainy: "Stop irrigation. Prevent waterlogging.",
        weather_impact_storm: "Critical: Secure field. Suspend all operations.",
        panel_ai_analysis: "AI Farming Analysis",
        ai_water_demand: "Water Demand",
        ai_crop_health: "Crop Health",
        ai_soil_status: "Soil Status",
        ai_action_req: "Recommended Action:",
        ai_rec_start_pump: "Soil moisture dropping below critical threshold. Initiate pump.",
        ai_rec_stop_pump: "Soil moisture optimal. Stop pump to prevent waterlogging.",
        ai_rec_normal: "All parameters nominal. No immediate action required.",
        ai_rec_weather_wait: "Rain expected. Delay irrigation to save water and power.",
        section_telemetry: "Live Field Data",
        sensor_moisture: "Soil Moisture",
        sensor_temp: "Soil Temp",
        sensor_humidity: "Air Humidity",
        sensor_ph: "pH Level",
        sensor_tds: "TDS (Nutrients)",
        interp_low: "Low",
        interp_normal: "Normal",
        interp_high: "High",
        interp_critical: "Critical",
        interp_optimal: "Optimal",
        interp_waiting: "Waiting",
        ai_rec_no_data: "Sensor data not available. Please check ESP32 connection.",
        panel_pump_control: "Remote Pump Control",
        pump_off: "PUMP OFF",
        pump_on: "PUMP ON",
        pump_conn: "CONNECTING...",
        label_esp32_relay: "ESP32 Relay",
        log_sys_ready: "System ready. Relay connection verified.",
        btn_start_pump: "START PUMP",
        btn_stop_pump: "STOP PUMP",
        modal_confirm_title: "Confirm Action",
        btn_cancel: "Cancel",
        btn_execute: "Execute",
        modal_add_field_title: "Add New Field",
        label_field_name: "Field Name",
        btn_add_field: "Add Field",
        info_field_id: "Field ID:",
        label_account_delete: "Account Delete",
        label_field_delete: "Delete Field",
        btn_delete_field: "Delete Field",
        confirm_delete_title: "Delete Field?"
    }
};

let translations = { ...defaultTranslations };

async function loadTranslationFile() {
    try {
        const response = await fetch('js/translations.json', { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const loadedTranslations = await response.json();
        translations = {
            ...defaultTranslations,
            ...loadedTranslations,
            en: {
                ...defaultTranslations.en,
                ...(loadedTranslations.en || {})
            }
        };
    } catch (error) {
        console.warn('Translation file could not be loaded.', error);
        translations = { ...defaultTranslations };
    }
}

function getTranslation(lang, key) {
    return translations[lang]?.[key] || translations.en?.[key] || null;
}

function translateElement(element, lang) {
    const key = element.getAttribute('data-i18n');
    const text = getTranslation(lang, key);
    if (!text) return;

    if (element.tagName === 'INPUT' && element.hasAttribute('placeholder')) {
        element.placeholder = text;
        return;
    }

    element.innerText = text;
}

function applyTranslations(lang) {
    document.querySelectorAll('[data-i18n]').forEach((element) => {
        translateElement(element, lang);
    });

    if (typeof refreshDynamicTranslations === 'function') {
        refreshDynamicTranslations(lang);
    }
}
