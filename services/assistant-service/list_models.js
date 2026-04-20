
async function run() {
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyD3zefxmo3izBcTlirKWt85w1K6lrq5IWc");
  const data = await response.json();
  console.log(data.models.map(m => m.name));
}
run();
