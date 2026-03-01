// api/plan-walk.js
import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Access your secure Vercel environment variable here!
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Grab the data sent from your frontend walks.js
    const { userPrompt, localISOTime, weekday, campusLandmarks } = req.body;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: `
        [REFERENCE CONTEXT]
        Current Local Time: ${localISOTime}
        Current Day: ${weekday}
        Location: Newark, DE (EST)

        [USER REQUEST]
        "${userPrompt}"

        [LANDMARK LIST]
        ${campusLandmarks}

        [LOGIC RULES]
        1. "Today", "Tomorrow", and specific times are relative to the Current Local Time above.
        2. "2pm" MUST be formatted as "14:00" (24-hour time).
        3. Return the "datetime" field EXACTLY as "YYYY-MM-DDTHH:mm".
        4. Use "Brian" if no name is found.

        Return ONLY JSON: 
        {
          "from": "Exact Building Name", 
          "to": "Exact Building Name", 
          "type": "night|morning|study|exercise|casual", 
          "name": "Name",
          "size": 2,
          "datetime": "YYYY-MM-DDTHH:mm",
          "notes": "Short summary"
        }`}]}],
      generationConfig: { responseMimeType: "application/json" }
    });

    // Send the AI response back to the frontend
    res.status(200).json(JSON.parse(result.response.text()));

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate AI content" });
  }
}