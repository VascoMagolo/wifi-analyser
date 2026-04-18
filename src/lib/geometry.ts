export const checkIntersection = (
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	x3: number,
	y3: number,
	x4: number,
	y4: number
): boolean => {
	const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
	if (denom === 0) return false
	const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
	const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom
	return t > 0 && t <= 1 && u >= 0 && u <= 1
}
