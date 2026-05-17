const appConfig = {
    languages: [
        { code: 'en', label: 'English' },
        { code: 'hi', label: 'Hindi' },
        { code: 'bn', label: 'Bengali' },
        { code: 'te', label: 'Telugu' },
        { code: 'mr', label: 'Marathi' },
        { code: 'ta', label: 'Tamil' },
        { code: 'gu', label: 'Gujarati' },
        { code: 'ur', label: 'Urdu' },
        { code: 'pa', label: 'Punjabi' },
        { code: 'as', label: 'Assamese' }
    ],

    sensors: [
        {
            key: 'moisture',
            labelKey: 'sensor_moisture',
            fallbackLabel: 'Soil Moisture',
            firebasePath: 'sensors/moisture',
            unit: '%',
            decimals: 0,
            icon: 'fa-water',
            chartCanvasId: 'chartMoisture',
            chartColor: '#339af0',
            chartFill: 'rgba(51, 154, 240, 0.4)',
            idealRangeKey: 'moistureIdeal'
        },
        {
            key: 'temp',
            labelKey: 'sensor_temp',
            fallbackLabel: 'Soil Temp',
            firebasePath: 'sensors/temp',
            unit: '&deg;C',
            decimals: 1,
            icon: 'fa-temperature-high',
            chartCanvasId: 'chartTemp',
            chartColor: '#ff8787',
            chartFill: 'rgba(255, 135, 135, 0.4)',
            idealRangeKey: 'tempIdeal'
        },
        {
            key: 'humidity',
            labelKey: 'sensor_humidity',
            fallbackLabel: 'Air Humidity',
            firebasePath: 'sensors/humidity',
            unit: '%',
            decimals: 1,
            icon: 'fa-cloud',
            chartCanvasId: 'chartHumidity',
            chartColor: '#51cf66',
            chartFill: 'rgba(81, 207, 102, 0.4)',
            idealRange: [40, 80]
        },
        {
            key: 'ph',
            labelKey: 'sensor_ph',
            fallbackLabel: 'pH Level',
            firebasePath: 'sensors/ph',
            unit: '',
            decimals: 1,
            icon: 'fa-flask',
            chartCanvasId: 'chartPh',
            chartColor: '#845ef7',
            chartFill: 'rgba(132, 94, 247, 0.4)',
            idealRangeKey: 'phIdeal'
        },
        {
            key: 'tds',
            labelKey: 'sensor_tds',
            fallbackLabel: 'Nutrients',
            firebasePath: 'sensors/tds',
            unit: 'ppm',
            decimals: 0,
            icon: 'fa-seedling',
            chartCanvasId: 'chartTds',
            chartColor: '#f06595',
            chartFill: 'rgba(240, 101, 149, 0.4)',
            idealRangeKey: 'tdsIdeal'
        }
    ],

    crops: {
        rice: {
            name: 'Rice',
            waterDemand: 'Very High',
            moistureIdeal: [75, 90],
            tempIdeal: [20, 35],
            phIdeal: [5.5, 6.5],
            tdsIdeal: [400, 600],
            irrigationRules: { criticalMoisture: 70, stopMoisture: 90 }
        },
        paddy: {
            name: 'Paddy',
            waterDemand: 'Very High',
            moistureIdeal: [80, 100],
            tempIdeal: [22, 32],
            phIdeal: [5.5, 7.0],
            tdsIdeal: [300, 500],
            irrigationRules: { criticalMoisture: 75, stopMoisture: 95 }
        },
        potato: {
            name: 'Potato',
            waterDemand: 'Low to Moderate',
            moistureIdeal: [50, 70],
            tempIdeal: [15, 20],
            phIdeal: [5.0, 6.0],
            tdsIdeal: [600, 800],
            irrigationRules: { criticalMoisture: 45, stopMoisture: 65 }
        },
        vegetables: {
            name: 'Mixed Vegetables',
            waterDemand: 'Moderate',
            moistureIdeal: [60, 80],
            tempIdeal: [18, 25],
            phIdeal: [6.0, 7.0],
            tdsIdeal: [500, 700],
            irrigationRules: { criticalMoisture: 55, stopMoisture: 75 }
        },
        gehunu: {
            name: 'Wheat (Gehunu)',
            waterDemand: 'Moderate',
            moistureIdeal: [50, 65],
            tempIdeal: [10, 25],
            phIdeal: [6.0, 7.5],
            tdsIdeal: [400, 600],
            irrigationRules: { criticalMoisture: 45, stopMoisture: 60 }
        },
        tea: {
            name: 'Tea',
            waterDemand: 'High but well-drained',
            moistureIdeal: [60, 75],
            tempIdeal: [13, 28],
            phIdeal: [4.5, 5.5],
            tdsIdeal: [300, 500],
            irrigationRules: { criticalMoisture: 55, stopMoisture: 70 }
        },
        other: {
            name: 'General Crop',
            waterDemand: 'Moderate',
            moistureIdeal: [50, 70],
            tempIdeal: [15, 30],
            phIdeal: [6.0, 7.0],
            tdsIdeal: [400, 600],
            irrigationRules: { criticalMoisture: 45, stopMoisture: 65 }
        }
    }
};
