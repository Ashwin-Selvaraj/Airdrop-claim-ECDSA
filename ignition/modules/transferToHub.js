const { ethers } = require("ethers");
require("dotenv").config();
const { readFileSync } = require("fs");
const path = require("path");

// Load environment variables
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = require("../../deployments/BSCTestnet.json").ASHTokenContractAddress;
const HUB_ADDRESS = require("../../deployments/BSCTestnet.json").AshClaimHubContractAddress;
const ABI = require("../../artifacts/contracts/Ash_Token.sol/AshToken.json").abi;

async function main() {
    if (!PRIVATE_KEY || !CONTRACT_ADDRESS || !HUB_ADDRESS || !ABI) {
        console.error("Missing environment variables or contract addresses");
        process.exit(1);
    }

    const network = process.env.NETWORK || "BSCTestnet";
    let provider;

    // Set provider based on the environment
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
    const token = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);
    
    console.log("Transfer Details:");
    console.log("- From:", wallet.address);
    console.log("- To (Hub):", HUB_ADDRESS);
    console.log("- Token Contract:", CONTRACT_ADDRESS);
    
    // Check current balances
    const deployerBalance = await token.balanceOf(wallet.address);
    const hubBalance = await token.balanceOf(HUB_ADDRESS);
    
    console.log("- Deployer Token Balance:", ethers.formatEther(deployerBalance));
    console.log("- Hub Token Balance:", ethers.formatEther(hubBalance));
    
    // Check if deployer has tokens to transfer
    if (deployerBalance === 0n) {
        console.log("❌ Deployer has no tokens to transfer!");
        console.log("💡 You may need to mint tokens first or check if tokens were already transferred.");
        return;
    }
    
    // Transfer amount (you can modify this)
    const transferAmount = deployerBalance; // Transfer all tokens
    console.log("- Transfer Amount:", ethers.formatEther(transferAmount));
    
    console.log("Sending transfer transaction...");
    const tx = await token.transfer(HUB_ADDRESS, transferAmount);
    console.log("Transaction hash:", tx.hash);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Transfer confirmed in block", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed?.toString?.() ?? receipt.gasUsed);
    
    // Check final balances
    const finalDeployerBalance = await token.balanceOf(wallet.address);
    const finalHubBalance = await token.balanceOf(HUB_ADDRESS);
    
    console.log("\nFinal Balances:");
    console.log("- Deployer Token Balance:", ethers.formatEther(finalDeployerBalance));
    console.log("- Hub Token Balance:", ethers.formatEther(finalHubBalance));
    console.log("✅ Transfer completed successfully!");
}

main().catch((error) => {
    console.error("Error:", error);
    process.exitCode = 1;
});
