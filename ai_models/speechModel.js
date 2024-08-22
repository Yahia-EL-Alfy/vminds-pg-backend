const axios = require('axios');
const fs = require('fs');
const path = require('path');

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

        console.log('API Response :', response);


        const outputFilePath = path.join(__dirname, 'output.wav');
        fs.writeFileSync(outputFilePath, response.data);

        return outputFilePath; 
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
