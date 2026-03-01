import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function generateSideQuestRoute(userMessage) {
  try {
    const response = await ai.models.generateContent({
      // 2.5-flash is the best model for hackathons: fast, cheap, and smart
      model: 'gemini-2.5-flash', 
      contents: `
        You are a routing assistant for a campus safety app. 
        Extract the user's starting location, final destination, and any mid-point stop intent.
        
        User Request: "${userMessage}"
      `,
      config: {
        // This is the magic bullet: it forces the model to return strict JSON
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            startLocation: { type: "STRING", description: "Where the user is starting" },
            destination: { type: "STRING", description: "Where the user ultimately wants to go" },
            midpointIntent: { type: "STRING", description: "What they want to do on the way (e.g., 'buy coffee', 'pharmacy')" }
          },
          required: ["startLocation", "destination", "midpointIntent"]
        }
      }
    });

    // Parse the string response into a usable JavaScript object
    const routeData = JSON.parse(response.text);
    return routeData;

  } catch (error) {
    console.error("Error generating route:", error);
    throw error;
  }
}

// --- Example Usage ---
// const userInput = "I'm leaving the library, need to grab Tylenol, and then head back to Ray Street Dorm.";
// generateSideQuestRoute(userInput).then(console.log);

/* Expected Output:
{
  "startLocation": "library",
  "destination": "Ray Street Dorm",
  "midpointIntent": "pharmacy or convenience store for Tylenol"
}
*/