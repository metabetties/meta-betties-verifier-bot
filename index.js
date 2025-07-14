
require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const axios = require("axios");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const app = express();
const PORT = process.env.PORT || 3000;

// Respond to /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const verifyLink = `https://verify.metabetties.xyz/?tg=${chatId}`;
  bot.sendMessage(chatId, `Welcome to Meta Betties. Click the link below to verify NFT ownership:\n\n${verifyLink}`);
});

// Endpoint to receive wallet from frontend
app.get("/verify", async (req, res) => {
  const { wallet, tg } = req.query;

  if (!wallet || !tg) {
    return res.status(400).send("Missing wallet or Telegram ID.");
  }

  try {
    // Query Helius for NFTs held by wallet
    const url = `https://api.helius.xyz/v0/addresses/${wallet}/nft-assets?api-key=${process.env.HELIUS_API_KEY}`;
    const response = await axios.get(url);
    const assets = response.data;

    // Check if user owns any NFT from your collection
    const isHolder = assets.some((nft) =>
      nft.grouping?.some((group) =>
        group.group_value === process.env.COLLECTION_ID
      )
    );

    if (isHolder) {
      await bot.sendMessage(process.env.CHANNEL_ID, `✅ Verified Meta Betties holder: ${wallet}`);
      await bot.sendMessage(tg, `✅ Verification successful! You hold a Meta Betties NFT.`);
      return res.send("Holder verified. Telegram access granted.");
    } else {
      await bot.sendMessage(tg, `❌ Verification failed. No Meta Betties NFT found in this wallet.`);
      return res.send("Not a valid holder.");
    }
  } catch (err) {
    console.error("Error during verification:", err.message);
    await bot.sendMessage(tg, `⚠️ Verification error. Please try again.`);
    return res.status(500).send("Server error during verification.");
  }
});

app.listen(PORT, () => {
  console.log(`✅ Verifier backend is running on port ${PORT}`);
});
