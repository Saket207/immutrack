import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ethers } from 'ethers';
import 'dotenv/config';

const RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.SEPOLIA_PRIVATE_KEY;

if (!RPC_URL || !PRIVATE_KEY) {
	console.error('Missing SEPOLIA_RPC_URL or SEPOLIA_PRIVATE_KEY');
	process.exit(1);
}

const artifactPath = resolve(process.cwd(), 'artifacts/contract/AuditLog.sol/AuditLog.json');
const artifact = JSON.parse(readFileSync(artifactPath, 'utf-8'));

async function main() {
	const provider = new ethers.JsonRpcProvider(RPC_URL);
	const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
	const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
	console.log('Deploying AuditLog to Sepolia...');
	const contract = await factory.deploy(await wallet.getAddress());
	await contract.waitForDeployment();
	console.log('Deployed at:', await contract.getAddress());
}

main().catch((e) => { console.error(e); process.exit(1); });
