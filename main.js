require("dotenv").config();
const { Buffer } = require("buffer");
const CoinKey = require("coinkey");
const fs = require("fs");
const TelegramBot = require("node-telegram-bot-api");
const request = require('sync-request');
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "YOUR_TELEGRAM_BOT_TOKEN";
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || "YOUR_CHAT_ID";

if (!TOKEN || !CHAT_ID) {
  console.error("❌ Missing Telegram Bot Token or Chat ID in .env file.");
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });
bot.on("polling_error", console.error);

const PROGRESS_FILE = "progress.log";
const FOUND_FILE = "found/rns_found_balance2.txt";
const START_FROM = fs.existsSync(PROGRESS_FILE) ? fs.readFileSync(PROGRESS_FILE, "utf8").trim() : "0";

console.log("🤖 Telegram bot is running...");
console.log("Starting from:", START_FROM);

bot.sendMessage(CHAT_ID, "✅ Bot Started & Scanning...");

// Load target addresses from JSON file
const TARGET_ADDRESSES_FILE = "./target_addresses.json";
let targetAddresses = new Set();
if (fs.existsSync(TARGET_ADDRESSES_FILE)) {
    const data = fs.readFileSync(TARGET_ADDRESSES_FILE, "utf8");
    targetAddresses = new Set(JSON.parse(data));
} else {
    console.error(`⚠️ Warning: Target addresses file '${TARGET_ADDRESSES_FILE}' not found!`);
}

function startBot() {
  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id, "🎉 Welcome! The bot is running.");
  });

  bot.onText(/\/status/, (msg) => {
    bot.sendMessage(msg.chat.id, `📊 Bot is running. Last scanned: ${START_FROM}`);
  });

  bot.onText(/\/stop/, (msg) => {
    bot.sendMessage(msg.chat.id, "🛑 Stopping bot...");
    process.exit(0);
  });
}

function mainStart(startFrom) {
  try {
    let count = BigInt(startFrom);
    const step = BigInt(1);
    const padded = Buffer.alloc(32);
    let iteration = 0;
	const startTime = Date.now(); // Capture start time
    while (true) {
      try {
        count += step;
        iteration++;

        if (iteration % 1000 === 0) {
          fs.writeFileSync(PROGRESS_FILE, count.toString());
        }

        const countHex = count.toString(16);
        const countBytes = Buffer.from(countHex.padStart(64, "0"), "hex");
        countBytes.copy(padded);

        const key1 = new CoinKey(padded);
        const PrivateKey = key1.privateKey.toString("hex");
        const PublicAddress = key1.publicAddress;
        let rBalance = [0,0,0];//getBalance(PublicAddress);

        console.log(`🔍  ${PrivateKey}, ${PublicAddress} -> ${rBalance[0]},${rBalance[1]},${rBalance[2]}`);

        if (rBalance[0] > 0) {
          fs.appendFileSync(FOUND_FILE, `🚀 BTC Key Found: ${count} -> ${PrivateKey} -> ${PublicAddress} -> ${rBalance[0]},${rBalance[1]},${rBalance[2]}\n`, "utf8");
        }
		 rBalance = [0,0,0];//getBalance(PublicAddress);
        console.log(`🔍  ${PrivateKey}, ${PublicAddress} -> ${rBalance[0]},${rBalance[1]},${rBalance[2]}`);
		if(rBalance[0] > 0) {
			fs.appendFileSync(FOUND_FILE, `🚀 BTC Key Found: ${count} -> ${PrivateKey} -> ${PublicAddress} ->  ${rBalance[0]},${rBalance[1]},${rBalance[2]}\n`, { encoding: "utf8" });
		}
        if (targetAddresses.has(PublicAddress)) {
          const resultKey = `🚀 BTC Key Found: ${count} -> ${PrivateKey} -> ${PublicAddress}\n`;
          fs.appendFileSync(FOUND_FILE, resultKey, "utf8");
          bot.sendMessage(CHAT_ID, `🔥 Jackpot! Private Key Found!\n${resultKey}`);
		  console.log(resultKey);
        }
      } catch (innerError) {
        console.error("⚠️ Error inside loop:", innerError.code);
      }
    }
  } catch (error) {
    console.error("❌ Critical Error in main loop:", error);
  }
}

function getBalance(addr) {
  try {
    let url = `https://blockstream.info/api/address/${addr}`;
    var res = request('GET', url);
    var bd = res.getBody('utf8');
    var bd_s = JSON.parse(bd);
    var funded_txo_sum = bd_s.chain_stats.funded_txo_sum;
    var spent_txo_sum = bd_s.chain_stats.spent_txo_sum;
    return [parseInt(funded_txo_sum) - parseInt(spent_txo_sum), funded_txo_sum, spent_txo_sum];
  } catch (error) {
    return ['0A', '0B', '0C'];
  }
}
//$env:NODE_OPTIONS="--openssl-legacy-provider"


function getBalance(addr) {
	try {
		let url = 'https://blockstream.info/api/address/' + addr;
		var res = request('GET', url);
		var bd = res.getBody('utf8');
		var bd_s = JSON.parse(bd);
		var funded_txo_sum = bd_s.chain_stats.funded_txo_sum;
		var spent_txo_sum = bd_s.chain_stats.spent_txo_sum;
		return [parseInt(funded_txo_sum) - parseInt(spent_txo_sum),funded_txo_sum,spent_txo_sum];
	} catch(error) {
		return ['0A','0B','0C'];
	}
}
startBot();
mainStart(START_FROM);

//$env:NODE_OPTIONS="--openssl-legacy-provider"
//10000000000000000000000000000000000000000000000000000000000000000000001280999
//11111111111111111111111111111111111111111111111111111111111111111111111111111
