import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({
  apiKey: "AQ.Ab8RN6J0pdZuCY3vS75iMlCQ5dheRKeQaYKTllnIZSRMjZ-hqQ",
});
ai.models.generateImages({
  model: 'imagen-3.0-generate-002',
  prompt: 'A highly realistic cat',
  config: {
    numberOfImages: 1,
    aspectRatio: "3:4",
    outputMimeType: "image/jpeg"
  }
}).then(res => console.log(res.generatedImages[0].image.imageBytes.substring(0, 50))).catch(console.error);
