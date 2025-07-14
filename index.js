
require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const axios = require("axios");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const app = express();
const PORT = process.env.PORT || 3000;

// Respond to /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const verificationUrl = `https://metabetties.github.io/meta-betties-verifier-bot/?tg=${chatId}`;
  bot.sendMessage(chatId, `Click to verify your NFT ownership:\n${verificationUrl}`);
});

// Handle verification GET request from frontend
app.get("/verify", async (req, res) => {
  const { wallet, tg } = req.query;

  if (!wallet || !tg) {
    return res.status(400).send("Missing wallet or Telegram ID.");
  }

  try {
    const url = `https://api.helius.xyz/v0/addresses/${wallet}/assets?api-key=${process.env.HELIUS_API_KEY}`;
    const response = await axios.get(url);
    const assets = response.data;

    const isHolder = assets.some((nft) =>
      nft.grouping?.some((group) =>
        group.group_value === process.env.COLLECTION_ID
      )
    );

    if (isHolder) {
      await bot.sendMessage(process.env.CHANNEL_ID, `✅ Verified Meta Betties holder: ${wallet}`);
      await bot.sendMessage(tg, `✅ Success! You hold a Meta Betties NFT.`);
      return res.send("✅ Verification successful!");
    } else {
      await bot.sendMessage(tg, `❌ No Meta Betties NFTs found in your wallet.`);
      return res.status(403).send("Not a valid holder.");
    }
  } catch (err) {
    console.error("Verification error:", err.message);
    await bot.sendMessage(tg, `⚠️ Verification failed. Please try again later.`);
    return res.status(500).send("Internal server error.");
  }
});

app.listen(PORT, () => {
  console.log(`✅ Verifier backend is running on port ${PORT}`);
});
