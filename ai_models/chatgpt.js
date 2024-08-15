const axios = require('axios');

const apiKey = process.env.API_KEY; 
const apiUrl = 'https://api.aimlapi.com/chat/completions';

const getAIResponse = async (message, model, maxTokens) => {
  try {
    console.log("Message:", message);

    const payload = {
      model: model,
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
      max_tokens: maxTokens,
    };

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    const response = await axios.post(apiUrl, payload, { headers: headers });

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
    console.error('Error fetching AI response:', error.response?.data || error.message);
    throw error;
  }
};

module.exports = { getAIResponse };
