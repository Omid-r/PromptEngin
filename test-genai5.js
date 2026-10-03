import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({
  apiKey: "AQ.Ab8RN6J0pdZuCY3vS75iMlCQ5dheRKeQaYKTllnIZSRMjZ-hqQ",
});
ai.models.generateContent({
  model: 'gemini-3.7-flash',
  contents: 'hello'
}).then(res => console.log(res.text)).catch(console.error);
