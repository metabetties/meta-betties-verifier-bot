require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Telegraf } = require("telegraf");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

const bot = new Telegraf(process.env.BOT_TOKEN);
const PORT = process.env.PORT || 8080;

const COLLECTION_ID = "j7qeFNnpWTbaf5g9sMCxP2zfKrH5QFgE56SuYjQDQi1";

bot.start((ctx) => {
  const userId = ctx.from.id;
  const url = `https://metabetties.github.io/meta-betties-verifier-bot/?tg=${userId}`;
  ctx.reply(`Please verify your wallet by visiting: ${url}`);
});

app.get("/", (req, res) => {
  res.send("Meta Betties Verifier Bot is running.");
});

app.post("/verify", async (req, res) => {
  const { wallet, tg } = req.body;
  if (!wallet || !tg) return res.status(400).send("Missing wallet or tg param");

  try {
    const response = await axios.post(
      `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY
}`,
      {
        jsonrpc: "2.0",
        id: 1,
        method: "getAssetsByOwner",
        params: {
          ownerAddress: wallet,
          page: 1,
          limit: 1000,
          displayOptions: {
            showCollectionMetadata: true,
          },
        },
      }
    );

    const assets = response.data.result.items || [];
    const ownsFromCollection = assets.some(
      (asset) => asset.grouping?.some((g) => g.group_value === COLLECTION_ID)
    );

    if (ownsFromCollection) {
      await bot.telegram.sendMessage(tg, "✅ Wallet verified! Welcome to the group.");
      res.send("Verification success");
    } else {
      await bot.telegram.sendMessage(tg, "❌ Verification failed. You do not hold a valid token.");
      res.status(403).send("Verification failed");
    }
  } catch (err) {
    console.error("Verification error:", err.message);
    res.status(500).send("Internal server error");
  }
});

app.listen(PORT, () => {
  console.log(`✅ Verifier backend is running on port ${PORT}`);
});

bot.launch();
