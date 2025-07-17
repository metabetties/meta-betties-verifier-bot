document.addEventListener("DOMContentLoaded", async () => {
  const connectBtn = document.getElementById("connectBtn");
  const statusText = document.getElementById("statusText");
  const tg = new URLSearchParams(window.location.search).get("tg");

  if (!tg) {
    statusText.innerHTML = "❌ Missing Telegram ID.";
    connectBtn.disabled = true;
    return;
  }

  connectBtn.addEventListener("click", async () => {
    if (!window.solana || !window.solana.isPhantom) {
      statusText.innerHTML = "❌ Please install Phantom Wallet.";
      return;
    }

    try {
      const resp = await window.solana.connect();
      const wallet = resp.publicKey.toString();

      statusText.innerHTML = "⏳ Verifying wallet…";

      const verifyResp = await fetch("/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, tg })
      });

      const data = await verifyResp.json();

      if (verifyResp.ok && data.success) {
        statusText.innerHTML = "✅ Wallet verified! Redirecting to Telegram…";
        setTimeout(() => {
          window.location.href = data.groupLink;
        }, 2000);
      } else {
        statusText.innerHTML = `❌ ${data.message || "Verification failed."}`;
      }

    } catch (err) {
      console.error("Wallet verification error:", err);
      statusText.innerHTML = "❌ Wallet connection failed.";
    }
  });
});
