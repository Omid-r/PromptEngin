import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({
  apiKey: "AQ.Ab8RN6J0pdZuCY3vS75iMlCQ5dheRKeQaYKTllnIZSRMjZ-hqQ",
});
ai.models.generateContent({
  model: 'gemini-3-pro-image',
  contents: 'A realistic cat',
  config: {
    outputMimeType: "image/jpeg"
  }
}).then(res => {
  let base64 = null;
  for (const part of res.candidates[0].content.parts) {
    if (part.inlineData) {
      base64 = part.inlineData;
      break;
    }
  }
  console.log(base64 ? "Success" : "Failed");
}).catch(console.error);
