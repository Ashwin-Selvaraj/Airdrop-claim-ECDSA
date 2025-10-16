// backend/signVoucher.js
require("dotenv").config();
const { ethers } = require("ethers");

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
    const args = process.argv.slice(2);
    if (args.length < 3) {
      console.log("Usage: node backend/signVoucher.js <userAddress> <cumulativeTokens> <hubAddress>");
      process.exit(1);
    }
    
    const [userAddress, cumulativeTokens, hubAddress] = args;
    
    try {
      const out = await signVoucher(userAddress, cumulativeTokens, hubAddress);
      console.log(JSON.stringify(out, null, 2));
    } catch (err) {
      console.error("Error:", err.message || err);
      process.exit(1);
    }
  })();
}

module.exports = { signVoucher };
