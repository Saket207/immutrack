import { useCallback, useState } from 'react'
import axios from 'axios'

const BACKEND_URL = 'http://localhost:3001'

export default function Audit() {
	const [itemId, setItemId] = useState(12345)
	const [history, setHistory] = useState([])
	const [status, setStatus] = useState('Ready')

	const load = useCallback(async () => {
		try {
			setStatus('Loading...')
			const res = await axios.get(`${BACKEND_URL}/items/${Number(itemId)}/history`)
			setHistory(res.data.history || [])
			setStatus(`Loaded ${res.data.history?.length || 0} events`)
		} catch (e) {
			setStatus(`Error: ${e.response?.data?.error || e.message}`)
		}
	}, [itemId])

	return (
		<div style={{ maxWidth: 600, margin: '0 auto', padding: 16 }}>
			<h3>Audit Log</h3>
			<p>Status: {status}</p>
			<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
				<label>Item ID</label>
				<input type="number" value={itemId} onChange={(e) => setItemId(e.target.value)} />
				<button onClick={load}>Load</button>
			</div>
			<ul>
				{history.map((evt, idx) => (
					<li key={idx} style={{ marginTop: 8 }}>
						<div><b>Timestamp:</b> {Number(evt.timestamp)}</div>
						<div><b>Handler:</b> {evt.handlerAddress}</div>
						<div><b>Location:</b> {evt.locationData}</div>
					</li>
				))}
			</ul>
		</div>
	)
}
