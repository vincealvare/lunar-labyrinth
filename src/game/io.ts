// Use borkTrait for the input value
// Set to random for testing
export const borkTraitOptions = ['Maverick', 'Junk Collector', 'Houdini', 'Magellan', 'None']
export const borkTrait = borkTraitOptions[Math.floor(Math.random() * borkTraitOptions.length)]

// Agash - hide the code above and set the borkTrait below with capitalized words like you see in the array above
// Maverick, Junk Collector, Houdini are the only ones that matter - doesn't matter what you put for the others

// export const borkTrait = ???

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
// Use aetherReward for the output value - it is already calculated with traits and such. Ready to go