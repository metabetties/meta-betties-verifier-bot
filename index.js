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

// Store pending verifications in memory
const pendingVerifications = new Map();

// Serve static files from /public
app.use(express.static(path.join(__dirname, "public")));
app.use(cors());
app.use(express.json());

// Serve index.html for root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Telegram /start command handler
bot.start((ctx) => {
  const userId = ctx.from.id;
  const url = `https://verify.metabetties.com/?tg=${userId}`;
  ctx.reply(`Please verify your wallet by visiting: ${url}`);
});

// Wallet verification endpoint
app.post("/verify", async (req, res) => {
  const { wallet, tg } = req.body;
  if (!wallet || !tg) return res.status(400).send("Missing wallet or tg param");

  try {
    console.log("🔍 Verifying wallet:", wallet);

    const response = await fetch(`https://api.helius.xyz/v0/addresses/${wallet}/assets?api-key=${HELIUS_API_KEY}`);
    const assets = await response.json();

    console.log("🧾 Retrieved assets:", JSON.stringify(assets, null, 2)); // Add this line

    const verified = assets.some(asset =>
      asset?.creators?.some(c =>
        c.address === VERIFIED_CREATOR && c.verified
      )
    );

    console.log("✅ Verification result:", verified);

    if (verified) {
      bot.telegram.sendMessage(tg, "✅ Wallet verification successful!");
      return res.send({ success: true, groupUsername: "MetaBettiesVIP" });
    } else {
      return res.status(403).send({ success: false, message: "No valid NFT found." });
    }
  } catch (err) {
    console.error("🚨 Verification error:", err); // ← log the actual error
    res.status(500).send("Server error");
  }
});

// Webhook setup
const webhookPath = `/bot${BOT_TOKEN}`;
app.use(bot.webhookCallback(webhookPath));

// Start server
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await bot.telegram.setWebhook(`https://verify.metabetties.com${webhookPath}`);
    console.log("Webhook set successfully.");
  } catch (err) {
    console.error("Failed to set webhook:", err);
  }
});
