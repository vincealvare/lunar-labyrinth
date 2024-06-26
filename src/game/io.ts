// Use borkTrait for the input value
// Set to random for testing
export const borkTraitOptions = ['Maverick', 'Junk Collector', 'Houdini', 'Magellan', 'None']
export const borkTrait = borkTraitOptions[Math.floor(Math.random() * borkTraitOptions.length)]

let triesRemainingValue = 3
if(borkTrait == 'Houdini') {
	triesRemainingValue = 4
}

export function getTriesRemaining() {
    return triesRemainingValue
}

export function setTriesRemaining(value: number) {
    triesRemainingValue = value
}

export function handleGameEnd() {
    const aetherReward = getTriesRemaining()
    if(!aetherReward){return}
}
// Use aetherReward for the output value