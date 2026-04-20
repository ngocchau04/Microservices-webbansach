const axios = require('axios');
require("dotenv").config({ path: "c:/Micro/Microservices-webbansach/services/assistant-service/.env" });

async function testRest() {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1/models/text-embedding-004:embedContent?key=${apiKey}`;
  
  try {
    const response = await axios.post(url, {
      content: { parts: [{ text: "Hello" }] }
    });
    console.log("REST v1 OK:", response.data.embedding.values.slice(0, 5));
  } catch (err) {
    console.error("REST v1 Error:", err.response ? err.response.data : err.message);
  }
}

testRest();
