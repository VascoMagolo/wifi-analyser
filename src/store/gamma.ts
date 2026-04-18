import { persistentAtom } from '@nanostores/persistent'

export const $gammaStore = persistentAtom<number>('gamma-value', 2.5, {
	encode: val => val.toString(),
	decode: val => parseFloat(val)
})
