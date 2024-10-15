const axios = require('axios');

const apiKey = process.env.API_KEY;
const apiUrl = 'https://api.aimlapi.com/chat/completions';

const getAIResponse = async (messages, model, maxTokens) => {
  try {
    console.log("Messages:", messages);

    const payload = {
      model: model,
      messages: messages, // Send all messages (previous and new) to the API
      max_tokens: maxTokens,
    };

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    const response = await axios.post(apiUrl, payload, { headers: headers });

    // Extracting the relevant fields from the response
    const responseContent = response.data.choices[0].message.content;
    const refusalMessage = response.data.choices[0].message.refusal;  // Can be null
    const promptTokens = response.data.usage.prompt_tokens;
    const completionTokens = response.data.usage.completion_tokens;
    const totalTokens = response.data.usage.total_tokens;

    console.log(`Tokens used - Prompt: ${promptTokens}, Completion: ${completionTokens}, Total: ${totalTokens}`);
    console.log('API Response:', response.data);

    // Check if there's a refusal message, if so, handle that differently
    const finalResponse = refusalMessage || responseContent.trim();

    return {
      responseText: finalResponse,
      tokensUsed: totalTokens,
    };
  } catch (error) {
    console.error('Error fetching AI response:', error.response?.data || error.message);
    throw error;
  }
};

module.exports = { getAIResponse };
