const { generateImage } = require("../../ai_models/imageGen");

const handleImageRequest = async (req, res) => {
  const { prompt, imageSize, numInferenceSteps, guidanceScale, numImages, safetyTolerance } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required." });
  }

  try {
    const imageUrl = await generateImage(prompt, { 
      image_size: imageSize,
      num_inference_steps: numInferenceSteps,
      guidance_scale: guidanceScale,
      num_images: numImages,
      safety_tolerance: safetyTolerance
    });

    return res.status(200).json({ imageUrl });
  } catch (error) {
    console.error("Error in handleImageRequest:", error);
    return res.status(500).json({ error: "Failed to generate image." });
  }
};

module.exports = {
  handleImageRequest,
};
