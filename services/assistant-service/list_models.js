
async function run() {
  const key = "AIzaSyDvjJrQkjvAqwbcS7k-AJtWXZDZmZ6xq7o";
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await response.json();
    if (data.models) {
      console.log(JSON.stringify(data.models.map(m => m.name), null, 2));
    } else {
      console.log("No models found. Response:", JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.error("Fetch failed:", e.message);
  }
}
run();
