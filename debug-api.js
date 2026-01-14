
const WAQI_TOKEN = process.env.WAQI_API_TOKEN || 'demo';
const CITY = 'Delhi';

async function checkAPI() {
    const url = `https://api.waqi.info/search/?keyword=${CITY}&token=${WAQI_TOKEN}`;
    console.log('Fetching:', url);

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.status !== 'ok') {
            console.error('API Error:', data.data);
            return;
        }

        console.log(`Found ${data.data.length} stations.`);
        if (data.data.length > 0) {
            console.log('Sample Station Data:', JSON.stringify(data.data[0], null, 2));
        }
    } catch (error) {
        console.error('Fetch failed:', error);
    }
}

checkAPI();
