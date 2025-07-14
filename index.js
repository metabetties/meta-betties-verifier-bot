
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
require('dotenv').config();

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const COLLECTION_ID = 'j7qeFNnpWTbaf5g9sMCxP2zfKrH5QFgE56SuYjQDQi1';

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

const pendingVerifications = new Map();

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const verificationUrl = `https://metabetties.github.io/meta-betties-verifier-bot/?tg=${chatId}`;
  bot.sendMessage(chatId, `Please verify ownership by connecting your wallet:\n${verificationUrl}`);
});

app.use(express.json());

app.post('/verify', async (req, res) => {
  const { wallet, tg } = req.body;

  if (!wallet || !tg) {
    return res.status(400).send('Missing wallet or Telegram ID');
  }

  try {
    const response = await fetch(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getAssetsByOwner',
        params: {
          ownerAddress: wallet,
          page: 1,
          limit: 1000,
        },
      }),
    });

    const result = await response.json();
    const assets = result.result?.items || [];

    const ownsValidNFT = assets.some((asset) => asset.grouping?.some(
      (group) => group.group_value === COLLECTION_ID
    ));

    if (ownsValidNFT) {
      bot.sendMessage(tg, '✅ Verification successful. Welcome to the group!');
    } else {
      bot.sendMessage(tg, '❌ Verification failed. No qualifying NFT found.');
    }

    return res.status(200).send({ success: true });
  } catch (error) {
    console.error('Verification error:', error);
    bot.sendMessage(tg, '⚠️ An error occurred during verification.');
    return res.status(500).send({ success: false });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Verifier backend is running on port ${PORT}`);
});
