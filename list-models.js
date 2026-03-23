const API_KEY = "AIzaSyDZ2mKbasmvO9zmxVlRZ63U0X41U13aW0U";

async function listModels() {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const data = await response.json();
    console.log("Available Models (v1beta):", JSON.stringify(data.models?.map(m => m.name), null, 2));
    
    const responseV1 = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${API_KEY}`);
    const dataV1 = await responseV1.json();
    console.log("Available Models (v1):", JSON.stringify(dataV1.models?.map(m => m.name), null, 2));
  } catch (error) {
    console.error("Error listing models:", error);
  }
}

listModels();
