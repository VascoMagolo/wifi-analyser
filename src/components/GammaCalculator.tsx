import React, { useState } from 'react'
import { $gammaStore } from '../store/gamma'

interface CalibrationData {
	d1: number
	rssi1: number
	d2: number
	rssi2: number
}

export default function GammaCalculator() {
	const [data, setData] = useState<CalibrationData>({
		d1: 1.5, // meters
		rssi1: -38, // dBm
		d2: 3.0, // meters
		rssi2: -43 // dBm
	})

	const [calculatedGamma, setCalculatedGamma] = useState<number | null>(null)

	const handleApplyGamma = (val: number) => {
		$gammaStore.set(val)
		alert(`Gamma updated to ${val}! You can return to the simulator.`)
	}

	const calculateGamma = () => {
		// Formula: (RSSI1 - RSSI2) / (10 * log10(d2 / d1))
		const numerator = data.rssi1 - data.rssi2
		const denominator = 10 * Math.log10(data.d2 / data.d1)

		if (denominator === 0) {
			alert('Distances must be different!')
			return
		}

		const gamma = numerator / denominator
		setCalculatedGamma(Number(gamma.toFixed(2)))
	}

	return (
		<div className='max-w-2xl mx-auto bg-white p-8 rounded-3xl shadow-sm border border-slate-200'>
			<div className='mb-6'>
				<h2 className='text-2xl font-bold text-slate-800'>
					Empirical Calibrator (γ Calculation)
				</h2>
				<p className='text-slate-500 text-sm mt-1'>
					Enter two real measurements (Line of Sight) to calculate the exact
					propagation exponent for your environment.
				</p>
			</div>

			<div className='grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100'>
				<div className='space-y-4'>
					<h3 className='font-semibold text-indigo-600'>
						Measurement Point 1 (Closer)
					</h3>
					<div>
						<label className='block text-xs font-semibold text-slate-500 mb-1'>
							Distance ($d_1$) in meters
						</label>
						<input
							type='number'
							step='0.1'
							value={data.d1}
							onChange={e => setData({ ...data, d1: Number(e.target.value) })}
							className='w-full rounded-lg border-slate-200 p-2 text-sm'
						/>
					</div>
					<div>
						<label className='block text-xs font-semibold text-slate-500 mb-1'>
							RSSI 1 (dBm)
						</label>
						<input
							type='number'
							value={data.rssi1}
							onChange={e =>
								setData({ ...data, rssi1: Number(e.target.value) })
							}
							className='w-full rounded-lg border-slate-200 p-2 text-sm'
						/>
					</div>
				</div>

				<div className='space-y-4'>
					<h3 className='font-semibold text-indigo-600'>
						Measurement Point 2 (Farther)
					</h3>
					<div>
						<label className='block text-xs font-semibold text-slate-500 mb-1'>
							Distance ($d_2$) in meters
						</label>
						<input
							type='number'
							step='0.1'
							value={data.d2}
							onChange={e => setData({ ...data, d2: Number(e.target.value) })}
							className='w-full rounded-lg border-slate-200 p-2 text-sm'
						/>
					</div>
					<div>
						<label className='block text-xs font-semibold text-slate-500 mb-1'>
							RSSI 2 (dBm)
						</label>
						<input
							type='number'
							value={data.rssi2}
							onChange={e =>
								setData({ ...data, rssi2: Number(e.target.value) })
							}
							className='w-full rounded-lg border-slate-200 p-2 text-sm'
						/>
					</div>
				</div>
			</div>

			<div className='mt-6 flex flex-col sm:flex-row gap-4 items-center justify-between'>
				<button
					onClick={calculateGamma}
					className='w-full sm:w-auto bg-slate-800 text-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-700 transition-colors'>
					Calculate γ
				</button>

				{calculatedGamma !== null && (
					<div className='flex items-center gap-4 bg-emerald-50 p-3 rounded-xl border border-emerald-100 w-full sm:w-auto'>
						<div className='text-emerald-700 font-medium'>
							Result:{' '}
							<span className='text-2xl font-bold ml-1'>{calculatedGamma}</span>
						</div>
						<button
							onClick={() => handleApplyGamma(calculatedGamma)}
							className='bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors'>
							Apply to Simulator
						</button>
					</div>
				)}
			</div>
		</div>
	)
}
