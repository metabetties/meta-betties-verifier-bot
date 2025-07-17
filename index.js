require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const path = require("path");
const { Telegraf } = require("telegraf");

const app = express();
const PORT = process.env.PORT || 8080;

const BOT_TOKEN = process.env.BOT_TOKEN;
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const VERIFIED_CREATOR = "EFwPVHhY6vH64MsMDx9ub8Edn4ktYYBcgqNYki1R3rmE";

const bot = new Telegraf(BOT_TOKEN);
const pendingVerifications = new Map();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Telegram start command
bot.start((ctx) => {
  const userId = ctx.from.id;
  const url = `https://verify.metabetties.com/?tg=${userId}`;
  ctx.reply(`Please verify your wallet here: ${url}`);
});

// POST /verify
app.post("/verify", async (req, res) => {
  const { wallet, tg } = req.body;
  if (!wallet || !tg) return res.status(400).send("Missing wallet or Telegram ID.");

  try {
    const url = `https://api.helius.xyz/v0/addresses/${wallet}/nft-assets?api-key=${HELIUS_API_KEY}`;
    const response = await fetch(url);
    const nfts = await response.json();

    const verified = Array.isArray(nfts) && nfts.some((nft) =>
      nft.content?.metadata?.creators?.some((creator) =>
        creator.address === VERIFIED_CREATOR && creator.verified === true
      )
    );

    if (verified) {
      await bot.telegram.sendMessage(tg, "✅ Wallet verification successful!");
      return res.send({ success: true, groupUsername: "MetaBettiesVIP" });
    } else {
      return res.status(403).send({ success: false, message: "No valid NFT found." });
    }
  } catch (err) {
    console.error("Verification error:", err);
    return res.status(500).send({ success: false, message: "Server error during verification." });
  }
});

// Webhook
const webhookPath = `/bot${BOT_TOKEN}`;
app.use(bot.webhookCallback(webhookPath));

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await bot.telegram.setWebhook(`https://verify.metabetties.com${webhookPath}`);
    console.log("Webhook set.");
  } catch (err) {
    console.error("Webhook setup failed:", err);
  }
});
