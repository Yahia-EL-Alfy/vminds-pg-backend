const axios = require('axios');
require('dotenv').config();

const generateImage = async (prompt,model) => {
  const apiKey = process.env.API_KEY;
  const apiUrl = 'https://api.aimlapi.com/images/generations';

  const payload = {
    prompt: prompt,
    model: model,
  };

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  try {
    console.log('Sending request to API with payload:', payload);

    const response = await axios.post(apiUrl, payload, { headers });

    console.log('Full API Response:', response.data);

    if (response.data && response.data.output && response.data.output.choices && response.data.output.choices[0] && response.data.output.choices[0].image_base64) {
      const imageBase64 = response.data.output.choices[0].image_base64;
      //console.log('Generated Image Base64:', imageBase64);
      return imageBase64;
    } else {
      console.error('Image Base64 is undefined or missing in the API response:', response.data.output);
      throw new Error('Image Base64 not found in response.');
    }
  } catch (error) {
    console.error('Error generating image:', error.response?.data || error.message);
    throw error;
  }
};

module.exports = { generateImage };
