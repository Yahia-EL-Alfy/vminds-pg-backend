const axios = require('axios');
require('dotenv').config();

const generateImage = async (prompt, model) => {
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

    // Handle the updated response that contains an image URL
    if (response.data && response.data.data && response.data.data[0] && response.data.data[0].url) {
      const imageUrl = response.data.data[0].url;
      console.log('Generated Image URL:', imageUrl);
      return imageUrl;
    } else {
      console.error('Image URL is undefined or missing in the API response:', response.data);
      throw new Error('Image URL not found in response.');
    }
  } catch (error) {
    console.error('Error generating image:', error.response?.data || error.message);
    throw error;
  }
};

module.exports = { generateImage };
