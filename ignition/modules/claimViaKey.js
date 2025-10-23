const { ethers } = require("ethers");
require("dotenv").config();
const { StandardMerkleTree } = require("@openzeppelin/merkle-tree");
const {readFileSync} = require("fs");

// Load environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = require("../../deployments/BSCTestnet.json").AshClaimHubContractAddress;
const ABI = require("../../artifacts/contracts/Ash_ClaimHub.sol/Ash_ClaimHub.json").abi; // Ensure you have the artifact of your contract

async function main(){
    if(!PRIVATE_KEY || !CONTRACT_ADDRESS || !ABI){
        console.error("Missing environment variables");
        process.exit(1);
    }

    const network = process.env.NETWORK || "BSCTestnet";
    let provider;

     // Set provider based on the environment (Testnet or Mainnet)
     switch (network) {
        case "mainnet":
            provider = new ethers.JsonRpcProvider(process.env.MAINNET_RPC_URL);
            break;
        case "sepolia":
            provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
            break;
        case "matic":
            provider = new ethers.JsonRpcProvider(process.env.MATIC_RPC_URL);
            break;
        case "BSCTestnet":
            provider = new ethers.JsonRpcProvider(process.env.BSC_TESTNET_RPC_URL);
            break;
        case "scrollSepolia":
            provider = new ethers.JsonRpcProvider(process.env.SCROLL_SEPOLIA_RPC_URL);
            break;
        default:
            throw new Error("Invalid or unsupported network provided. Check the NETWORK variable.");
    }

    // Check provider readiness
    if (!provider) throw new Error("Provider initialization failed. Verify the RPC URLs.");

    // Create a signer (wallet)
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const hub = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);
    const cumulativeAmountBase = process.env.CUMULATIVE_AMOUNT_BASE;
    const signature = process.env.SIGNATURE;
    console.log("Sending claimSigned transaction...");
    const tx = await hub.claimSigned(ethers.BigInt(cumulativeAmountBase), signature);
    console.log("tx hash:", tx.hash);
    console.log("waiting for confirmation...");
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed?.toString?.() ?? receipt.gasUsed);
    console.log("Done — tokens claimed (if signature was valid and hub had funds).");

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});