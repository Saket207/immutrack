import { useCallback, useState } from 'react'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { FileSearch, Calendar, MapPin, User, ExternalLink, Copy, RefreshCw } from 'lucide-react'

const BACKEND_URL = 'http://localhost:3001'

export default function Audit() {
	const [itemId, setItemId] = useState(12345)
	const [history, setHistory] = useState([])
	const [status, setStatus] = useState('Ready')
	const [isLoading, setIsLoading] = useState(false)

	const copyToClipboard = (text) => {
		navigator.clipboard.writeText(text)
		toast.success('Copied to clipboard!')
	}

	const load = useCallback(async () => {
		setIsLoading(true)
		try {
			setStatus('Loading...')
			toast.loading('Loading history...')
			const res = await axios.get(`${BACKEND_URL}/items/${Number(itemId)}/history`)
			setHistory(res.data.history || [])
			const count = res.data.history?.length || 0
			setStatus(`Loaded ${count} events`)
			toast.dismiss()
			if (count > 0) {
				toast.success(`Found ${count} transfer event${count !== 1 ? 's' : ''}!`)
			} else {
				toast('No history found for this item', { icon: 'ℹ️' })
			}
		} catch (e) {
			const msg = `Error: ${e.response?.data?.error || e.message}`
			setStatus(msg)
			toast.dismiss()
			toast.error(msg, { duration: 5000 })
		} finally {
			setIsLoading(false)
		}
	}, [itemId])

	const formatTimestamp = (ts) => {
		if (!ts) return 'N/A'
		if (typeof ts === 'number') {
			return new Date(ts * 1000).toLocaleString()
		}
		if (typeof ts === 'string') {
			// Try parsing as ISO or custom format
			const date = new Date(ts)
			if (!isNaN(date.getTime())) {
				return date.toLocaleString()
			}
			return ts
		}
		return String(ts)
	}

	return (
		<div className="container">
			<motion.div
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				className="row"
				style={{justifyContent:'space-between', marginBottom: 20}}
			>
				<div className="title">
					<FileSearch size={28} />
					Audit Log
				</div>
				<div className="status">
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
					<div style={{flex: 1}}>
						<label className="label">Item ID</label>
						<input 
							type="number" 
							className="input" 
							value={itemId} 
							onChange={(e) => setItemId(e.target.value)} 
						/>
					</div>
					<button 
						onClick={load} 
						className="btn btn-primary"
						disabled={isLoading}
						style={{marginTop: 24}}
					>
						{isLoading ? (
							<>
								<div className="spinner" style={{width: 16, height: 16, marginRight: 8}} />
								Loading...
							</>
						) : (
							<>
								<RefreshCw size={18} />
								Load History
							</>
						)}
					</button>
				</div>
			</motion.div>

			<AnimatePresence mode="wait">
				{history.length > 0 ? (
					<motion.div
						key="history"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="card"
					>
						<h3 style={{marginBottom: 16}}>Transfer History ({history.length} events)</h3>
						<div className="stack">
							{history.map((evt, idx) => (
								<motion.div
									key={idx}
									initial={{ opacity: 0, x: -20 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: idx * 0.1 }}
									className="card"
									style={{
										padding: 16,
										border: '1px solid rgba(99,102,241,0.2)',
										background: 'rgba(99,102,241,0.05)'
									}}
								>
									<div className="grid-2" style={{marginBottom: 12}}>
										<div>
											<div className="label" style={{display: 'flex', alignItems: 'center', gap: 6}}>
												<Calendar size={14} />
												Timestamp
											</div>
											<div style={{fontSize: 15, fontWeight: 600}}>
												{formatTimestamp(evt.timestamp)}
											</div>
										</div>
										<div>
											<div className="label" style={{display: 'flex', alignItems: 'center', gap: 6}}>
												<MapPin size={14} />
												Location
											</div>
											<div style={{fontSize: 15, fontWeight: 600}}>
												{evt.location || 'N/A'}
											</div>
										</div>
									</div>
									<div>
										<div className="label" style={{display: 'flex', alignItems: 'center', gap: 6}}>
											<User size={14} />
											From → To
										</div>
										<div style={{display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap'}}>
											{evt.from && evt.from !== '0x0000000000000000000000000000000000000000' && (
												<span style={{fontSize: 13, fontFamily: 'monospace', color: '#8a96b2'}}>
													{evt.from?.substring(0, 10)}... →
												</span>
											)}
											{evt.to && (
												<>
													<div 
														className="tx-hash" 
														style={{
															display: 'inline-flex', 
															alignItems: 'center', 
															gap: 8, 
															cursor: 'pointer',
															padding: '6px 10px',
															fontSize: 13
														}}
														onClick={() => copyToClipboard(evt.to)}
													>
														{evt.to?.substring(0, 20)}...
														<Copy size={12} />
													</div>
													<a
														href={`https://sepolia.etherscan.io/address/${evt.to}`}
														target="_blank"
														rel="noopener noreferrer"
														className="btn"
														style={{padding: '4px 8px', fontSize: 11}}
													>
														<ExternalLink size={12} />
													</a>
												</>
											)}
										</div>
									</div>
								</motion.div>
							))}
						</div>
					</motion.div>
				) : history.length === 0 && status.includes('Loaded') ? (
					<motion.div
						key="empty"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="card"
						style={{textAlign: 'center', padding: 40}}
					>
						<FileSearch size={48} style={{opacity: 0.5, marginBottom: 16}} />
						<p className="hint" style={{fontSize: 16}}>No transfer history found for this item</p>
					</motion.div>
				) : null}
			</AnimatePresence>
		</div>
	)
}
