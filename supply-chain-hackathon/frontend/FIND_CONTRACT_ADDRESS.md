# How to Find Your Sepolia Contract Address

## Option 1: If Already Deployed ✅

### Check Backend Environment Variables
The contract address should be stored in:
- `supply-chain-hackathon/backend/.env` file as `CONTRACT_ADDRESS`

Or check your terminal/console where you ran:
```bash
node scripts/deploy-sepolia.mjs
```

The output will show: `Deployed at: 0x...`

---

## Option 2: Deploy to Sepolia (Get New Address) 🚀

### Step 1: Get Sepolia RPC URL
You need a Sepolia RPC endpoint. You can get one from:
- **Alchemy**: https://www.alchemy.com/ (free tier available)
- **Infura**: https://www.infura.io/ (free tier available)
- **QuickNode**: https://www.quicknode.com/ (free tier available)

Example Sepolia RPC URL format:
```
https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
```

### Step 2: Get Private Key with Sepolia ETH
- Open MetaMask
- Switch to **Sepolia Testnet**
- Select the account you want to use as contract owner
- Click account name → **Show Private Key**
- Copy the private key (starts with `0x`)
- Make sure this account has Sepolia ETH (get free test ETH from faucets)

### Step 3: Deploy Contract
```bash
cd supply-chain-hackathon/hardhat-contract

# Set environment variables (Windows PowerShell)
$env:SEPOLIA_RPC_URL="YOUR_RPC_URL_HERE"
$env:SEPOLIA_PRIVATE_KEY="YOUR_PRIVATE_KEY_HERE"

# Deploy
node scripts/deploy-sepolia.mjs
```

The script will output:
```
Deployed at: 0xYourContractAddressHere
```

**Copy that address** - that's your Sepolia contract address!

### Step 4: Update Backend .env
Create or update `supply-chain-hackathon/backend/.env`:
```env
RPC_URL=YOUR_SEPOLIA_RPC_URL
PRIVATE_KEY=YOUR_PRIVATE_KEY
CONTRACT_ADDRESS=0xYourContractAddressHere
PORT=3001
```

### Step 5: Use in Frontend
Paste the contract address in the "Contract Address (Sepolia)" field in the QR Scanner page.

---

## Option 3: Find on Etherscan 🔍

If you deployed before but lost the address:

1. Go to https://sepolia.etherscan.io/
2. Enter your MetaMask wallet address (the one you used to deploy)
3. Look for contract deployment transactions
4. Click on the deployment transaction
5. Find "Contract Creation" section - the contract address will be there

---

## Quick Check: What's in Your Backend?

Check if you have a `.env` file:
```bash
cd supply-chain-hackathon/backend
# Look for .env file
```

If `.env` exists, open it and look for `CONTRACT_ADDRESS=`

