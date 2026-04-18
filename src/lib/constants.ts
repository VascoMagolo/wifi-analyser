import type { MaterialData, MaterialKey } from '../types'

export const MATERIALS: Record<MaterialKey, MaterialData> = {
	glass: { name: 'Glass', f2: 10, f5: 15, color: '#bae6fd' },
	drywall: { name: 'Drywall / Gypsum', f2: 15, f5: 22, color: '#cbd5e1' },
	wood: { name: 'Wood', f2: 20, f5: 30, color: '#d97706' },
	brick: { name: 'Brick', f2: 35, f5: 50, color: '#ea580c' },
	reinforcedConcrete: {
		name: 'Reinforced Concrete',
		f2: 60,
		f5: 85,
		color: '#475569'
	}
}
