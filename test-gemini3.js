const apiKey = "AQ.Ab8RN6J0pdZuCY3vS75iMlCQ5dheRKeQaYKTllnIZSRMjZ-hqQ";
console.log('KEY:', apiKey);
fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    contents: [{ parts: [{ text: 'Hello' }] }]
  })
}).then(res => res.json()).then(console.log);
