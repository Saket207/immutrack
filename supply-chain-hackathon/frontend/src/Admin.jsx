import { useState, useCallback } from 'react'
import axios from 'axios'
import QRCode from 'qrcode'

const BACKEND_URL = 'http://localhost:3001'

export default function Admin() {
	const [itemId, setItemId] = useState(12345)
	const [name, setName] = useState('Vaccine Batch 101')
	const [initLocation, setInitLocation] = useState('Manufacturer Plant')
	const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
	const [time, setTime] = useState('09:00')
	const [handler, setHandler] = useState('0x70997970C51812dc3A010C7d01b50e0d17dc79C8')
	const [authorized, setAuthorized] = useState(true)
	const [qrDataUrl, setQrDataUrl] = useState('')
	const [status, setStatus] = useState('Ready')

	const registerItem = useCallback(async () => {
		try {
			const res = await axios.post(`${BACKEND_URL}/items/register`, {
				itemId: Number(itemId),
				name,
				location: initLocation,
				date,
				time,
			})
			setStatus(`Registered: ${res.data.txHash || res.data.status}`)
			if (res.data.qrDataUrl) setQrDataUrl(res.data.qrDataUrl)
		} catch (e) {
			setStatus(`Error: ${e.response?.data?.error || e.message}`)
		}
	}, [itemId, name, initLocation, date, time])

	const authorize = useCallback(async () => {
		try {
			const res = await axios.post(`${BACKEND_URL}/handlers/authorize`, { handler, authorized })
			setStatus(`Authorized: ${res.data.txHash?.substring(0, 10) || 'ok'}...`)
		} catch (e) {
			setStatus(`Error: ${e.response?.data?.error || e.message}`)
		}
	}, [handler, authorized])

	const generateQr = useCallback(async () => {
		try {
			const payload = { itemId: Number(itemId), name, location: initLocation, timestamp: `${date} ${time}` }
			const url = await QRCode.toDataURL(JSON.stringify(payload))
			setQrDataUrl(url)
			setStatus('QR generated')
		} catch (e) {
			setStatus(`QR error: ${e.message}`)
		}
	}, [itemId, name, initLocation, date, time])

	return (
		<div style={{ maxWidth: 520, margin: '0 auto', padding: 16 }}>
			<h3>Admin</h3>
			<p>Status: {status}</p>
			<div style={{ display: 'grid', gap: 8 }}>
				<label>
					Item ID
					<input type="number" value={itemId} onChange={(e) => setItemId(e.target.value)} />
				</label>
				<label>
					Item Name
					<input value={name} onChange={(e) => setName(e.target.value)} />
				</label>
				<label>
					Initial Location
					<input value={initLocation} onChange={(e) => setInitLocation(e.target.value)} />
				</label>
				<div style={{ display: 'flex', gap: 8 }}>
					<label>
						Date
						<input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
					</label>
					<label>
						Time
						<input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
					</label>
				</div>
				<div style={{ display: 'flex', gap: 8 }}>
					<button onClick={registerItem}>Register Item</button>
					<button onClick={generateQr}>Generate QR</button>
				</div>
				{qrDataUrl && (
					<div>
						<img src={qrDataUrl} alt="QR" style={{ width: 240, height: 240 }} />
					</div>
				)}
				<hr />
				<label>
					Handler Address
					<input value={handler} onChange={(e) => setHandler(e.target.value)} />
				</label>
				<label>
					Authorized
					<input type="checkbox" checked={authorized} onChange={(e) => setAuthorized(e.target.checked)} />
				</label>
				<button onClick={authorize}>Set Authorization</button>
			</div>
		</div>
	)
}
