const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config({ path: "c:/Micro/Microservices-webbansach/services/assistant-service/.env" });

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("No API Key found");
    return;
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  try {
    // Note: The SDK doesn't have a direct "listModels" top-level method to my knowledge in standard usage, 
    // but we can try to hit a known model with a simple prompt.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("Hi");
    console.log("Gemini 1.5 Flash OK:", result.response.text());

    const embedModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const embedResult = await embedModel.embedContent("Hello world");
    console.log("Embedding 004 OK:", embedResult.embedding.values.slice(0, 5));
  } catch (err) {
    console.error("Test Error:", err);
  }
}

test();
