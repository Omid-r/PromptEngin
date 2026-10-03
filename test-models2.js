import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({
  apiKey: "AQ.Ab8RN6J0pdZuCY3vS75iMlCQ5dheRKeQaYKTllnIZSRMjZ-hqQ",
});
async function run() {
  const models = ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.7-flash'];
  for (const model of models) {
    try {
      await ai.models.generateContent({ model, contents: 'hello' });
      console.log(`${model}: Success`);
    } catch (e) {
      console.log(`${model}: ${e.message}`);
    }
  }
}
run();
