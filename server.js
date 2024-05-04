const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { createServer } = require("http");
const { Server } = require("socket.io");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const {
  startTranscription,
  stopTranscription,
} = require("./services/speechToText.js");

const app = express();
app.use(cors());
app.use(express.json());
require("dotenv").config();

const httpServer = createServer(app);

// attach socket.io to the HTTP server
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

// Speech-to-Text
io.on("connection", (socket) => {
  socket.on("startTranscription", () => {
    startTranscription(io);
  });

  socket.on("stopTranscription", () => {
    stopTranscription(io);
  });
});

// Gemini
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEN_AI_KEY);

app.post("/gemini", async (req, res) => {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const chat = model.startChat({
    history: req.body.history,
    message: req.body.message,
  });

  const msg = req.body.message;

  const result = await chat.sendMessage(msg);
  const response = result.response;
  const text = response.text();
  res.send(text);
});

// Text-to-Speech
app.post("/synthesize", async (req, res) => {
  const text = req.body.text;
  const apiKey = process.env.GOOGLE_TEXT_TO_SPEECH_KEY;
  const endpoint = `https://texttospeech.googleapis.com/v1beta1/text:synthesize?key=${apiKey}`;
  const payload = {
    audioConfig: {
      audioEncoding: "MP3",
      effectsProfileId: ["small-bluetooth-speaker-class-device"],
      pitch: 0,
      speakingRate: 1,
    },
    input: {
      text: text,
    },
    voice: {
      languageCode: "en-US",
      name: "en-US-Standard-C",
    },
  };
  const response = await axios.post(endpoint, payload);
  res.json(response.data);
});


httpServer.listen(8080, () => {
  console.log("App is running with Socket.IO!");
});
