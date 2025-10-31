import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ethers } from 'ethers';

// Env
const RPC_URL = process.env.SEPOLIA_RPC_URL;           // e.g. https://sepolia.infura.io/v3/<id>
const OWNER_PRIVATE_KEY = process.env.SEPOLIA_PRIVATE_KEY; // deployer/owner private key (test wallet)
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;  // deployed AuditLog address

// Params
const ITEM_ID = Number(process.env.ITEM_ID || '0');     // e.g. 12345 (0 skips addItem)
const ITEM_NAME = process.env.ITEM_NAME || 'Demo Item';
const ITEM_LOCATION = process.env.ITEM_LOCATION || 'Origin';
const ITEM_TIMESTAMP = process.env.ITEM_TIMESTAMP || new Date().toISOString();
const AUTHORIZE_HANDLER = process.env.AUTHORIZE_HANDLER || ''; // 0xHandler to authorize

if (!RPC_URL || !OWNER_PRIVATE_KEY || !CONTRACT_ADDRESS) {
	console.error('Missing SEPOLIA_RPC_URL or SEPOLIA_PRIVATE_KEY or CONTRACT_ADDRESS');
	process.exit(1);
}

const artifactPath = resolve(process.cwd(), 'artifacts/contract/AuditLog.sol/AuditLog.json');
const artifact = JSON.parse(readFileSync(artifactPath, 'utf-8'));

async function main() {
	const provider = new ethers.JsonRpcProvider(RPC_URL);
	const owner = new ethers.Wallet(OWNER_PRIVATE_KEY, provider);
	const contract = new ethers.Contract(CONTRACT_ADDRESS, artifact.abi, owner);

	if (ITEM_ID > 0) {
		console.log('addItem', { ITEM_ID, ITEM_NAME, ITEM_LOCATION, ITEM_TIMESTAMP, owner: await owner.getAddress() });
		const tx = await contract.addItem(ITEM_ID, ITEM_NAME, ITEM_LOCATION, ITEM_TIMESTAMP, await owner.getAddress());
		await tx.wait();
		console.log('addItem done:', tx.hash);
	}

	if (AUTHORIZE_HANDLER) {
		console.log('setHandlerAuthorization', AUTHORIZE_HANDLER);
		const tx2 = await contract.setHandlerAuthorization(AUTHORIZE_HANDLER, true);
		await tx2.wait();
		console.log('authorize done:', tx2.hash);
	}

	console.log('OK');
}

main().catch((e) => { console.error(e); process.exit(1); });
