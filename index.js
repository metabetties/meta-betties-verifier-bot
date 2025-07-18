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

// Telegram start command (optional legacy fallback)
bot.start((ctx) => {
  const userId = ctx.from.id;
  const url = `https://verify.metabetties.com/?tg=${userId}`;
  ctx.reply(`Please verify your wallet here: ${url}`);
});

// NEW: Handle join requests from invite link
bot.on("chat_join_request", async (ctx) => {
  const userId = ctx.chatJoinRequest.from.id;
  const chatId = ctx.chatJoinRequest.chat.id;

  const verifyUrl = `https://verify.metabetties.com/?tg=${userId}&chatId=${chatId}`;
  try {
    await ctx.telegram.sendMessage(userId, `🛂 Please verify your wallet to join Meta Betties:\n\n${verifyUrl}`);
  } catch (err) {
    console.error("Failed to send verification link:", err);
  }
});

// POST /verify route
app.post("/verify", async (req, res) => {
  const { wallet, tg, chatId } = req.body;
  if (!wallet || !tg || !chatId) return res.status(400).send("Missing wallet, Telegram ID, or Chat ID.");

  try {
    const response = await fetch(`https://rpc.helius.xyz/?api-key=${HELIUS_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "get-assets",
        method: "getAssetsByOwner",
        params: {
          ownerAddress: wallet,
          page: 1,
          limit: 1000
        }
      })
    });

    const result = await response.json();
    const assets = result.result?.items || [];

    const verified = assets.some((nft) =>
      nft.creators?.some((creator) =>
        creator.address === VERIFIED_CREATOR && creator.verified
      )
    );

    if (verified) {
      await bot.telegram.sendMessage(tg, "✅ Wallet verification successful!");
      await bot.telegram.approveChatJoinRequest(chatId, parseInt(tg));
      return res.send({ success: true });
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

