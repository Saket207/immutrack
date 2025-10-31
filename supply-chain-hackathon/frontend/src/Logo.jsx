import { motion } from 'framer-motion'

export default function Logo({ size = 80, showText = true, imageSrc = null }) {
	// If an image source is provided, use it; otherwise use SVG
	if (imageSrc) {
		return (
			<motion.div
				initial={{ opacity: 0, scale: 0.9 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.3 }}
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 16,
				}}
			>
				<img
					src={imageSrc}
					alt="Chain-of-Custody Logo"
					style={{
						width: size,
						height: size,
						objectFit: 'contain',
						flexShrink: 0,
					}}
				/>
				{showText && (
					<motion.div
						initial={{ opacity: 0, x: -10 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ delay: 0.2 }}
						style={{
							display: 'flex',
							flexDirection: 'column',
							gap: 4,
						}}
					>
						<h1
							style={{
								fontSize: 24,
								fontWeight: 700,
								color: '#e6ecff',
								margin: 0,
								lineHeight: 1.2,
								letterSpacing: '-0.5px',
							}}
						>
							Chain-of-Custody
						</h1>
						<p
							style={{
								fontSize: 13,
								color: '#8a96b2',
								margin: 0,
								fontWeight: 500,
								letterSpacing: '0.3px',
							}}
						>
							Proof in Every Transfer
						</p>
					</motion.div>
				)}
			</motion.div>
		)
	}

	// Default SVG logo
	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.9 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ duration: 0.3 }}
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 16,
			}}
		>
			{/* Logo Icon */}
			<svg
				width={size}
				height={size}
				viewBox="0 0 120 120"
				style={{
					flexShrink: 0,
				}}
			>
				{/* Square background with rounded corners - dark gray */}
				<rect
					x="10"
					y="10"
					width="100"
					height="100"
					rx="16"
					ry="16"
					fill="#4a5568"
				/>
				
				{/* Circular shape inside - light beige */}
				<circle
					cx="60"
					cy="60"
					r="35"
					fill="#f5f1e8"
				/>
				
				{/* Horizontal chain link icon in vibrant orange (3 segments) */}
				<g transform="translate(25, 50)">
					{/* First link */}
					<path
						d="M 8 12 Q 8 8 12 8 L 18 8 Q 22 8 22 12 L 22 18 Q 22 22 18 22 L 12 22 Q 8 22 8 18 Z"
						fill="#ff6b35"
					/>
					{/* Middle link - overlaps with first */}
					<path
						d="M 18 12 Q 18 8 22 8 L 28 8 Q 32 8 32 12 L 32 18 Q 32 22 28 22 L 22 22 Q 18 22 18 18 Z"
						fill="#ff6b35"
					/>
					{/* Third link - overlaps with middle */}
					<path
						d="M 28 12 Q 28 8 32 8 L 38 8 Q 42 8 42 12 L 42 18 Q 42 22 38 22 L 32 22 Q 28 22 28 18 Z"
						fill="#ff6b35"
					/>
				</g>
			</svg>

			{/* Text */}
			{showText && (
				<motion.div
					initial={{ opacity: 0, x: -10 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ delay: 0.2 }}
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: 4,
					}}
				>
					<h1
						style={{
							fontSize: 24,
							fontWeight: 700,
							color: '#e6ecff',
							margin: 0,
							lineHeight: 1.2,
							letterSpacing: '-0.5px',
						}}
					>
						Chain-of-Custody
					</h1>
					<p
						style={{
							fontSize: 13,
							color: '#8a96b2',
							margin: 0,
							fontWeight: 500,
							letterSpacing: '0.3px',
						}}
					>
						Proof in Every Transfer
					</p>
				</motion.div>
			)}
		</motion.div>
	)
}
