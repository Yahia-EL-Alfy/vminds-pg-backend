const axios = require('axios');
const wav = require('wav-decoder');

const convertTextToSpeech = async (model, text) => {
    const url = 'https://api.aimlapi.com/tts';
    const headers = {
        'Authorization': `Bearer ${process.env.API_KEY}`,
        'Content-Type': 'application/json'
    };
    const payload = {
        'model': model,
        'text': text
    };

    try {
        const response = await axios.post(url, payload, { headers: headers, responseType: 'arraybuffer' });
        // console.log('API Response:', response.data);
        const data = response.data;
        
        const audioData = await wav.decode(response.data);
        const durationInSeconds = audioData.channelData[0].length / audioData.sampleRate;

        console.log(`Duration of the audio: ${durationInSeconds.toFixed(2)} seconds`);

        const tokensUsed = Math.ceil(durationInSeconds * 1600);

        console.log(`Tokens Used: ${tokensUsed}`);

        return { audioData: response.data, tokensUsed, durationInSeconds,data };
    } catch (error) {
        if (error.response && error.response.data) {
            const errorMessage = Buffer.from(error.response.data).toString('utf8');
            console.error("Error converting text to speech:", errorMessage);
        } else {
            console.error("Error converting text to speech:", error.message);
        }
        throw new Error('Failed to convert text to speech.');
    }
};

module.exports = {
    convertTextToSpeech
};
