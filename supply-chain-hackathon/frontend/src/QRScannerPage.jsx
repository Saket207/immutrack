import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import QrReader from 'react-qr-scanner'
import { ethers } from 'ethers'
import axios from 'axios'
import jsQR from 'jsqr'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { Wallet, Scan, Upload, CheckCircle, AlertCircle, Copy, ExternalLink } from 'lucide-react'

const BACKEND_URL = 'http://localhost:3001'
const SEPOLIA_CHAIN_ID = 11155111

const CONTRACT_ABI = [
	"function transferItem(uint256 _itemId, address _to, string _location, string _timestamp) public",
]

export default function QRScannerPage() {
	const [hasCamera, setHasCamera] = useState(false)
	const [devices, setDevices] = useState([])
	const [selectedDeviceId, setSelectedDeviceId] = useState('')
	const [readerKey, setReaderKey] = useState(0)
	const [qr, setQr] = useState(null)
	const [status, setStatus] = useState('Ready')
	const [account, setAccount] = useState('')
	// Default contract address on Sepolia
	const [contractAddress, setContractAddress] = useState('0xcd8ba1f84b45eba6f48f5ef907324fa5218d1f51')
	const [txHash, setTxHash] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)
	const canvasRef = useRef(null)
	const switchingRef = useRef(false)

	const constraints = useMemo(() => (
		selectedDeviceId
			? { audio: false, video: { deviceId: { exact: selectedDeviceId } } }
			: { audio: false, video: { facingMode: 'environment' } }
	), [selectedDeviceId])

	useEffect(() => {
		(async () => {
			try {
				const all = await navigator.mediaDevices?.enumerateDevices?.()
				const cams = (all || []).filter(d => d.kind === 'videoinput')
				setDevices(cams)
				setHasCamera(cams.length > 0)
				if (cams.length > 0 && !selectedDeviceId) setSelectedDeviceId(cams[cams.length - 1].deviceId)
			} catch {
				setHasCamera(false)
			}
		})()
	}, [selectedDeviceId])

	const onScan = useCallback((result) => {
		if (!result) return
		const text = typeof result === 'string' ? result : result?.text
		if (!text || typeof text !== 'string' || !text.trim().startsWith('{')) return
		try {
			const parsed = JSON.parse(text)
			setQr(parsed)
			setStatus('QR loaded')
			toast.success('QR code scanned successfully!', { icon: '✅' })
		} catch (e) {
			// ignore non-JSON
		}
	}, [])

	const onError = useCallback((err) => {
		const msg = `Camera error: ${err?.message || err}`
		setStatus(msg)
		toast.error(msg)
	}, [])

	const connect = useCallback(async () => {
		if (!window.ethereum) {
			const msg = 'MetaMask not found. Please install MetaMask extension.'
			setStatus(msg)
			toast.error(msg)
			return
		}
		try {
			const provider = new ethers.BrowserProvider(window.ethereum)
			const [addr] = await window.ethereum.request({ method: 'eth_requestAccounts' })
			const net = await provider.getNetwork()
			setAccount(addr)
			const current = Number(net.chainId)
			if (current !== SEPOLIA_CHAIN_ID) {
				if (switchingRef.current) {
					setStatus('Approve MetaMask network request')
					return
				}
				switchingRef.current = true
				try {
					setStatus('Switching wallet to Sepolia...')
					toast.loading('Switching to Sepolia network...')
					await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0xaa36a7' }] })
					toast.dismiss()
					toast.success('Switched to Sepolia!')
				} finally {
					switchingRef.current = false
				}
			}
			const msg = `Connected ${addr.substring(0, 10)}... on Sepolia`
			setStatus(msg)
			toast.success(msg, { icon: '🎉' })
		} catch (e) {
			const msg = `Connection failed: ${e.message || e}`
			setStatus(msg)
			toast.error(msg)
		}
	}, [])

	const copyToClipboard = (text) => {
		navigator.clipboard.writeText(text)
		toast.success('Copied to clipboard!')
	}

	const submit = useCallback(async () => {
		if (!qr) {
			toast.error('Please scan or paste a QR code first')
			return
		}
		if (!window.ethereum) {
			toast.error('MetaMask not found')
			return
		}

		setIsSubmitting(true)
		try {
			const provider = new ethers.BrowserProvider(window.ethereum)
			const signer = await provider.getSigner()
			// Get handler address (ensure it's a plain address, not ENS)
			const handler = (await signer.getAddress()).toLowerCase()
			const network = await provider.getNetwork()
			const chainId = Number(network.chainId)

			// Ensure we're on Sepolia
			if (chainId !== SEPOLIA_CHAIN_ID) {
				if (switchingRef.current) {
					toast.error('Please approve the network switch first')
					setIsSubmitting(false)
					return
				}
				switchingRef.current = true
				try {
					toast.loading('Switching to Sepolia network...')
					await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0xaa36a7' }] })
					toast.dismiss()
				} finally {
					switchingRef.current = false
				}
			}

			// Get contract address from input or use backend's contract
			// For EIP-712, we need the contract address
			if (!contractAddress || !contractAddress.trim()) {
				toast.error('Please enter the Sepolia contract address')
				setIsSubmitting(false)
				return
			}

			// Normalize and validate the contract address
			let normalizedContractAddress = contractAddress.trim()
			if (!normalizedContractAddress.startsWith('0x')) {
				toast.error('Invalid contract address format')
				setIsSubmitting(false)
				return
			}
			
			// Ensure address is lowercase for EIP-712 (avoid ENS resolution)
			normalizedContractAddress = normalizedContractAddress.toLowerCase()
			
			// Validate address length
			if (normalizedContractAddress.length !== 42) {
				toast.error('Invalid contract address length')
				setIsSubmitting(false)
				return
			}

			const itemId = Number(qr.itemId)
			const location = qr.location || 'Scanned'

			// Prepare EIP-712 signature - ensure all values match backend exactly
			const domain = {
				name: 'AuditLog',
				version: '1',
				chainId: SEPOLIA_CHAIN_ID, // Use numeric chainId
				verifyingContract: normalizedContractAddress, // Use normalized lowercase address
			}

			const types = {
				Scan: [
					{ name: 'itemId', type: 'uint256' },
					{ name: 'location', type: 'string' },
				]
			}

			// Ensure itemId is a number, not string
			const value = {
				itemId: Number(itemId),
				location: String(location),
			}

			// Debug logging (can be removed later)
			console.log('EIP-712 Domain:', domain)
			console.log('EIP-712 Value:', value)
			console.log('Handler address:', handler)

			toast.loading('Please sign the message in MetaMask...')
			let signature
			try {
				signature = await signer.signTypedData(domain, types, value)
				toast.dismiss()
				console.log('Signature created successfully')
			} catch (e) {
				toast.dismiss()
				const msg = `Signing rejected: ${e.message || e}`
				setStatus(msg)
				toast.error(msg)
				setIsSubmitting(false)
				return
			}

			// Send to backend - ensure handler is lowercase for consistent comparison
			toast.loading('Submitting transaction...')
			const res = await axios.post(`${BACKEND_URL}/scans`, {
				itemId,
				location,
				signature,
				handler: handler.toLowerCase(), // Ensure lowercase for backend comparison
			})
			
			const txHash = res.data.txHash
			setTxHash(txHash)
			setStatus('Transaction recorded successfully!')
			toast.dismiss()
			toast.success(
				<span>
					Transaction confirmed!{' '}
					<a 
						href={`https://sepolia.etherscan.io/tx/${txHash}`} 
						target="_blank" 
						rel="noopener noreferrer"
						style={{ color: 'inherit', textDecoration: 'underline' }}
					>
						View on Etherscan
					</a>
				</span>,
				{ duration: 5000, icon: '🎉' }
			)
		} catch (e) {
			// Show detailed error information
			const errorDetails = e.response?.data?.details || {};
			const errorMsg = e.response?.data?.error || e.shortMessage || e.message || e;
			let msg = errorMsg;
			
			if (errorDetails.recovered && errorDetails.handler) {
				console.error('Signature mismatch details:', errorDetails);
				msg = `${errorMsg}\nRecovered: ${errorDetails.recovered}\nHandler: ${errorDetails.handler}\nChainId: ${errorDetails.chainId || 'unknown'}`;
			}
			
			console.error('Full error response:', e.response?.data);
			setStatus(msg)
			toast.dismiss()
			toast.error(msg, { duration: 8000 })
		} finally {
			setIsSubmitting(false)
		}
	}, [qr, contractAddress])

	const handleImageUpload = useCallback(async (e) => {
		const file = e.target.files?.[0]
		if (!file) return
		setStatus('Decoding image...')
		toast.loading('Decoding QR from image...')
		const reader = new FileReader()
		reader.onload = async () => {
			try {
				const img = new Image()
				img.onload = async () => {
					const canvas = canvasRef.current
					if (!canvas) {
						setStatus('Canvas not ready')
						toast.error('Canvas not ready')
						return
					}
					canvas.width = img.naturalWidth
					canvas.height = img.naturalHeight
					const ctx = canvas.getContext('2d')
					ctx.drawImage(img, 0, 0)

					if (window.BarcodeDetector) {
						try {
							const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
							const bitmap = await createImageBitmap(img)
							const detected = await detector.detect(bitmap)
							const val = detected?.[0]?.rawValue
							if (val) {
								const parsed = JSON.parse(val)
								setQr(parsed)
								setStatus('QR loaded from image')
								toast.dismiss()
								toast.success('QR code decoded from image!')
								return
							}
						} catch {}
					}

					try {
						const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
						const code = jsQR(imageData.data, canvas.width, canvas.height)
						if (code?.data) {
							const parsed = JSON.parse(code.data)
							setQr(parsed)
							setStatus('QR loaded from image')
							toast.dismiss()
							toast.success('QR code decoded from image!')
							return
						}
					} catch {}

					setStatus('Could not decode QR from image')
					toast.dismiss()
					toast.error('Could not decode QR code from image')
				}
				img.onerror = () => {
					setStatus('Image load failed')
					toast.error('Image load failed')
				}
				img.src = reader.result
			} catch (err) {
				setStatus('Image decode error')
				toast.error('Image decode error')
			}
		}
		reader.onerror = () => {
			setStatus('File read failed')
			toast.error('File read failed')
		}
		reader.readAsDataURL(file)
	}, [])

	return (
		<div className="container">
			<motion.div 
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				className="row" 
				style={{justifyContent:'space-between', marginBottom: 20}}
			>
				<div className="title">
					<Scan size={28} />
					QR Scanner <span className="badge">Sepolia</span>
				</div>
				<div className="status">
					<AlertCircle size={16} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />
					{status}
				</div>
			</motion.div>

			<motion.div 
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.1 }}
				className="card" 
				style={{marginBottom: 16}}
			>
				<div className="row" style={{gap: 12}}>
					<button onClick={connect} className="btn btn-primary" disabled={!!account}>
						<Wallet size={18} />
						{account ? 'Connected' : 'Connect MetaMask'}
					</button>
					<div style={{flex: 1}}>
						<label className="label">Contract Address (Sepolia)</label>
						<input 
							className="input" 
							placeholder="0xcD8BA1f84B45ebA6f48F5EF907324fa5218d1f51" 
							value={contractAddress} 
							onChange={(e) => {
								let value = e.target.value.trim()
								// Auto-format: ensure lowercase and valid format
								if (value && value.startsWith('0x')) {
									value = value.toLowerCase()
								}
								setContractAddress(value)
							}} 
						/>
						{contractAddress && contractAddress.length > 0 && contractAddress.length !== 42 && (
							<p className="hint" style={{color: '#ef4444', marginTop: 4}}>Invalid address length (should be 42 characters including 0x)</p>
						)}
					</div>
				</div>
			</motion.div>

			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.2 }}
				className="card" 
				style={{marginBottom: 16}}
			>
				<AnimatePresence mode="wait">
					{hasCamera ? (
						<motion.div
							key="camera"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
						>
							<div className="row" style={{marginBottom: 12}}>
								<div style={{minWidth: 180, flex: 1}}>
									<label className="label">Camera</label>
									<select className="select" value={selectedDeviceId} onChange={(e) => setSelectedDeviceId(e.target.value)}>
										{devices.map((d, i) => (
											<option key={d.deviceId || i} value={d.deviceId}>{d.label || `Camera ${i+1}`}</option>
										))}
									</select>
								</div>
								<button className="btn" onClick={() => setReaderKey(k => k + 1)} style={{marginTop: 24}}>
									Restart camera
								</button>
							</div>
							<div className="scanner-frame">
								<QrReader key={readerKey} delay={400} onError={onError} onScan={onScan} constraints={constraints} style={{ width: '100%' }} />
							</div>
						</motion.div>
					) : (
						<motion.p 
							key="no-camera"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className="hint"
						>
							No camera detected. You can upload a QR image or paste the JSON below.
						</motion.p>
					)}
				</AnimatePresence>
				
				<div className="row" style={{marginTop: 16}}>
					<label className="input" style={{display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'}}>
						<Upload size={18} />
						Upload QR Image
						<input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
					</label>
					<canvas ref={canvasRef} style={{ display: 'none' }} />
				</div>
				
				<div className="stack" style={{marginTop: 16}}>
					<label className="label">QR JSON (fallback)</label>
					<textarea 
						rows={4} 
						className="textarea" 
						placeholder='{"itemId":"9400","itemName":"Organic Rice","location":"Bangalore","timestamp":"2025-10-31 14:30:00","blockchainHash":"0x..."}' 
						onChange={(e) => { 
							try { 
								const parsed = JSON.parse(e.target.value)
								setQr(parsed)
								setStatus('QR loaded')
								toast.success('QR JSON loaded!')
							} catch {} 
						}} 
					/>
				</div>
			</motion.div>

			<AnimatePresence>
				{qr && (
					<motion.div 
						initial={{ opacity: 0, scale: 0.95 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.95 }}
						className="card" 
						style={{marginBottom: 16}}
					>
						<div className="grid-2">
							<div>
								<span className="label">Item ID</span>
								<div style={{fontSize: 16, fontWeight: 600}}>{String(qr.itemId)}</div>
							</div>
							<div>
								<span className="label">Name</span>
								<div style={{fontSize: 16, fontWeight: 600}}>{qr.itemName || '-'}</div>
							</div>
							<div>
								<span className="label">Location</span>
								<div style={{fontSize: 16, fontWeight: 600}}>{qr.location || '-'}</div>
							</div>
							<div>
								<span className="label">Timestamp</span>
								<div style={{fontSize: 16, fontWeight: 600}}>{qr.timestamp || '-'}</div>
							</div>
						</div>
						{qr.blockchainHash && (
							<div style={{marginTop: 12}}>
								<span className="label">Initial Tx</span>
								<div className="tx-hash" style={{display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer'}} onClick={() => copyToClipboard(qr.blockchainHash)}>
									{qr.blockchainHash}
									<Copy size={14} />
								</div>
							</div>
						)}
					</motion.div>
				)}
			</AnimatePresence>

			<motion.div 
				className="row" 
				style={{justifyContent:'flex-end', marginBottom: 16}}
				whileHover={{ scale: 1.02 }}
				whileTap={{ scale: 0.98 }}
			>
				<button 
					onClick={submit} 
					className="btn btn-success" 
					disabled={!qr || isSubmitting}
					style={{position: 'relative', overflow: 'hidden'}}
				>
					{isSubmitting ? (
						<>
							<div className="spinner" style={{width: 16, height: 16, marginRight: 8}} />
							Processing...
						</>
					) : (
						<>
							<CheckCircle size={18} />
							Confirm Transfer / Verification
						</>
					)}
				</button>
			</motion.div>

			<AnimatePresence>
				{txHash && (
					<motion.div 
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
						className="card" 
						style={{marginTop: 16}}
					>
						<span className="label">Transaction Hash</span>
						<div className="tx-hash" style={{display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between'}}>
							<span style={{flex: 1}}>{txHash}</span>
							<div style={{display: 'flex', gap: 8}}>
								<button 
									className="btn" 
									onClick={() => copyToClipboard(txHash)}
									style={{padding: '4px 8px', fontSize: 12}}
								>
									<Copy size={14} />
								</button>
								<a 
									href={`https://sepolia.etherscan.io/tx/${txHash}`}
									target="_blank"
									rel="noopener noreferrer"
									className="btn"
									style={{padding: '4px 8px', fontSize: 12, textDecoration: 'none'}}
								>
									<ExternalLink size={14} />
								</a>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
			</div>
	)
}
