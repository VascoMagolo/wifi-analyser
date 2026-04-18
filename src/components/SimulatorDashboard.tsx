import React, { useState, useEffect } from 'react'
import MapVisualizer from './MapVisualizer'
import { MATERIALS } from '../lib/constants'
import { $gammaStore } from '../store/gamma'
import type {
	Vector2,
	Wall,
	RFParams,
	SimulationResults,
	MaterialKey,
	MaterialData
} from '../types'
import { useStore } from '@nanostores/react'

export default function SimulatorDashboard() {
	const globalGamma = useStore($gammaStore)
	const [rfParams, setRfParams] = useState<RFParams>({
		txPower: 20,
		txGain: 3,
		rxGain: 0,
		frequency: 2.4
	})

	const [routerPos, setRouterPos] = useState<Vector2>({ x: 2, y: 5 })
	const [receiverPos, setReceiverPos] = useState<Vector2>({ x: 8, y: 5 })

	const [walls, setWalls] = useState<Wall[]>([
		{ id: 1, material: 'brick', thickness: 10 },
		{ id: 2, material: 'glass', thickness: 5 }
	])

	const [results, setResults] = useState<SimulationResults>({
		distance: '0.00',
		totalWallAttenuation: '0.00',
		rxPowerSimplified: '0.00',
		rxPowerMotleyKeenan: '0.00'
	})

	const updateParam = (field: keyof RFParams, value: number) =>
		setRfParams(prev => ({ ...prev, [field]: value }))
	const addWall = () =>
		setWalls([...walls, { id: Date.now(), material: 'drywall', thickness: 10 }])
	const removeWall = (id: number) => setWalls(walls.filter(w => w.id !== id))
	const updateWall = (id: number, field: keyof Omit<Wall, 'id'>, value: any) =>
		setWalls(walls.map(w => (w.id === id ? { ...w, [field]: value } : w)))

	// Update core math logic
	useEffect(() => {
		const gamma = globalGamma
		const { txPower, txGain, rxGain, frequency } = rfParams
		const d = Math.sqrt(
			Math.pow(receiverPos.x - routerPos.x, 2) +
				Math.pow(receiverPos.y - routerPos.y, 2)
		)
		const distance = d < 1 ? 1 : d

		const c = 3e8
		const f = frequency * 1e9
		const pl_d0 = 20 * Math.log10((4 * Math.PI) / (c / f))
		const pl_simplified = pl_d0 + 10 * gamma * Math.log10(distance)
		const prx_simplified = txPower + txGain + rxGain - pl_simplified

		const totalAttenuation = walls.reduce((sum, wall) => {
			const factor =
				frequency > 4
					? MATERIALS[wall.material].f5
					: MATERIALS[wall.material].f2
			return sum + factor * (wall.thickness / 100)
		}, 0)

		const prx_motley =
			txPower + txGain + rxGain - (pl_simplified + totalAttenuation)

		setResults({
			distance: distance.toFixed(2),
			totalWallAttenuation: totalAttenuation.toFixed(2),
			rxPowerSimplified: prx_simplified.toFixed(2),
			rxPowerMotleyKeenan: prx_motley.toFixed(2)
		})
	}, [rfParams, routerPos, receiverPos, walls, globalGamma])

	const getSignalQuality = (power: string) => {
		const p = parseFloat(power)
		if (p >= -60)
			return {
				label: 'Excellent',
				color: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300/50',
				dot: 'bg-emerald-500'
			}
		if (p >= -75)
			return {
				label: 'Good',
				color: 'bg-blue-100 text-blue-700 ring-1 ring-blue-300/50',
				dot: 'bg-blue-500'
			}
		if (p >= -85)
			return {
				label: 'Weak',
				color: 'bg-amber-100 text-amber-700 ring-1 ring-amber-300/50',
				dot: 'bg-amber-500'
			}
		return {
			label: 'No Signal / Losses',
			color: 'bg-rose-100 text-rose-700 ring-1 ring-rose-300/50',
			dot: 'bg-rose-500'
		}
	}

	const quality = getSignalQuality(results.rxPowerMotleyKeenan)

	return (
		<div className='bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden border border-slate-100 font-sans max-w-7xl mx-auto'>
			<div className='bg-linear-to-r from-slate-900 via-blue-900 to-indigo-900 p-8 text-white relative overflow-hidden'>
				<div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
				<div className='relative z-10 flex items-center gap-4'>
					<div className='p-3 bg-white/10 rounded-2xl backdrop-blur-sm'>
						<svg
							className='w-6 h-6 text-blue-200'
							fill='none'
							stroke='currentColor'
							viewBox='0 0 24 24'>
							<path
								strokeLinecap='round'
								strokeLinejoin='round'
								strokeWidth='2'
								d='M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0'></path>
						</svg>
					</div>
					<div>
						<h2 className='text-2xl font-bold tracking-tight'>
							Propagation Control Panel
						</h2>
						<p className='text-blue-200/80 text-sm mt-1 font-medium'>
							Drag the devices on the map and analyze the impact on signal.
						</p>
					</div>
				</div>
			</div>

			<div className='p-8 grid grid-cols-1 lg:grid-cols-12 gap-10'>
				<div className='lg:col-span-7 space-y-8'>
					{/* Transmitter Parameters */}
					<div className='space-y-5'>
						<h3 className='text-base font-semibold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2'>
							<svg
								className='w-5 h-5 text-indigo-500'
								fill='none'
								stroke='currentColor'
								viewBox='0 0 24 24'>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth='2'
									d='M13 10V3L4 14h7v7l9-11h-7z'></path>
							</svg>
							Transmitter and Antenna Parameters
						</h3>

						<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
							{[
								{
									label: 'Power (dBm)',
									field: 'txPower',
									min: 0,
									max: 30,
									step: 1
								},
								{
									label: 'Frequency (GHz)',
									field: 'frequency',
									min: 2.4,
									max: 5.8,
									step: 0.1
								},
								{
									label: 'Tx Gain (dBi)',
									field: 'txGain',
									min: 0,
									max: 15,
									step: 1
								},
								{
									label: 'Rx Gain (dBi)',
									field: 'rxGain',
									min: 0,
									max: 15,
									step: 1
								}
							].map(param => (
								<div
									key={param.field}
									className='bg-slate-50 p-4 rounded-2xl border border-slate-100/60 shadow-sm transition-all hover:shadow-md'>
									<div className='flex justify-between items-center mb-2'>
										<label className='text-sm font-semibold text-slate-700'>
											{param.label}
										</label>
										<span className='text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md'>
											{rfParams[param.field as keyof RFParams]}
										</span>
									</div>
									<input
										type='range'
										min={param.min}
										max={param.max}
										step={param.step}
										value={rfParams[param.field as keyof RFParams]}
										onChange={e =>
											updateParam(
												param.field as keyof RFParams,
												Number(e.target.value)
											)
										}
										className='w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600'
									/>
								</div>
							))}
						</div>

						<div className='bg-slate-50 p-5 rounded-2xl border border-slate-100/60 shadow-sm transition-all hover:shadow-md'>
							<div className='flex justify-between items-center mb-3'>
								<label className='text-sm font-semibold text-slate-700'>
									Propagation Exponent (γ)
								</label>
								<span className='text-sm font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md'>
									{globalGamma}
								</span>
							</div>
							<input
								type='range'
								min='0.5'
								max='7'
								step='0.1'
								value={globalGamma}
								onChange={e => $gammaStore.set(parseFloat(e.target.value))}
								className='w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500'
							/>
						</div>
					</div>

					{/* Wall Manager */}
					<div className='space-y-4'>
						<div className='flex justify-between items-center border-b border-slate-100 pb-2'>
							<h3 className='text-base font-semibold text-slate-800 flex items-center gap-2'>
								<svg
									className='w-5 h-5 text-amber-500'
									fill='none'
									stroke='currentColor'
									viewBox='0 0 24 24'>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth='2'
										d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'></path>
								</svg>
								Obstacles in Path
							</h3>
							<button
								onClick={addWall}
								className='text-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-semibold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1'>
								Add Wall
							</button>
						</div>

						<div className='space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar'>
							{walls.length === 0 ? (
								<div className='text-center p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-sm'>
									No obstacles. Line-of-Sight (LOS) signal.
								</div>
							) : (
								walls.map((wall, index) => (
									<div
										key={wall.id}
										className='flex flex-col sm:flex-row gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/60 relative group transition-all hover:border-indigo-300'>
										<div className='flex-1'>
											<label className='block text-xs font-semibold text-slate-500 mb-1 uppercase'>
												Wall Material {index + 1}
											</label>
											<select
												value={wall.material}
												onChange={e =>
													updateWall(
														wall.id,
														'material',
														e.target.value as MaterialKey
													)
												}
												className='w-full rounded-lg border-slate-200 shadow-sm focus:border-indigo-500 p-2.5 bg-white text-sm'>
												{(
													Object.entries(MATERIALS) as [
														MaterialKey,
														MaterialData
													][]
												).map(([key, data]) => (
													<option key={key} value={key}>
														{data.name}
													</option>
												))}
											</select>
										</div>
										<div className='w-full sm:w-32'>
											<label className='block text-xs font-semibold text-slate-500 mb-1 uppercase'>
												Thickness (cm)
											</label>
											<input
												type='number'
												min='1'
												value={wall.thickness}
												onChange={e =>
													updateWall(
														wall.id,
														'thickness',
														Number(e.target.value)
													)
												}
												className='w-full rounded-lg border-slate-200 shadow-sm focus:border-indigo-500 p-2.5 bg-white text-sm'
											/>
										</div>
										<button
											onClick={() => removeWall(wall.id)}
											className='absolute -top-2 -right-2 bg-rose-100 text-rose-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500 hover:text-white shadow-sm'>
											<svg
												className='w-4 h-4'
												fill='none'
												stroke='currentColor'
												viewBox='0 0 24 24'>
												<path
													strokeLinecap='round'
													strokeLinejoin='round'
													strokeWidth='2'
													d='M6 18L18 6M6 6l12 12'></path>
											</svg>
										</button>
									</div>
								))
							)}
						</div>
					</div>
				</div>

				<div className='lg:col-span-5 flex flex-col gap-8'>
					{/* Results */}
					<div className='bg-slate-900 text-white p-7 rounded-3xl shadow-xl relative overflow-hidden ring-1 ring-slate-800'>
						<div className='absolute -top-10 -right-10 w-40 h-40 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20'></div>
						<div className='absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20'></div>

						<h3 className='text-sm font-semibold text-slate-400 mb-6 tracking-wider uppercase flex justify-between items-center'>
							Signal at Receiver (Rx)
							<span className='flex h-3 w-3 relative'>
								<span
									className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${quality.dot}`}></span>
								<span
									className={`relative inline-flex rounded-full h-3 w-3 ${quality.dot}`}></span>
							</span>
						</h3>

						<div className='space-y-6 relative z-10'>
							<div className='bg-slate-800/50 p-5 rounded-2xl backdrop-blur-sm border border-slate-700/50'>
								<p className='text-xs text-slate-400 mb-2 font-medium'>
									Motley-Keenan (Real Model)
								</p>
								<div className='flex items-baseline gap-2 mb-3'>
									<p className='text-5xl font-bold tracking-tighter text-white tabular-nums w-45'>
										{results.rxPowerMotleyKeenan}
									</p>
									<span className='text-lg text-slate-400 font-medium'>
										dBm
									</span>
								</div>
								<div
									className={`inline-flex px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wide ${quality.color}`}>
									{quality.label}
								</div>
							</div>

							<div className='grid grid-cols-2 gap-4'>
								<div className='bg-slate-800/30 p-4 rounded-2xl border border-slate-700/30'>
									<p className='text-xs text-slate-400 mb-1 font-medium'>
										Distance
									</p>
									<p className='text-xl font-semibold text-slate-200 tabular-nums'>
										{results.distance}{' '}
										<span className='text-sm text-slate-500'>m</span>
									</p>
								</div>
								<div className='bg-slate-800/30 p-4 rounded-2xl border border-slate-700/30'>
									<p className='text-xs text-slate-400 mb-1 font-medium'>
										Free-Space Path Loss
									</p>
									<p className='text-xl font-semibold text-slate-200 tabular-nums'>
										{results.rxPowerSimplified}{' '}
										<span className='text-sm text-slate-500'>dBm</span>
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* Map Component */}
					<MapVisualizer
						routerPos={routerPos}
						receiverPos={receiverPos}
						setRouterPos={setRouterPos}
						setReceiverPos={setReceiverPos}
						walls={walls}
						rfParams={rfParams}
						gamma={globalGamma}
					/>
				</div>
			</div>
			<div className='border-t border-slate-100 bg-slate-50 p-6 sm:px-8 mt-auto'>
				<div className='flex flex-col sm:flex-row justify-between items-center gap-4 text-xs sm:text-sm text-slate-500'>
					<div className='flex items-center gap-2'>
						<svg
							className='w-5 h-5 text-indigo-400'
							fill='none'
							stroke='currentColor'
							viewBox='0 0 24 24'>
							<path
								strokeLinecap='round'
								strokeLinejoin='round'
								strokeWidth='2'
								d='M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z'></path>
						</svg>
						<span className='font-semibold text-slate-600'>
							Redes de Comunicações Móveis
						</span>
					</div>

					<div className='flex items-center gap-4 text-center sm:text-right font-medium'>
						<span>
							Developed by{' '}
							<span className='text-slate-700 font-bold'>
								Vasco Magolo & Diogo Nogueira
							</span>
						</span>
						<span className='hidden sm:inline text-slate-300'>•</span>
						<span>{new Date().getFullYear()}</span>
					</div>
				</div>
			</div>
		</div>
	)
}
