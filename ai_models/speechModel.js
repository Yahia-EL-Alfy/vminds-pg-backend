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
        
        const data = response.data;
        const base64Audio = Buffer.from(data).toString('base64');  // Convert binary to base64

        const audioData = await wav.decode(response.data);
        const durationInSeconds = audioData.channelData[0].length / audioData.sampleRate;

        const tokensUsed = Math.ceil(durationInSeconds * 1600);

        return { audioData: base64Audio, tokensUsed, durationInSeconds };
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
