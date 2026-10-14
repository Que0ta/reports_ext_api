import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import rateLimit from "express-rate-limit";

dotenv.config();

const port = process.env.PORT || 3000;
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

const BOT_TOKEN = process.env.Bot;
app.set("trust proxy", 1);

const supabase = createClient(
  process.env.DB_LiNK,
  process.env.DB_TOKEN
);
const contactCors = cors({
    origin: [
        "https://que0ta.github.io",
        "https://frontend-guide-olfd.onrender.com"
    ],
    methods: ["POST"],
});
const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 50,                   
    message: {
        success: false,
        error: "Too many requests. Try again later."
    }
});

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
    const respText = await callPrompt(`Напиши в загальному, що ми робили з учнями (до 150 символів), що ми робили з учнями за цією темою: ${text}. Без всяких емоджі та зірочоко, інших символів. Простими загальними реченнями, та виведи тільки фінальну відповідь, без роздумів та параметрів.`, {
      model: "gemini-3.1-flash-lite",
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
  
  
app.get("/db/questions", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("questions")
      .select("*");

    if (error) throw error;

    res.json({ status: "active", data });
  } catch (err) {
    console.error(err);
    res.json({ status: "failed", error: err.message });
  }
});

app.post("/db/questions", async (req, res) => {
  try {
    const { question, right_answer, question_type, category } = req.body;

    const { data, error } = await supabase
      .from("questions")
      .insert([
        {
          ...(question      && { question }),
          ...(right_answer  && { right_answer }),
          ...(question_type && { question_type }),
          ...(category      && { category }),
        },
      ])
      .select();

    if (error) throw error;

    res.json({ status: "active", data });
  } catch (err) {
    console.error(err);
    res.json({ status: "failed", error: err.message });
  }
});



app.post("/ahead/sendMessage", contactCors, contactLimiter, async(req,res)=>{
  const { message } = req.body;
  const chatId = process.env.token_id;
    try {
        const response = await fetch(
            `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                }),
            }
        );

        const data = await response.json();

        res.json({message: "success!"});
    } catch (error) {
        res.status(500).json({
            error: error.message,
        });
    }
})

app.delete("/db/del-question/:id", async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabase
    .from("questions")
    .delete()
    .eq("id", id)
    .select();

  if (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }

  if (!data.length) {
    return res.status(404).json({
      success: false,
      message: "Помилка API посилання!",
    });
  }

  res.json({
    success: true,
    deleted: data[0],
  });
});

app.listen(port, () => console.log(`Server running on port ${port}`));
