require("dotenv").config();
const { Buffer } = require("buffer");
const CoinKey = require("coinkey");
const fs = require("fs");
const request = require('sync-request');

const PROGRESS_FILE = "progress.log";
const FOUND_FILE = "found/rns_found_balance2.txt";
const START_FROM = fs.existsSync(PROGRESS_FILE) ? fs.readFileSync(PROGRESS_FILE, "utf8").trim() : "0";
const TARGET_ADDRESSES_FILE = "./target_addresses.json";

let targetAddresses = new Set();
if (fs.existsSync(TARGET_ADDRESSES_FILE)) {
    const data = fs.readFileSync(TARGET_ADDRESSES_FILE, "utf8");
    targetAddresses = new Set(JSON.parse(data));
} else {
    console.error(`⚠️ Warning: Target addresses file '${TARGET_ADDRESSES_FILE}' not found!`);
}

function mainStart(startFrom) {
    try {
        let count = BigInt(startFrom);
        const step = BigInt(1);
        const padded = Buffer.alloc(32);
        let iteration = 0;

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
                let rBalance = [0, 0, 0];

                if (iteration % 10000 === 0) {
                    console.log(`🔍 ${PrivateKey}, ${PublicAddress} -> ${rBalance[0]}, ${rBalance[1]}, ${rBalance[2]}`);
                }

                if (rBalance[0] > 0) {
                    fs.appendFileSync(FOUND_FILE, `🚀 BTC Key Found: ${count} -> ${PrivateKey} -> ${PublicAddress} -> ${rBalance[0]}, ${rBalance[1]}, ${rBalance[2]}\n`, "utf8");
                }

                if (targetAddresses.has(PublicAddress)) {
                    const resultKey = `🚀 BTC Key Found: ${count} -> ${PrivateKey} -> ${PublicAddress}\n`;
                    fs.appendFileSync(FOUND_FILE, resultKey, "utf8");
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

mainStart(START_FROM);
