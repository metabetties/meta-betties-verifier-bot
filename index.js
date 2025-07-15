
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const { Telegraf } = require("telegraf"); // ✅ CORRECT LIBRARY
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

const BOT_TOKEN = process.env.BOT_TOKEN; // ✅ Match your .env
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const COLLECTION_ID = "j7qeFNnpWTbaf5g9sMCxP2zfKrH5QFgE56SuYiQD0i1";

const bot = new Telegraf(BOT_TOKEN); // ✅ Correct usage of Telegraf

const pendingVerifications = new Map();

bot.start((ctx) => {
  const userId = ctx.from.id;
  const url = `https://metabetties.github.io/meta-betties-verifier-bot/?tg=${userId}`;
  ctx.reply(`Please verify your wallet by visiting: ${url}`);
});

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Meta Betties Verifier Bot is running.");
});

app.post("/verify", async (req, res) => {
  const { wallet, tg } = req.body;
  if (!wallet || !tg) return res.status(400).send("Missing wallet or tg param");

  try {
    const response = await fetch(`https://api.helius.xyz/v0/addresses/${wallet}/nft-events?api-key=${HELIUS_API_KEY}`);
    const data = await response.json();
    const verified = data.some(nft => nft?.nft?.collection?.id === COLLECTION_ID);

    if (verified) {
      bot.telegram.sendMessage(tg, "✅ Wallet verification successful!");
      return res.send({ success: true });
    } else {
      return res.status(403).send({ success: false, message: "No valid NFT found." });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

bot.launch();
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

