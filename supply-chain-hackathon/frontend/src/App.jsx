import { useCallback, useEffect, useState } from 'react'
import './App.css'
import QrReader from 'react-qr-scanner'
import axios from 'axios'
import { ethers } from 'ethers'
import Admin from './Admin'
import Audit from './Audit'
import QRScannerPage from './QRScannerPage'

const BACKEND_URL = 'http://localhost:3001'

export default function App() {
	const [tab, setTab] = useState('scanner')
	const [hasCamera, setHasCamera] = useState(false)
	const [scanData, setScanData] = useState(null)
	const [account, setAccount] = useState('')
	const [status, setStatus] = useState('Ready')
	const [locationText, setLocationText] = useState('Warehouse A')

	const onScan = useCallback((result) => {
		if (!result) return
		const text = typeof result === 'string' ? result : result?.text
		if (!text) return
		try {
			const parsed = JSON.parse(text)
			if (parsed.itemId) {
				setScanData(parsed)
				setStatus(`Scanned itemId=${parsed.itemId}`)
			}
		} catch (e) {
			// ignore non-JSON
		}
	}, [])

	const onError = useCallback((err) => {
		setStatus(`Camera error: ${err?.message || err}`)
	}, [])

	useEffect(() => {
		navigator.mediaDevices?.enumerateDevices?.().then((devices) => {
			setHasCamera(devices.some((d) => d.kind === 'videoinput'))
		}).catch(() => setHasCamera(false))
	}, [])

	const connectWallet = useCallback(async () => {
		if (!window.ethereum) {
			setStatus('MetaMask not found')
			return
		}
		const [addr] = await window.ethereum.request({ method: 'eth_requestAccounts' })
		setAccount(addr)
		setStatus(`Wallet connected: ${addr.substring(0, 10)}...`)
	}, [])

	const signAndSubmit = useCallback(async () => {
		if (!scanData) { setStatus('Scan an item first'); return }
		if (!window.ethereum) { setStatus('MetaMask not found'); return }

		const provider = new ethers.BrowserProvider(window.ethereum)
		const signer = await provider.getSigner()
		const { chainId } = await provider.getNetwork()

		const domain = {
			name: 'AuditLog',
			version: '1',
			chainId: Number(chainId),
			verifyingContract: '0x0000000000000000000000000000000000000000'
		}
		const types = {
			Scan: [
				{ name: 'itemId', type: 'uint256' },
				{ name: 'location', type: 'string' },
			]
		}
		const value = { itemId: Number(scanData.itemId), location: String(locationText) }

		let signature
		try {
			signature = await signer.signTypedData(domain, types, value)
		} catch (e) {
			setStatus(`Sign rejected: ${e.message || e}`)
			return
		}

		try {
			const res = await axios.post(`${BACKEND_URL}/scans`, {
				itemId: value.itemId,
				location: value.location,
				signature,
				handler: await signer.getAddress(),
			})
			setStatus(`Logged scan: ${res.data.txHash.substring(0, 10)}...`)
		} catch (e) {
			setStatus(`API error: ${e.response?.data?.error || e.message}`)
		}
	}, [scanData, locationText])

	const constraints = { audio: false, video: { facingMode: 'environment' } }

  return (
		<div style={{ maxWidth: 600, margin: '0 auto', padding: 16 }}>
			<h2>Chain-of-Custody</h2>
			<div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
				<button onClick={() => setTab('scanner')} disabled={tab==='scanner'}>Scanner</button>
				<button onClick={() => setTab('admin')} disabled={tab==='admin'}>Admin</button>
				<button onClick={() => setTab('audit')} disabled={tab==='audit'}>Audit Log</button>
				<button onClick={() => setTab('qrsepolia')} disabled={tab==='qrsepolia'}>QR Scanner (Sepolia)</button>
			</div>
			{tab === 'scanner' ? (
				<>
					<p>Status: {status}</p>
					<div style={{ marginBottom: 12 }}>
						<button onClick={connectWallet} disabled={!!account}>
							{account ? 'Wallet Connected' : 'Connect Wallet'}
						</button>
					</div>
					<div style={{ marginBottom: 12 }}>
						<label>Location: </label>
						<input value={locationText} onChange={(e) => setLocationText(e.target.value)} placeholder="Location info" />
					</div>
					{hasCamera ? (
						<QrReader
							delay={400}
							onError={onError}
							onScan={onScan}
							constraints={constraints}
							style={{ width: '100%' }}
						/>
					) : (
						<p>No camera detected. Use the textarea below.</p>
					)}
					<div style={{ marginTop: 12 }}>
						<button onClick={signAndSubmit} disabled={!scanData || !account}>Sign & Submit Scan</button>
      </div>
					<div style={{ marginTop: 12 }}>
						<label>QR JSON (fallback):</label>
						<textarea rows={4} style={{ width: '100%' }} onChange={(e) => {
							try { const p = JSON.parse(e.target.value); setScanData(p); setStatus(`Loaded itemId=${p.itemId}`) } catch {}
						}} />
      </div>
				</>
			) : tab === 'admin' ? (
				<Admin />
			) : tab === 'audit' ? (
				<Audit />
			) : (
				<QRScannerPage />
			)}
		</div>
  )
}
