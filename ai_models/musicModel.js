const axios = require('axios');

const generateMusic = async (prompt, makeInstrumental = true, waitAudio = true) => {
    const url = 'https://api.aimlapi.com/generate';
    const headers = {
        'Authorization': `Bearer ${process.env.API_KEY}`,
        'Content-Type': 'application/json'
    };
    const payload = {
        'prompt': prompt,
        'make_instrumental': makeInstrumental,
        'wait_audio': waitAudio
    };

    try {
        const response = await axios.post(url, payload, { headers: headers });

        console.log('API Response:', response.data);

        const musicData = response.data.map(track => ({
            id: track.id,
            title: track.title,
            image_url: track.image_url,
            audio_url: track.audio_url,
            model_name: track.model_name,
            tags: track.tags,
        }));

        return musicData;
    } catch (error) {
        if (error.response && error.response.data) {
            const errorMessage = Buffer.from(error.response.data).toString('utf8');
            console.error("Error generating music:", errorMessage);
        } else {
            console.error("Error generating music:", error.message);
        }
        throw new Error('Failed to generate music.');
    }
};

// const fetchMusicDetails = async (musicIds) => {
//     const url = `https://api.aimlapi.com/?${musicIds.map((id, index) => `ids[${index}]=${id}`).join('&')}`;
//     const headers = {
//         'Authorization': `Bearer ${process.env.API_KEY}`,
//         'Content-Type': 'application/json'
//     };

//     try {
//         const response = await axios.get(url, { headers });
//         return response.data;
//     } catch (error) {
//         console.error("Error fetching music details:", error.message);
//         throw new Error('Failed to fetch music details.');
//     }
// };



const fetchMusicDetails = async (musicIds) => {
    const url = `https://api.aimlapi.com/?${musicIds.map((id, index) => `ids[${index}]=${id}`).join('&')}`;
    
    const headers = {
        'Authorization': `Bearer ${process.env.API_KEY}`,
        'Content-Type': 'application/json'
    };

    try {
        const response = await axios.get(url, { headers });
        return response.data;
    } catch (error) {
        console.error("Error fetching music details:", error.message);
        throw new Error('Failed to fetch music details.');
    }
};


const generateCustomMusic = async (prompt, tags, title, makeInstrumental = false, waitAudio = true) => {
    const url = 'https://api.aimlapi.com/generate/custom-mode';
    const headers = {
        'Authorization': `Bearer ${process.env.API_KEY}`,
        'Content-Type': 'application/json'
    };
    const payload = {
        'prompt': prompt,
        'tags': tags,
        'title': title,
        'make_instrumental': makeInstrumental,
        'wait_audio': waitAudio
    };

    try {
        const response = await axios.post(url, payload, { headers: headers });

        console.log('API Response:', response.data);

        const musicData = response.data.map(track => ({
            id: track.id,
            title: track.title,
            image_url: track.image_url,
            audio_url: track.audio_url,
            model_name: track.model_name,
            tags: track.tags,
        }));

        return musicData;
    } catch (error) {
        if (error.response && error.response.data) {
            const errorMessage = Buffer.from(error.response.data).toString('utf8');
            console.error("Error generating music:", errorMessage);
        } else {
            console.error("Error generating music:", error.message);
        }
        throw new Error('Failed to generate music.');
    }
};

module.exports = {
    generateMusic,
    fetchMusicDetails,
    generateCustomMusic
};
