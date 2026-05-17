const cropData = {
    rice: {
        name: "Rice",
        waterDemand: "Very High",
        moistureIdeal: [75, 90], // %
        tempIdeal: [20, 35], // °C
        phIdeal: [5.5, 6.5],
        tdsIdeal: [400, 600], // ppm
        irrigationRules: {
            criticalMoisture: 70, // Start pump below this
            stopMoisture: 90 // Stop pump above this
        }
    },
    paddy: {
        name: "Paddy",
        waterDemand: "Very High",
        moistureIdeal: [80, 100],
        tempIdeal: [22, 32],
        phIdeal: [5.5, 7.0],
        tdsIdeal: [300, 500],
        irrigationRules: {
            criticalMoisture: 75,
            stopMoisture: 95
        }
    },
    potato: {
        name: "Potato",
        waterDemand: "Low to Moderate",
        moistureIdeal: [50, 70],
        tempIdeal: [15, 20],
        phIdeal: [5.0, 6.0],
        tdsIdeal: [600, 800],
        irrigationRules: {
            criticalMoisture: 45,
            stopMoisture: 65
        }
    },
    vegetables: {
        name: "Mixed Vegetables",
        waterDemand: "Moderate",
        moistureIdeal: [60, 80],
        tempIdeal: [18, 25],
        phIdeal: [6.0, 7.0],
        tdsIdeal: [500, 700],
        irrigationRules: {
            criticalMoisture: 55,
            stopMoisture: 75
        }
    },
    gehunu: {
        name: "Wheat (Gehunu)",
        waterDemand: "Moderate",
        moistureIdeal: [50, 65],
        tempIdeal: [10, 25],
        phIdeal: [6.0, 7.5],
        tdsIdeal: [400, 600],
        irrigationRules: {
            criticalMoisture: 45,
            stopMoisture: 60
        }
    },
    tea: {
        name: "Tea",
        waterDemand: "High but well-drained",
        moistureIdeal: [60, 75],
        tempIdeal: [13, 28],
        phIdeal: [4.5, 5.5],
        tdsIdeal: [300, 500],
        irrigationRules: {
            criticalMoisture: 55,
            stopMoisture: 70
        }
    },
    other: {
        name: "General Crop",
        waterDemand: "Moderate",
        moistureIdeal: [50, 70],
        tempIdeal: [15, 30],
        phIdeal: [6.0, 7.0],
        tdsIdeal: [400, 600],
        irrigationRules: {
            criticalMoisture: 45,
            stopMoisture: 65
        }
    }
};

const wmoCodes = {
    0: { desc: "Clear sky", icon: "fa-sun" },
    1: { desc: "Mainly clear", icon: "fa-sun" },
    2: { desc: "Partly cloudy", icon: "fa-cloud-sun" },
    3: { desc: "Overcast", icon: "fa-cloud" },
    45: { desc: "Fog", icon: "fa-smog" },
    48: { desc: "Depositing rime fog", icon: "fa-smog" },
    51: { desc: "Light drizzle", icon: "fa-cloud-rain" },
    53: { desc: "Moderate drizzle", icon: "fa-cloud-rain" },
    55: { desc: "Dense drizzle", icon: "fa-cloud-showers-heavy" },
    56: { desc: "Light freezing drizzle", icon: "fa-cloud-rain" },
    57: { desc: "Dense freezing drizzle", icon: "fa-cloud-showers-heavy" },
    61: { desc: "Slight rain", icon: "fa-cloud-rain" },
    63: { desc: "Moderate rain", icon: "fa-cloud-showers-heavy" },
    65: { desc: "Heavy rain", icon: "fa-cloud-showers-water" },
    66: { desc: "Light freezing rain", icon: "fa-cloud-rain" },
    67: { desc: "Heavy freezing rain", icon: "fa-cloud-showers-water" },
    71: { desc: "Slight snow fall", icon: "fa-snowflake" },
    73: { desc: "Moderate snow fall", icon: "fa-snowflake" },
    75: { desc: "Heavy snow fall", icon: "fa-snowflake" },
    77: { desc: "Snow grains", icon: "fa-snowflake" },
    80: { desc: "Slight rain showers", icon: "fa-cloud-rain" },
    81: { desc: "Moderate rain showers", icon: "fa-cloud-showers-heavy" },
    82: { desc: "Violent rain showers", icon: "fa-cloud-showers-water" },
    85: { desc: "Slight snow showers", icon: "fa-snowflake" },
    86: { desc: "Heavy snow showers", icon: "fa-snowflake" },
    95: { desc: "Thunderstorm", icon: "fa-cloud-bolt" },
    96: { desc: "Thunderstorm with light hail", icon: "fa-cloud-bolt" },
    99: { desc: "Thunderstorm with heavy hail", icon: "fa-cloud-bolt" }
};
