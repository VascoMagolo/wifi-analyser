export type MaterialKey =
	| 'glass'
	| 'drywall'
	| 'wood'
	| 'brick'
	| 'reinforcedConcrete'

export type MaterialData = {
	name: string
	f2: number
	f5: number
	color: string
}

export type Wall = {
	id: number
	material: MaterialKey
	thickness: number
}

export type Vector2 = {
	x: number
	y: number
}

export type WallSegment = {
	x1: number
	y1: number
	x2: number
	y2: number
	attenuation: number
}

export type SimulationResults = {
	distance: string
	totalWallAttenuation: string
	rxPowerSimplified: string
	rxPowerMotleyKeenan: string
}

export type RFParams = {
	txPower: number
	txGain: number
	rxGain: number
	frequency: number
}
