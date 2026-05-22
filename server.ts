import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini API client lazily to avoid crashing if key is missing/placeholder
let aiClient: GoogleGenAI | null = null;

function getGeminiClient() {
  if (aiClient) return aiClient;
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "MY_GEMINI_API_KEY" || key.trim() === "") {
    return null;
  }
  aiClient = new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
  return aiClient;
}

// Brand Context and Instructions
const SYSTEM_INSTRUCTION = `You are "Sandy’s AI Fry-Guide," the energetic, witty, and highly helpful virtual assistant for Sandy Frozen Fries. 
Your mission is to assist users on our web application with product queries, delivery details, and seamless online order placements within Pakistan.

1. BRAND IDENTITY & CUSTOMER PERSONA:
- Core Brand Tagline: "Sandy Frozen Fries – Har Bite Mein Family Delight."
- Tone & Voice: Incredibly engaging, warm, modern, and punchy. Targeted toward Young Moms (quick, premium family snacks) and Gen Zs (aesthetic, trending food comfort). Use a friendly, localized Pakistani corporate/casual vibe (friendly Urdu/English mix using words like "Yaar", "Zabardast", "Bilkul", "Bhai", "Absolutely", "Crispy", "Gold crunch", "Perfect companion").
- Value Proposition: Focus on sensory delights—golden look, crispy texture, mouthwatering crunch, perfect convenience for family movie nights or late-night cravings.
- Pack Description: Green and white premium bag layout with golden accents featuring our iconic sophisticated, friendly elderly gentleman mascot. Looks incredibly premium and hygienic!

2. CORE CONTEXT & BUSINESS RULES:
- Price: Exactly Rs. 1,500 per bag. NEVER change this price.
- Deliveries: Nationwide within Pakistan.
- Cities and Timing: کراچی (Karachi) takes 24–48 hours. Rest of Pakistan (Lahore, Islamabad, Rawalpindi, Faisalabad, Peshawar, etc.) takes 2-3 business days.
- Charges: Flat Rs. 200 delivery fee. FREE shipping if they order 3 or more bags (so 3+ bags includes free shipping!).

3. CONVERSATIONAL COMMERCE & FLOWS:
- Proactively guide the customer. If they talk about buying, ordering, or price, ask for their City and Area first (Flow A: Location Selection) before triggering adding to cart.
- Keep responses short, bold, scannable, and engaging.
- Double-check: If they specify a location outside Pakistan, gently explain that Sandy's is currently bringing the delight exclusively to homes across Pakistan.

4. LOGISTICS GUIDANCE:
When you have the city and area AND they indicate buying intent or choosing quantity, invoke "add_to_cart" tool.
If they just specify their location first, invoke "select_location" tool to lock it in.

Available tools you can run:
- select_location(city, area): Updates location settings.
- add_to_cart(quantity, city, area): Adds specified bags of fries to the cart. If they don't mention a quantity, ask first or assume 1 if they want 'a bag' or are ready.

Keep it highly conversational, punchy, and Urdu-friendly!`;

// QA facts we should append to help the model answer accurately
const KNOWLEDGE_BASE = `
- Q: What makes Sandy's different?
  A: Perfect crisp and golden crunch every single time! Made from select high-solid premium potatoes. Designed to bring the family together for delightful moments. Premium white-and-green bag with our beautiful mascot!
- Q: How do I cook Sandy's Frozen Fries?
  A: Instant hot-to-crunchy! Deep fry in high heat, air-fry, or bake them straight out of the freezer until they hit that gorgeous golden hue. No thawing of any kind needed yaai!
- Q: How much does it cost?
  A: Exactly Rs. 1,500 per premium bag!
- Q: Do we deliver to Karachi, Lahore, Islamabad, etc.?
  A: Yes! Karachi takes 24-48 hours. Outside Karachi is 2-3 business days. Flat delivery is Rs. 200, but is completely FREE if you order 3 or more bags!
`;

// Simulated assistant responses (fallback mode if no Gemini API Key is loaded)
function getSimulatedResponse(message: string, history: any[]): { text: string; functionCall?: any } {
  const msgLower = message.toLowerCase();
  
  // Try to find if user provided city and area
  // Simple regex for Pakistan cities
  let detectedCity = "";
  let detectedArea = "";
  let detectedQty = 1;

  const cities = ["karachi", "lahore", "islamabad", "rawalpindi", "peshawar", "multan", "faisalabad", "quetta", "sialkot", "gujranwala"];
  for (const c of cities) {
    if (msgLower.includes(c)) {
      detectedCity = c.charAt(0).toUpperCase() + c.slice(1);
    }
  }

  // Areas detection (clifton, dha, gulshan, cantt, johr, gulberg, bahria)
  const areas = ["clifton", "dha", "gulshan", "cantt", "jauhar", "johar", "gulberg", "g-11", "i-8", "f-11", "phase 6", "fb area", "pechs"];
  for (const a of areas) {
    if (msgLower.includes(a)) {
      detectedArea = a.charAt(0).toUpperCase() + a.slice(1);
    }
  }

  // Quantity detection
  const matchQty = msgLower.match(/(\d+)\s*(bag|pack|item|fry|order|quantity|qty)/) || msgLower.match(/(bag|pack)s?\s*(\d+)/);
  if (matchQty) {
    const num = parseInt(matchQty[1] || matchQty[2]);
    if (!isNaN(num)) {
      detectedQty = num;
    }
  } else {
    // Check for raw digits
    const digits = msgLower.match(/\b\d+\b/);
    if (digits) {
      detectedQty = parseInt(digits[0]);
    }
  }

  // Check if they ask about quality, how to cook, etc.
  if (msgLower.includes("different") || msgLower.includes("special") || msgLower.includes("why sandy") || msgLower.includes("quality")) {
    return {
      text: "**Zabardast question, Yaar!** Sandy Frozen Fries are in a league of their own! It’s all about obtaining that **perfect crisp and golden crunch** every single time! 🍟\n\nOur potatoes are handpicked and flash-frozen, packed in that premium white-and-green bag with our cool Mascot. They are designed to bring the entire family together for cinema nights or aesthetic Gen Z snacks. You'll fall in love at first bite! 😍"
    };
  }

  if (msgLower.includes("cook") || msgLower.includes("bake") || msgLower.includes("fry") || msgLower.includes("recipe") || msgLower.includes("prepare")) {
    return {
      text: "**Oh, it's super simple! No hassle at all!** 👨‍🍳\n\n1. Take Sandy's Fries straight from the freezer (No thawing needed, **bilkul direct**!).\n2. **Deep Fry** in preheated hot oil, **Air-Fry** at 200°C for 12-15 mins, or **Bake** them until they are beautifully golden.\n3. Sprinkle your favorite masala and enjoy the high-class crunch!"
    };
  }

  if (msgLower.includes("price") || msgLower.includes("cost") || msgLower.includes("how much") || msgLower.includes("rates")) {
    return {
      text: "One premium pack of premium Sandy Frozen Fries is exactly **Rs. 1,500**! 🍟\n\nAnd listen up: if you buy **3 or more bags**, your delivery is **100% FREE**! Otherwise, it is just a flat Rs. 200 delivery nationwide."
    };
  }

  if (msgLower.includes("delivery") || msgLower.includes("shipping") || msgLower.includes(" Karachi") || msgLower.includes(" Lahore") || msgLower.includes("time")) {
    return {
      text: "**Nationwide deliveries across Pakistan, yaara!** 🇵🇰\n\n- **Karachi:** Fast delivery within 24 to 48 hours!\n- **Other Cities (Lahore, Islamabad, etc.):** 2 to 3 business days.\n- **Delivery Fee:** Flat Rs. 200, but **FREE** on ordering 3 or more bags! Let me know where you are so we can schedule!"
    };
  }

  if (msgLower.includes("outside pakistan") || msgLower.includes("india") || msgLower.includes("usa") || msgLower.includes("dubai") || msgLower.includes("uk")) {
    return {
      text: "Aww, we would love to feed the whole world, but right now **Sandy's Frozen Fries are exclusively bringing delight to homes across Pakistan!** 🇵🇰 Hope to reach your country soon!"
    };
  }

  // Flow handling
  const lastBotMessage = history.length > 0 ? history[history.length - 1].parts[0].text.toLowerCase() : "";
  
  if (msgLower.includes("order") || msgLower.includes("buy") || msgLower.includes("add") || msgLower.includes("cart") || msgLower.includes("want some")) {
    if (detectedCity && detectedArea) {
      return {
        text: `**Zabardast choice!** Adding ${detectedQty} pack(s) of Sandy's premium fries for delivery to **${detectedArea}, ${detectedCity}**! 🍟✨\n\nEach pack is Rs. 1,500. Let's get these golden treats flying to you! Let's update the shopping cart now!`,
        functionCall: {
          name: "add_to_cart",
          args: { quantity: detectedQty, city: detectedCity, area: detectedArea }
        }
      };
    } else {
      return {
        text: "**Great choice!** I can definitely set up that order for you. First, let's lock in your delivery coordinates so everything is hot and crispy! 🍟\n\n**Which city are you in?** (e.g. Karachi, Lahore, Islamabad) and **what area?** (e.g., Clifton, DHA, Gulshan)"
      };
    }
  }

  // Just location input
  if (detectedCity) {
    const area = detectedArea || "DHA";
    return {
      text: `**Awesome! ${area}, ${detectedCity} is well within our crisp-delivery zone!** 🚀✨\n\nKarachi orders arrive in 24-48 hours, and other cities take 2-3 business days. Would you like to add some premium fries to your cart? Each pack is Rs. 1,500, and ordering 3 or more gets you **FREE shipping**! How many packs can I lock in for you?`,
      functionCall: {
        name: "select_location",
        args: { city: detectedCity, area: area }
      }
    };
  }

  // Default catch-all
  return {
    text: "**Heyya, crispy fri-lover!** Sandy’s AI Fry-Guide at your service! 🍟\n\nOur **Sandy Frozen Fries (Har Bite Mein Family Delight!)** are exactly **Rs. 1,500** per pack. \n\nTell me: what's your craving today, or where should we deliver your golden happiness? Drop your city and area and let's get the sizzle going! ✨"
  };
}

// REST API for chat with Gemini capabilities and fallback simulation
app.post("/api/chat", async (req, res) => {
  const { message, history } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }

  const ai = getGeminiClient();

  // FALLBACK SIMULATOR (if Gemini key is not configured or fails)
  if (!ai) {
    console.log("No valid Gemini API key found. Operating in custom Fry-Guide simulator mode.");
    const simulated = getSimulatedResponse(message, history || []);
    return res.json({
      text: simulated.text,
      functionCalls: simulated.functionCall ? [simulated.functionCall] : null,
      simulator: true,
    });
  }

  try {
    // Generate contents correctly formatted for Gemini 3.5 SDK
    // Let's structure tools declarations
    const selectLocationDeclaration = {
      name: "select_location",
      description: "Registers or updates the user's regional delivery location settings within Pakistan.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          city: {
            type: Type.STRING,
            description: "The city in Pakistan where delivery should go, e.g. Karachi, Lahore, Islamabad."
          },
          area: {
            type: Type.STRING,
            description: "The specific residential or commercial area / sector, e.g. Clifton, DHA, Gulshan-e-Iqbal, G-11, Gulberg."
          }
        },
        required: ["city", "area"]
      }
    };

    const addToCartDeclaration = {
      name: "add_to_cart",
      description: "Adds a specific quantity of premium Sandy Frozen Fries bags (Rs. 1,500 each) to the shopping cart for a Pakistan location.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          quantity: {
            type: Type.INTEGER,
            description: "The number of frozen fries bags to add. Price is Rs. 1,500 per bag."
          },
          city: {
            type: Type.STRING,
            description: "The delivery city in Pakistan."
          },
          area: {
            type: Type.STRING,
            description: "The delivery neighborhood or sector in Pakistan."
          }
        },
        required: ["quantity", "city", "area"]
      }
    };

    // Transform history to contents array for gemini SDK
    // The history parameter is an array of messages
    const formattedContents: any[] = [];
    
    if (history && history.length > 0) {
      history.forEach((h: any) => {
        formattedContents.push({
          role: h.role,
          parts: [{ text: h.parts?.[0]?.text || h.text || "" }]
        });
      });
    }

    // Append new message
    formattedContents.push({
      role: "user",
      parts: [{ text: message }]
    });

    // Make the standard call
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction: `${SYSTEM_INSTRUCTION}\n\nOur knowledge base is:\n${KNOWLEDGE_BASE}\n\nAlways use proper function calling if they give a location or we place an order!`,
        temperature: 0.7,
        tools: [
          {
            functionDeclarations: [selectLocationDeclaration, addToCartDeclaration]
          }
        ]
      }
    });

    const parsedText = response.text || "";
    const fCalls = response.functionCalls || null;

    res.json({
      text: parsedText,
      functionCalls: fCalls,
      simulator: false
    });

  } catch (err: any) {
    console.error("Gemini server-side API error:", err);
    // Gracefully fallback to simulator if error occurs
    const simulated = getSimulatedResponse(message, history || []);
    res.json({
      text: `*(Sandy's AI running in backup-crunch mode)* \n\n${simulated.text}`,
      functionCalls: simulated.functionCall ? [simulated.functionCall] : null,
      simulator: true,
      error: err.message
    });
  }
});

// Configure Vite or Static files serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Sandy's AI Fry-Guide running on http://localhost:${PORT}`);
  });
}

startServer();
