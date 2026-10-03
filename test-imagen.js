import fetch from 'node-fetch';
const apiKey = "AQ.Ab8RN6J0pdZuCY3vS75iMlCQ5dheRKeQaYKTllnIZSRMjZ-hqQ";
fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    instances: [{ prompt: "A highly realistic cat" }],
    parameters: { sampleCount: 1, aspectRatio: "3:4", outputMimeType: "image/jpeg" }
  })
}).then(res => res.json()).then(console.log).catch(console.error);
