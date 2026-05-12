import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
dotenv.config();

const port = process.env.PORT || 3000;
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

async function callPrompt(prompt, options = {}) {
  const API_KEY = process.env.API; // from aistudio.google.com
  const MODEL = options.model ?? "gemma-4-26b-a4b-it";
  const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

  const body = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 1024,
    },
  };

  const response = await fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Gemini API error ${response.status}: ${error.error?.message}`
    );
  }

  const data = await response.json();
  // Extract the text from the response
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

// const respText = await callPrompt(`Напиши коротко (до 100 символів), що ми робили з учнями за цією темою: JS змінні. Без всяких емоджі та зірочоко, інших символів. Простими двома реченнями, та виведи тільки фінальну відповідь, без роздумів та параметрів.`, {
  // model: "gemini-3.1-flash-lite",
  // model: "gemma-4-26b-it",
  // model: "gemini-2.5-flash-lite",
//   temperature: 0.5,
// });
// console.log(respText);


app.get("/api/status", (req, res) => {
    try{
        res.json({ status: "active" });
    } catch (err){
        res.json({status: "failed"});
    }
});

app.post("/api/prompt", async (req, res) => {
  const {text} = req.body;
    try{
        const respText = await callPrompt(`Напиши коротко (до 100 символів), що ми робили з учнями за цією темою: ${text}. Без всяких емоджі та зірочоко, інших символів. Простими двома реченнями, та виведи тільки фінальну відповідь, без роздумів та параметрів.`, {
          model: "gemini-2.5-flash-lite",
          temperature: 0.5,
        });
        res.json({
          success: true,
          resp: respText,
        });
    } catch (err){
      res.send("Encountered =>", err)
    }
});


app.listen(port, () => console.log(`Server running on port ${port}`));
