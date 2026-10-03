import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({
  apiKey: "AQ.Ab8RN6J0pdZuCY3vS75iMlCQ5dheRKeQaYKTllnIZSRMjZ-hqQ",
});
ai.models.generateContent({
  model: 'imagen-3.0-generate-002',
  contents: 'A highly realistic cat',
  config: {
    outputMimeType: 'image/jpeg'
  }
}).then(res => {
  console.log(res);
}).catch(console.error);
