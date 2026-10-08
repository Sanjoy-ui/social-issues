const apiKey = process.env.NVIDIA_API_KEY;

async function listModels() {
  const res = await fetch("https://integrate.api.nvidia.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const data = await res.json();
  const models = data.data || [];
  console.log(`Total models: ${models.length}`);
  const embedModels = models.filter(m => m.id.toLowerCase().includes("embed") || m.id.toLowerCase().includes("bge"));
  console.log("Embedding models:", embedModels.map(m => m.id));
}

listModels();
