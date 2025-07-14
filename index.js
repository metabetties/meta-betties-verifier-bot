
import TelegramBot from "node-telegram-bot-api";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
const port = 8080;

app.use(cors());
app.use(express.json());

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const COLLECTION_ID = "j7qeFNnpWTbaf5g9sMCxP2zfKrH5QFgE56SuYjQDQi1";
const TELEGRAM_GROUP_LINK = "https://t.me/+yourgroupinvitelink"; // Replace with your actual group link

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });
const userWalletMap = new Map();

// Handle Telegram /start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const verificationUrl = `https://metabetties.github.io/meta-betties-verifier-bot/?tg=${chatId}`;
  bot.sendMessage(chatId, `🦋 Connect your wallet to verify: ${verificationUrl}`);
});

// API route to receive wallet address from frontend
app.post("/api/verify", async (req, res) => {
  const { wallet, tg } = req.body;

  if (!wallet || !tg) {
    return res.status(400).json({ error: "Missing wallet or Telegram ID" });
  }

  try {
    const heliusUrl = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
    const response = await fetch(heliusUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getAssetsByOwner",
        params: {
          ownerAddress: wallet,
          page: 1,
          limit: 1000,
          displayOptions: {
            showCollectionMetadata: true
          }
        },
      }),
    });

    const data = await response.json();
    const assets = data.result?.items || [];

    const ownsCollectible = assets.some(
      (asset) => asset?.grouping?.some(
        (group) => group.group_key === "collection" && group.group_value === COLLECTION_ID
      )
    );

    if (ownsCollectible) {
      bot.sendMessage(tg, `✅ Verification successful! Join the group: ${TELEGRAM_GROUP_LINK}`);
      return res.status(200).json({ verified: true });
    } else {
      bot.sendMessage(tg, `❌ Verification failed. No Meta Betties NFTs found in your wallet.`);
      return res.status(403).json({ verified: false });
    }

  } catch (error) {
    console.error("Verification error:", error);
    bot.sendMessage(tg, `⚠️ An error occurred during verification. Please try again.`);
    return res.status(500).json({ error: "Verification failed" });
  }
});

app.listen(port, () => {
  console.log(`✅ Verifier backend is running on port ${port}`);
});
