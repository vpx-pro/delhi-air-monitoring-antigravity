export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
}

function deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
}

export type AQIStatus = {
    label: string;
    color: string;
    message: string;
    isSafe: boolean;
};

export function getAQIStatus(aqi: number): AQIStatus {
    if (aqi <= 50) {
        return {
            label: 'Good',
            color: '#10b981', // green-500
            message: 'Air quality is satisfactory, and air pollution poses little or no risk.',
            isSafe: true
        };
    } else if (aqi <= 100) {
        return {
            label: 'Moderate',
            color: '#eab308', // yellow-500
            message: 'Air quality is acceptable. However, there may be a risk for some people.',
            isSafe: true
        };
    } else if (aqi <= 150) {
        return {
            label: 'Unhealthy for Sensitive Groups',
            color: '#f97316', // orange-500
            message: 'Members of sensitive groups may experience health effects.',
            isSafe: false
        };
    } else if (aqi <= 200) {
        return {
            label: 'Unhealthy',
            color: '#ef4444', // red-500
            message: 'Everyone may begin to experience health effects.',
            isSafe: false
        };
    } else if (aqi <= 300) {
        return {
            label: 'Very Unhealthy',
            color: '#a855f7', // purple-500
            message: 'Health warnings of emergency conditions. The entire population is more likely to be affected.',
            isSafe: false
        };
    } else {
        return {
            label: 'Hazardous',
            color: '#7f1d1d', // red-900 (custom dark red)
            message: 'Health alert: everyone may experience more serious health effects.',
            isSafe: false
        };
    }
}
