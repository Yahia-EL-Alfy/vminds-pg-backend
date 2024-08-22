const axios = require('axios');
require('dotenv').config();

const generateImage = async (prompt, options = {}) => {
  const apiKey = process.env.API_KEY;
  const apiUrl = 'https://api.aimlapi.com/images/generations';

  const payload = {
    prompt: prompt,
    model: 'flux-pro',
    image_size: options.image_size || 'landscape_16_9',
    num_inference_steps: options.num_inference_steps || 28,
    guidance_scale: options.guidance_scale || 3.5,
    num_images: options.num_images || 1,
    safety_tolerance: options.safety_tolerance || '2',
  };

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  try {
    const response = await axios.post(apiUrl, payload, { headers });
    console.log('API Response:', response.data);

    const imageUrl = response.data.images[0].url;
    return imageUrl;
  } catch (error) {
    console.error('Error generating image:', error.response?.data || error.message);
    throw error;
  }
};

module.exports = { generateImage };
