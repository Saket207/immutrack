import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ethers } from "ethers";

// Local Hardhat node RPC (can be overridden via environment variable RPC_URL)
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";

// First default Hardhat account private key (unsafe for prod; for local only)
const OWNER_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

// Demo params
const DEMO_HANDLER_ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
const TEST_ITEM_ID = 12345;
const TEST_LOCATION = "Warehouse A";

function loadArtifact() {
  const artifactPath = resolve(
    process.cwd(),
    "artifacts/contract/AuditLog.sol/AuditLog.json"
  );
  const json = readFileSync(artifactPath, "utf-8");
  return JSON.parse(json);
}

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const owner = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);

  const artifact = loadArtifact();
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, owner);

  console.log("Deploying AuditLog...");
  const contract = await factory.deploy(await owner.getAddress());
  await contract.waitForDeployment();
  console.log("Deployed at:", await contract.getAddress());

  // Set up demo state
  let nextNonce = await provider.getTransactionCount(await owner.getAddress());
  const tx1 = await contract.registerItem(TEST_ITEM_ID, { nonce: nextNonce++, gasLimit: 3_000_000 });
  await tx1.wait();
  const tx2 = await contract.setHandlerAuthorization(DEMO_HANDLER_ADDRESS, true, { nonce: nextNonce++, gasLimit: 3_000_000 });
  await tx2.wait();
  const tx3 = await contract.addScan(TEST_ITEM_ID, DEMO_HANDLER_ADDRESS, TEST_LOCATION, { nonce: nextNonce++, gasLimit: 3_000_000 });
  await tx3.wait();

  const history = await contract.getHistory(TEST_ITEM_ID);
  console.log("History count:", history.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


