const appConfig = {
    languages: [
        { code: 'en', label: 'English' },
        { code: 'hi', label: '\u0939\u093f\u0928\u094d\u0926\u0940' },
        { code: 'bn', label: '\u09ac\u09be\u0982\u09b2\u09be' },
        { code: 'te', label: '\u0c24\u0c46\u0c32\u0c41\u0c17\u0c41' },
        { code: 'mr', label: '\u092e\u0930\u093e\u0920\u0940' },
        { code: 'ta', label: '\u0ba4\u0bae\u0bbf\u0bb4\u0bcd' },
        { code: 'gu', label: '\u0a97\u0ac1\u0a9c\u0ab0\u0abe\u0aa4\u0ac0' },
        { code: 'ur', label: '\u0627\u0631\u062f\u0648' },
        { code: 'pa', label: '\u0a2a\u0a70\u0a1c\u0a3e\u0a2c\u0a40' },
        { code: 'as', label: '\u0985\u09b8\u09ae\u09c0\u09af\u09bc\u09be' }
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
            chartColor: '#0ea5e9',
            chartFill: 'rgba(14, 165, 233, 0.22)',
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
            chartColor: '#ef4444',
            chartFill: 'rgba(239, 68, 68, 0.18)',
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
            chartColor: '#22c55e',
            chartFill: 'rgba(34, 197, 94, 0.18)',
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
            chartColor: '#8b5cf6',
            chartFill: 'rgba(139, 92, 246, 0.16)',
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
            chartColor: '#f97316',
            chartFill: 'rgba(249, 115, 22, 0.16)',
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
        wheat: {
            name: 'Wheat',
            waterDemand: 'Moderate',
            moistureIdeal: [50, 65],
            tempIdeal: [10, 25],
            phIdeal: [6.0, 7.5],
            tdsIdeal: [400, 600],
            irrigationRules: { criticalMoisture: 45, stopMoisture: 60 }
        },
        fruits: {
            name: 'Fruits',
            waterDemand: 'Moderate to High',
            moistureIdeal: [55, 75],
            tempIdeal: [18, 32],
            phIdeal: [5.8, 7.0],
            tdsIdeal: [450, 750],
            irrigationRules: { criticalMoisture: 50, stopMoisture: 72 }
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
