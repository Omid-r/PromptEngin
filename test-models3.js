import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({
  apiKey: "AQ.Ab8RN6J0pdZuCY3vS75iMlCQ5dheRKeQaYKTllnIZSRMjZ-hqQ",
});
async function run() {
  const response = await ai.models.list();
  for await (const m of response) {
    console.log(m.name);
  }
}
run().catch(console.error);
