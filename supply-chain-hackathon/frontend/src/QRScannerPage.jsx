import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import QrReader from 'react-qr-scanner'
import { ethers } from 'ethers'
import axios from 'axios'
import jsQR from 'jsqr'

const BACKEND_URL = 'http://localhost:3001'
const SEPOLIA_CHAIN_ID = 11155111
// Sepolia-only path; local backend flow disabled to avoid chain switch prompts

// Minimal ABI for our upgraded contract
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
	const [contractAddress, setContractAddress] = useState('')
	const [txHash, setTxHash] = useState('')
	const canvasRef = useRef(null)
    const switchingRef = useRef(false)

	// Constraints prefer selected device; fallback to environment
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
		if (!text) return
		try {
			if (typeof text !== 'string' || !text.trim().startsWith('{')) return
			const parsed = JSON.parse(text)
			setQr(parsed)
			setStatus('QR loaded')
		} catch (e) {
			// ignore non-JSON
		}
	}, [])

	const onError = useCallback((err) => {
		setStatus(`Camera error: ${err?.message || err}`)
	}, [])

    const connect = useCallback(async () => {
		if (!window.ethereum) { setStatus('MetaMask not found'); return }
		const provider = new ethers.BrowserProvider(window.ethereum)
		const [addr] = await window.ethereum.request({ method: 'eth_requestAccounts' })
		const net = await provider.getNetwork()
		setAccount(addr)
        const current = Number(net.chainId)
        if (current !== SEPOLIA_CHAIN_ID) {
            if (switchingRef.current) { setStatus('Approve MetaMask network request'); return }
            switchingRef.current = true
            try {
                setStatus('Switching wallet to Sepolia...')
                await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0xaa36a7' }] })
            } finally {
                switchingRef.current = false
            }
        }
        setStatus(`Connected ${addr.substring(0, 10)}... on Sepolia`)
	}, [contractAddress])

    // Local ensureChain removed; Sepolia-only

	const submit = useCallback(async () => {
		if (!qr) { setStatus('Scan a QR first'); return }
		if (!window.ethereum) { setStatus('MetaMask not found'); return }
		const provider = new ethers.BrowserProvider(window.ethereum)
		const signer = await provider.getSigner()
		const addr = await signer.getAddress()
		const nowIso = new Date().toISOString()

        // Sepolia direct path requires contract address
        if (contractAddress) {
			try {
				const contract = new ethers.Contract(contractAddress, CONTRACT_ABI, signer)
				const tx = await contract.transferItem(qr.itemId, addr, qr.location || 'Scanned', qr.timestamp || nowIso)
				setStatus('Transaction sent, waiting...')
				const receipt = await tx.wait()
				setTxHash(receipt.hash)
				setStatus('Transaction recorded successfully!')
				return
			} catch (e) {
                setStatus(`Direct tx failed: ${e.shortMessage || e.message}.`)
			}
		}
        // No local fallback: require Sepolia contract address to proceed
        setStatus('Enter a Sepolia contract address to proceed (no local fallback).')
	}, [qr, contractAddress])

	const handleImageUpload = useCallback(async (e) => {
		const file = e.target.files?.[0]
		if (!file) return
		setStatus('Decoding image...')
		const reader = new FileReader()
		reader.onload = async () => {
			try {
				const img = new Image()
				img.onload = async () => {
					const canvas = canvasRef.current
					if (!canvas) { setStatus('Canvas not ready'); return }
					canvas.width = img.naturalWidth
					canvas.height = img.naturalHeight
					const ctx = canvas.getContext('2d')
					ctx.drawImage(img, 0, 0)

					// Try BarcodeDetector first
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
								return
							}
						} catch {}
					}

					// Fallback: jsQR from canvas pixels
					try {
						const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
						const code = jsQR(imageData.data, canvas.width, canvas.height)
						if (code?.data) {
							const parsed = JSON.parse(code.data)
							setQr(parsed)
							setStatus('QR loaded from image')
							return
						}
					} catch {}

					setStatus('Could not decode QR from image')
				}
				img.onerror = () => setStatus('Image load failed')
				img.src = reader.result
			} catch (err) {
				setStatus('Image decode error')
			}
		}
		reader.onerror = () => setStatus('File read failed')
		reader.readAsDataURL(file)
	}, [])

	return (
		<div className="container">
			<div className="row" style={{justifyContent:'space-between', marginBottom: 16}}>
				<div className="title">QR Scanner <span className="badge">Sepolia / Local</span></div>
				<div className="status">Status: {status}</div>
			</div>

			<div className="card" style={{marginBottom: 12}}>
				<div className="row" style={{gap: 10}}>
					<button onClick={connect} className="btn btn-primary">Connect MetaMask</button>
					<div style={{flex: 1}}>
						<label className="label">Contract Address (Sepolia)</label>
						<input className="input" placeholder="0x... (leave empty for local backend flow)" value={contractAddress} onChange={(e) => setContractAddress(e.target.value)} />
					</div>
				</div>
			</div>

			<div className="card" style={{marginBottom: 12}}>
				{hasCamera ? (
					<>
						<div className="row" style={{marginBottom: 10}}>
							<div style={{minWidth: 180}}>
								<label className="label">Camera</label>
								<select className="select" value={selectedDeviceId} onChange={(e) => setSelectedDeviceId(e.target.value)}>
									{devices.map((d, i) => (
										<option key={d.deviceId || i} value={d.deviceId}>{d.label || `Camera ${i+1}`}</option>
									))}
								</select>
							</div>
							<button className="btn" onClick={() => setReaderKey(k => k + 1)}>Restart camera</button>
						</div>
						<div className="scanner-frame">
							<QrReader key={readerKey} delay={400} onError={onError} onScan={onScan} constraints={constraints} style={{ width: '100%' }} />
						</div>
					</>
				) : (
					<p className="hint">No camera detected. You can upload a QR image or paste the JSON below.</p>
				)}
				<div className="row" style={{marginTop: 10}}>
					<input className="input" type="file" accept="image/*" onChange={handleImageUpload} />
					<canvas ref={canvasRef} style={{ display: 'none' }} />
				</div>
				<div className="stack" style={{marginTop: 10}}>
					<label className="label">QR JSON (fallback)</label>
					<textarea rows={4} className="textarea" placeholder='{"itemId":"ITEM123","itemName":"...","location":"...","timestamp":"...","blockchainHash":"0x..."}' onChange={(e) => { try { setQr(JSON.parse(e.target.value)); setStatus('QR loaded') } catch {} }} />
				</div>
			</div>

			{qr && (
				<div className="card" style={{marginBottom: 12}}>
					<div className="grid-2">
						<div><span className="label">Item ID</span><div>{String(qr.itemId)}</div></div>
						<div><span className="label">Name</span><div>{qr.itemName || '-'}</div></div>
						<div><span className="label">Location</span><div>{qr.location || '-'}</div></div>
						<div><span className="label">Timestamp</span><div>{qr.timestamp || '-'}</div></div>
					</div>
					{qr.blockchainHash && <div style={{marginTop:8}}><span className="label">Initial Tx</span><div className="tx-hash">{qr.blockchainHash}</div></div>}
				</div>
			)}

			<div className="row" style={{justifyContent:'flex-end'}}>
				<button onClick={submit} className="btn btn-success">Confirm Transfer / Verification</button>
			</div>
			{txHash && (
				<div className="card" style={{marginTop: 12}}>
					<span className="label">Transaction Hash</span>
					<div className="tx-hash">{txHash}</div>
				</div>
			)}
		</div>
	)
}
