const axios = require('axios');

const generateLumaVideo = async (userPrompt, aspectRatio, expandPrompt) => {
    const url = "https://api.aimlapi.com/luma-ai/generations";
    const payload = {
        aspect_ratio: aspectRatio || "16:9",
        expand_prompt: expandPrompt || false,
        user_prompt: userPrompt
    };

    const headers = {
        "Authorization": `Bearer ${process.env.API_KEY}`,
        "Content-Type": "application/json"
    };

    try {
        const response = await axios.post(url, payload, { headers });
        console.log('API Response:', response.data);

        return response.data;
    } catch (error) {
        console.error("Error in generateLumaVideo:", error);
        throw new Error("Failed to generate Luma AI video content.");
    }
};

module.exports = {
    generateLumaVideo
};
