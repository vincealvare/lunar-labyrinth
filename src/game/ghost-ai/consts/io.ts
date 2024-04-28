// Need input coming from the blockchain for this. Set to random for now
export const borkTraitOptions = ['Maverick', 'Junk Collector', 'Houdini', 'Magellan', 'None']
export const borkTrait = borkTraitOptions[Math.floor(Math.random() * borkTraitOptions.length)]

// aetherReward will be the output to be sent on chain
import { getTriesRemaining } from './gameState'
export function handleGameEnd() {
    const aetherReward = getTriesRemaining()
    console.log(aetherReward)
}