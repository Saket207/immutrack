import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import { Scan, Settings, FileSearch } from 'lucide-react'
import './App.css'
import Admin from './Admin'
import Audit from './Audit'
import QRScannerPage from './QRScannerPage'
import Logo from './Logo'

export default function App() {
	const [tab, setTab] = useState('scanner')

	const tabs = [
		{ id: 'scanner', label: 'QR Scanner', icon: Scan },
		{ id: 'admin', label: 'Admin', icon: Settings },
		{ id: 'audit', label: 'Audit Log', icon: FileSearch },
	]

	return (
		<>
			<Toaster 
				position="top-right"
				toastOptions={{
					duration: 3000,
					style: {
						background: 'rgba(19,26,43,0.95)',
						color: '#e6ecff',
						border: '1px solid rgba(255,255,255,0.1)',
						backdropFilter: 'blur(20px)',
					},
					success: {
						iconTheme: { primary: '#22c55e', secondary: '#fff' },
					},
					error: {
						iconTheme: { primary: '#ef4444', secondary: '#fff' },
					},
				}}
			/>
			<div style={{ minHeight: '100vh' }}>
				<motion.header
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					className="card"
					style={{
						marginBottom: 24,
						padding: '20px 24px',
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						flexWrap: 'wrap',
						gap: 20
					}}
				>
					<Logo size={64} showText={true} />
					<nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
						{tabs.map((t) => {
							const Icon = t.icon
							const isActive = tab === t.id
							return (
								<motion.button
									key={t.id}
									onClick={() => setTab(t.id)}
									className={isActive ? 'btn btn-primary' : 'btn'}
									disabled={isActive}
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.95 }}
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: 8,
									}}
								>
									<Icon size={18} />
									{t.label}
								</motion.button>
							)
						})}
					</nav>
				</motion.header>

				<AnimatePresence mode="wait">
					{tab === 'scanner' && (
						<motion.div
							key="scanner"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.2 }}
						>
							<QRScannerPage />
						</motion.div>
					)}
					{tab === 'admin' && (
						<motion.div
							key="admin"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.2 }}
						>
							<Admin />
						</motion.div>
					)}
					{tab === 'audit' && (
						<motion.div
							key="audit"
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: -20 }}
							transition={{ duration: 0.2 }}
						>
							<Audit />
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</>
	)
}
