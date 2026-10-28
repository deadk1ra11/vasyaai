
require("dotenv").config();

const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static("public"));

const API_KEY = process.env.OPENROUTER_API_KEY;

app.get("/api/status", (req, res) => {
  res.json({
    name: "Вася AI",
    ready: Boolean(API_KEY)
  });
});

async function askAI(messages) {
  if (!API_KEY) {
    throw new Error("На сервере не настроен API-ключ.");
  }

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://localhost",
        "X-Title": "Vasya AI"
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages,
        max_tokens: 1200
      }),
      signal: AbortSignal.timeout(60000)
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("OpenRouter error:", response.status);

    throw new Error(
      response.status === 429
        ? "Лимит запросов исчерпан. Попробуй позже."
        : "ИИ-сервис вернул ошибку. Проверь ключ и доступность модели."
    );
  }

  const answer = data.choices?.[0]?.message?.content;

  if (typeof answer !== "string" || !answer.trim()) {
    throw new Error("ИИ не вернул текстовый ответ.");
  }

  return answer;
}

app.post("/api/chat", async (req, res) => {
  try {
    const message = String(req.body.message || "").trim();

    if (!message || message.length > 8000) {
      return res.status(400).json({
        error: "Сообщение пустое или слишком длинное."
      });
    }

    const reply = await askAI([
      {
        role: "system",
        content:
          "Ты Вася AI — личный русскоязычный помощник. " +
          "Помогай с программированием, HTML, JavaScript " +
          "и анализом идей. Отвечай понятно и по делу. " +
          "Не утверждай, что выполнил действия, " +
          "которые фактически не выполнял."
      },
      {
        role: "user",
        content: message
      }
    ]);

    res.json({ reply });
  } catch (error) {
    console.error("Chat error:", error.message);

    res.status(502).json({
      error: error.message || "Не удалось получить ответ ИИ."
    });
  }
});

// Анализ сайтов пока отключён:
// перед публичным включением нужно добавить
// полноценную защиту от запросов к внутренним адресам.
app.post("/api/inspect", (req, res) => {
  res.status(503).json({
    error:
      "Анализ сайтов пока отключён. " +
      "Сначала нужно защитить сервер."
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Вася AI запущен на порту " + PORT);
});
