const axios = require('axios');

const apiKey = process.env.API_KEY;
const apiUrl = 'https://api.aimlapi.com/chat/completions';

const analyzeImage = async (text, imageUrls) => {
  try {
    const content = [
      { type: "text", text: text },
      ...imageUrls.map(url => ({ type: "image_url", image_url: { url: url } }))
    ];

    const payload = {
      model: "gpt-4o",
      messages: [
        {
          role: 'user',
          content: content,
        },
      ],

    };

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    const response = await axios.post(apiUrl, payload, { headers });

    const responseText = response.data.choices[0].message.content;
    const promptTokens = response.data.usage.prompt_tokens;
    const completionTokens = response.data.usage.completion_tokens;
    const totalTokens = response.data.usage.total_tokens;
    console.log(`Tokens used - Prompt: ${promptTokens}, Completion: ${completionTokens}, Total: ${totalTokens}`);

    return {
      responseText: responseText.trim(),
      tokensUsed: totalTokens,
    };
  } catch (error) {
    console.error('Error in analyzeImage:', error.response?.data || error.message);
    throw error;
  }
};
const analyzeLocalImage = async (text, imageBuffer) => {
  try {
    const base64Image = imageBuffer.toString('base64');

    const payload = {
      model: "gpt-4o",
      messages: [
        {
          role: 'user',
          content: [
            { type: "text", text: text },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
          ],
        },
      ],
    };

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    const response = await axios.post(apiUrl, payload, { headers });

    const responseText = response.data.choices[0].message.content;
    const promptTokens = response.data.usage.prompt_tokens;
    const completionTokens = response.data.usage.completion_tokens;
    const totalTokens = response.data.usage.total_tokens;
    console.log(`Tokens used - Prompt: ${promptTokens}, Completion: ${completionTokens}, Total: ${totalTokens}`);

    return {
      responseText: responseText.trim(),
      tokensUsed: totalTokens,
    };
  } catch (error) {
    console.error('Error in analyzeLocalImage:', error.response?.data || error.message);
    throw error;
  }
};

module.exports = {
  analyzeImage,
  analyzeLocalImage,
};
