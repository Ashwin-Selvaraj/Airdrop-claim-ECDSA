// backend/signVoucher.js
require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

/**
 * Sign a cumulative voucher for `userAddress` for `cumulativeAmountTokens` (human units).
 * - cumulativeAmountTokens: "4200" (string or number) => will be converted to base units (18 decimals)
 * - hubAddress: claim contract address (0x...)
 * - chainId: number (e.g., 97 for BSC testnet). Defaults to process.env.CHAIN_ID or 97.
 *
 * Returns: { cumulativeAmountBase, signature }
 */
async function signVoucher(userAddress, cumulativeAmountTokens, hubAddress) {
  if (!ethers.isAddress(userAddress)) throw new Error("invalid user address");
  if (!ethers.isAddress(hubAddress)) throw new Error("invalid hub address");

  const signerKey = process.env.SIGNER_KEY;
  if (!signerKey) throw new Error("SIGNER_KEY missing in .env");

  const chainId = Number(process.env.CHAIN_ID || 97);

  // Convert human tokens -> base units (18 decimals)
  const amountBase = ethers.parseUnits(String(cumulativeAmountTokens), 18); // BigInt

  // Create wallet from signer key (do NOT store this in plain file on prod)
  const wallet = new ethers.Wallet(signerKey);

  // Build the packed message exactly as contract expects:
  // keccak256(abi.encodePacked(user, cumulativeAmount, chainId, hubAddress))
  const packed = ethers.solidityPacked(
    ["address", "uint256", "uint256", "address"],
    [userAddress, amountBase, chainId, hubAddress]
  );
  const msgHash = ethers.keccak256(packed);

  // Sign the hash as an Ethereum signed message
  const signature = await wallet.signMessage(ethers.getBytes(msgHash));

  return {
    user: userAddress,
    cumulativeTokens: String(cumulativeAmountTokens),
    cumulativeAmountBase: amountBase.toString(),
    hub: hubAddress,
    chainId,
    signature
  };
}

// CLI usage: node backend/signVoucher.js 0xUser 4200 0xHub
if (require.main === module) {
  (async () => {
    try {
      const user = process.env.USER_ADDRESS;
      const tokens = process.env.CUMULATIVE_TOKENS;
      // Read hub address from deployment file
      const deploymentData = require("../deployments/BSCTestnet.json");
      const hub = deploymentData.AshClaimHubContractAddress;

      const out = await signVoucher(user, tokens, hub);
      console.log(JSON.stringify(out, null, 2));
      
      // Check if user has already claimed this amount
      console.log("\n📊 Claim Status:");
      console.log(`- Cumulative Amount: ${out.cumulativeTokens} tokens`);
      console.log(`- Amount in Wei: ${out.cumulativeAmountBase}`);
      console.log("💡 If you get 'nothing to claim' error, you need to increase the cumulative amount");
      console.log("💡 Try setting CUMULATIVE_TOKENS to a higher value (e.g., 1000) in your .env file");
      
      // Update claimData.json with the new signature
      const claimDataPath = path.join(__dirname, "..", "claimData.json");
      fs.writeFileSync(claimDataPath, JSON.stringify(out, null, 2));
      console.log("✅ Updated claimData.json with new signature");
    } catch (err) {
      console.error("Error:", err.message || err);
      process.exit(1);
    }
  })();
}

module.exports = { signVoucher };
