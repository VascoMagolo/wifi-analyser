import React, { useState, useEffect, useRef } from 'react'
import type { Vector2, Wall, RFParams, WallSegment } from '../types'
import { MATERIALS } from '../lib/constants'
import { checkIntersection } from '../lib/geometry'

interface MapVisualizerProps {
	routerPos: Vector2
	receiverPos: Vector2
	setRouterPos: (pos: Vector2) => void
	setReceiverPos: (pos: Vector2) => void
	walls: Wall[]
	rfParams: RFParams
	gamma: number
}

export default function MapVisualizer({
	routerPos,
	receiverPos,
	setRouterPos,
	setReceiverPos,
	walls,
	rfParams,
	gamma
}: MapVisualizerProps) {
	const mapRef = useRef<HTMLDivElement>(null)
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const [isDragging, setIsDragging] = useState<'tx' | 'rx' | null>(null)

	useEffect(() => {
		const handleMove = (e: MouseEvent | TouchEvent) => {
			if (!isDragging || !mapRef.current) return
			if (e.type === 'touchmove') e.preventDefault()

			const clientX =
				'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX
			const clientY =
				'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY

			const rect = mapRef.current.getBoundingClientRect()
			let x = ((clientX - rect.left) / rect.width) * 10
			let y = ((clientY - rect.top) / rect.height) * 10

			x = Math.max(0, Math.min(10, x))
			y = Math.max(0, Math.min(10, y))

			if (isDragging === 'tx')
				setRouterPos({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) })
			if (isDragging === 'rx')
				setReceiverPos({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) })
		}

		const handleUp = () => setIsDragging(null)

		if (isDragging) {
			window.addEventListener('mousemove', handleMove, { passive: false })
			window.addEventListener('touchmove', handleMove, { passive: false })
			window.addEventListener('mouseup', handleUp)
			window.addEventListener('touchend', handleUp)
		}
		return () => {
			window.removeEventListener('mousemove', handleMove)
			window.removeEventListener('touchmove', handleMove)
			window.removeEventListener('mouseup', handleUp)
			window.removeEventListener('touchend', handleUp)
		}
	}, [isDragging, setRouterPos, setReceiverPos])

	// Signal Map Calculation (Canvas Heatmap)
	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return
		const ctx = canvas.getContext('2d')
		if (!ctx) return

		const width = canvas.width
		const height = canvas.height
		const imgData = ctx.createImageData(width, height)
		const data = imgData.data

		const { txPower, txGain, rxGain, frequency } = rfParams
		const c = 3e8
		const f = frequency * 1e9
		const wavelength = c / f
		const pl_d0 = 20 * Math.log10((4 * Math.PI) / wavelength)

		let wallSegments: WallSegment[] = []
		const dx = receiverPos.x - routerPos.x
		const dy = receiverPos.y - routerPos.y
		const len = Math.sqrt(dx * dx + dy * dy)

		if (len > 0) {
			const nx = -dy / len
			const ny = dx / len
			const wallHalfLen = 1.25

			walls.forEach((wall, index) => {
				const perc = (index + 1) / (walls.length + 1)
				const cx = routerPos.x + dx * perc
				const cy = routerPos.y + dy * perc

				const factor =
					frequency > 4
						? MATERIALS[wall.material].f5
						: MATERIALS[wall.material].f2
				const atten = factor * (wall.thickness / 100)

				wallSegments.push({
					x1: cx + nx * wallHalfLen,
					y1: cy + ny * wallHalfLen,
					x2: cx - nx * wallHalfLen,
					y2: cy - ny * wallHalfLen,
					attenuation: atten
				})
			})
		}

		for (let py = 0; py < height; py++) {
			for (let px = 0; px < width; px++) {
				const mx = (px / width) * 10
				const my = (py / height) * 10

				let d = Math.sqrt(
					Math.pow(mx - routerPos.x, 2) + Math.pow(my - routerPos.y, 2)
				)
				d = d < 1 ? 1 : d

				let pixelShadowAttenuation = 0
				for (let i = 0; i < wallSegments.length; i++) {
					if (
						checkIntersection(
							routerPos.x,
							routerPos.y,
							mx,
							my,
							wallSegments[i].x1,
							wallSegments[i].y1,
							wallSegments[i].x2,
							wallSegments[i].y2
						)
					) {
						pixelShadowAttenuation += wallSegments[i].attenuation
					}
				}

				const pl = pl_d0 + 10 * gamma * Math.log10(d) + pixelShadowAttenuation
				const prx = txPower + txGain + rxGain - pl

				let r,
					g,
					b,
					alpha = 60
				if (prx >= -60) {
					r = 16
					g = 185
					b = 129
				} else if (prx >= -75) {
					r = 59
					g = 130
					b = 246
				} else if (prx >= -85) {
					r = 245
					g = 158
					b = 11
				} else {
					r = 244
					g = 63
					b = 94
					alpha = 80
				}

				const idx = (py * width + px) * 4
				data[idx] = r
				data[idx + 1] = g
				data[idx + 2] = b
				data[idx + 3] = alpha
			}
		}
		ctx.putImageData(imgData, 0, 0)
	}, [rfParams, routerPos, receiverPos, walls, gamma])

	const handleDownloadMap = () => {
		if (!canvasRef.current) return
		const size = 1000
		const exportCanvas = document.createElement('canvas')
		exportCanvas.width = size
		exportCanvas.height = size
		const ctx = exportCanvas.getContext('2d')
		if (!ctx) return

		ctx.fillStyle = '#f8fafc'
		ctx.fillRect(0, 0, size, size)
		ctx.strokeStyle = 'rgba(203, 213, 225, 0.4)'
		ctx.lineWidth = 2
		for (let i = 0; i < size; i += size / 10) {
			ctx.beginPath()
			ctx.moveTo(i, 0)
			ctx.lineTo(i, size)
			ctx.stroke()
			ctx.beginPath()
			ctx.moveTo(0, i)
			ctx.lineTo(size, i)
			ctx.stroke()
		}

		ctx.globalAlpha = 0.6
		ctx.drawImage(canvasRef.current, 0, 0, size, size)
		ctx.globalAlpha = 1.0

		ctx.beginPath()
		ctx.setLineDash([15, 15])
		ctx.moveTo(routerPos.x * (size / 10), routerPos.y * (size / 10))
		ctx.lineTo(receiverPos.x * (size / 10), receiverPos.y * (size / 10))
		ctx.strokeStyle = '#1e293b'
		ctx.lineWidth = 4
		ctx.stroke()
		ctx.setLineDash([])

		const dx = receiverPos.x - routerPos.x
		const dy = receiverPos.y - routerPos.y
		walls.forEach((wall, index) => {
			const perc = (index + 1) / (walls.length + 1)
			const cx = (routerPos.x + dx * perc) * (size / 10)
			const cy = (routerPos.y + dy * perc) * (size / 10)
			const angle = Math.atan2(dy, dx)
			const wallLength = 2.5 * (size / 10)
			const wallThickness = Math.max(10, (wall.thickness / 5) * (size / 100))

			ctx.save()
			ctx.translate(cx, cy)
			ctx.rotate(angle)
			ctx.fillStyle = MATERIALS[wall.material].color
			ctx.strokeStyle = '#0f172a'
			ctx.lineWidth = 3
			ctx.fillRect(
				-wallThickness / 2,
				-wallLength / 2,
				wallThickness,
				wallLength
			)
			ctx.strokeRect(
				-wallThickness / 2,
				-wallLength / 2,
				wallThickness,
				wallLength
			)
			ctx.restore()
		})

		const txX = routerPos.x * (size / 10)
		const txY = routerPos.y * (size / 10)
		ctx.beginPath()
		ctx.arc(txX, txY, 25, 0, 2 * Math.PI)
		ctx.fillStyle = '#4f46e5'
		ctx.fill()
		ctx.strokeStyle = 'white'
		ctx.lineWidth = 5
		ctx.stroke()
		ctx.fillStyle = 'white'
		ctx.font = 'bold 20px sans-serif'
		ctx.textAlign = 'center'
		ctx.textBaseline = 'middle'
		ctx.fillText('Tx', txX, txY)

		const rxX = receiverPos.x * (size / 10)
		const rxY = receiverPos.y * (size / 10)
		ctx.beginPath()
		ctx.arc(rxX, rxY, 25, 0, 2 * Math.PI)
		ctx.fillStyle = '#f43f5e'
		ctx.fill()
		ctx.stroke()
		ctx.fillStyle = 'white'
		ctx.fillText('Rx', rxX, rxY)

		const link = document.createElement('a')
		link.download = 'wifi-coverage-simulation.png'
		link.href = exportCanvas.toDataURL('image/png')
		link.click()
	}

	return (
		<div className='bg-white border border-slate-200 p-5 rounded-3xl shadow-sm grow flex flex-col relative group'>
			<div className='flex justify-between items-center mb-4'>
				<h4 className='text-sm font-semibold text-slate-700 flex items-center gap-2'>
					<svg
						className='w-4 h-4 text-slate-400'
						fill='none'
						stroke='currentColor'
						viewBox='0 0 24 24'>
						<path
							strokeLinecap='round'
							strokeLinejoin='round'
							strokeWidth='2'
							d='M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7'></path>
					</svg>
					Floor Plan (10x10m)
				</h4>
				<button
					onClick={handleDownloadMap}
					className='bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors flex items-center gap-1.5 shadow-sm'>
					Export
				</button>
			</div>

			<div
				ref={mapRef}
				className='relative w-full aspect-square bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden select-none cursor-crosshair touch-none'
				style={{
					backgroundImage:
						'linear-gradient(to right, rgba(203, 213, 225, 0.4) 1px, transparent 1px), linear-gradient(to bottom, rgba(203, 213, 225, 0.4) 1px, transparent 1px)',
					backgroundSize: '10% 10%'
				}}>
				<canvas
					ref={canvasRef}
					width={100}
					height={100}
					className='absolute inset-0 w-full h-full pointer-events-none opacity-60 mix-blend-multiply'
				/>

				<svg
					viewBox='0 0 100 100'
					className='absolute inset-0 w-full h-full pointer-events-none z-0'>
					<line
						x1={routerPos.x * 10}
						y1={routerPos.y * 10}
						x2={receiverPos.x * 10}
						y2={receiverPos.y * 10}
						stroke='#1e293b'
						strokeWidth='0.8'
						strokeDasharray='2,2'
					/>
					{walls.map((wall, index) => {
						const f = (index + 1) / (walls.length + 1)
						const cx =
							routerPos.x * 10 + (receiverPos.x * 10 - routerPos.x * 10) * f
						const cy =
							routerPos.y * 10 + (receiverPos.y * 10 - routerPos.y * 10) * f
						const angle =
							Math.atan2(
								receiverPos.y * 10 - routerPos.y * 10,
								receiverPos.x * 10 - routerPos.x * 10
							) *
							(180 / Math.PI)
						const wallLength = 25
						const wallThickness = Math.max(1, wall.thickness / 5)

						return (
							<g
								key={wall.id}
								transform={`translate(${cx} ${cy})`}
								className='drop-shadow-md'>
								<rect
									x={-wallThickness / 2}
									y={-wallLength / 2}
									width={wallThickness}
									height={wallLength}
									fill={MATERIALS[wall.material].color}
									stroke='#0f172a'
									strokeWidth='0.5'
									opacity='0.95'
									transform={`rotate(${angle})`}
									rx='1'
								/>
							</g>
						)
					})}
				</svg>

				<div
					className={`absolute w-8 h-8 md:w-7 md:h-7 bg-indigo-600 rounded-full shadow-lg border-2 border-white transform -translate-x-1/2 -translate-y-1/2 transition-transform ease-out z-10 flex items-center justify-center cursor-grab ${isDragging === 'tx' ? 'scale-125 cursor-grabbing ring-4 ring-indigo-200' : 'hover:scale-110'}`}
					style={{
						left: `${Math.min(100, (routerPos.x / 10) * 100)}%`,
						top: `${Math.min(100, (routerPos.y / 10) * 100)}%`
					}}
					onMouseDown={e => {
						e.preventDefault()
						setIsDragging('tx')
					}}
					onTouchStart={() => setIsDragging('tx')}>
					<div className='absolute inset-0 bg-indigo-400 rounded-full animate-ping opacity-50 pointer-events-none'></div>
					<span className='text-[10px] font-bold text-white relative z-20 pointer-events-none'>
						Tx
					</span>
				</div>

				<div
					className={`absolute w-8 h-8 md:w-7 md:h-7 bg-rose-500 rounded-full shadow-lg border-2 border-white transform -translate-x-1/2 -translate-y-1/2 transition-transform ease-out z-10 flex items-center justify-center cursor-grab ${isDragging === 'rx' ? 'scale-125 cursor-grabbing ring-4 ring-rose-200' : 'hover:scale-110'}`}
					style={{
						left: `${Math.min(100, (receiverPos.x / 10) * 100)}%`,
						top: `${Math.min(100, (receiverPos.y / 10) * 100)}%`
					}}
					onMouseDown={e => {
						e.preventDefault()
						setIsDragging('rx')
					}}
					onTouchStart={() => setIsDragging('rx')}>
					<span className='text-[10px] font-bold text-white pointer-events-none'>
						Rx
					</span>
				</div>
			</div>
		</div>
	)
}
