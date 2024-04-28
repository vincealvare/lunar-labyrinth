import { Scene } from 'phaser'

import Hero from '../game/Hero'
import { createHeroAnims } from '../game/HeroAnims'
import '../game/Hero'
import { borkTrait, handleGameEnd, setTriesRemaining } from '../game/io'

import { createGhostAnims } from '../game/GhostAnims'
import '../game/Ghost'
import ScatterAI from '../game/ghost-ai/ScatterAI'
import ChaseHeroAI from '../game/ghost-ai/ChaseHeroAI'
import InterceptHeroAI from '../game/ghost-ai/InterceptHeroAI'
import FlankHeroAI from '../game/ghost-ai/FlankHeroAI'
import PlayfullyChaseHeroAI from '../game/ghost-ai/PlayfullyChaseHeroAI'

let eatDotCount = 0

let triesRemaining = 3
if(borkTrait == 'Houdini') {
	triesRemaining = 4
}

type Direction = 'up' | 'down' | 'left' | 'right'

export class Game extends Scene
{
    traitText : Phaser.GameObjects.Text
    goText: Phaser.GameObjects.Text
    livesText: Phaser.GameObjects.Text
    boardLayer: Phaser.Tilemaps.TilemapLayer
    dotsLayer: Phaser.Tilemaps.TilemapLayer
    bork: Phaser.GameObjects.Image
    hero: Hero
    spawnPoint: { x: number, y: number }
    ghostGroup: Phaser.Physics.Arcade.Group
    cursors: Phaser.Types.Input.Keyboard.CursorKeys
    wsad: {
        up: Phaser.Input.Keyboard.Key,
        down: Phaser.Input.Keyboard.Key,
        left: Phaser.Input.Keyboard.Key,
        right: Phaser.Input.Keyboard.Key
    }
    lastMobileDirection: Record<Direction, boolean> = { up: false, down: false, left: false, right: false }
    buttons: { up: Phaser.GameObjects.Rectangle, down: Phaser.GameObjects.Rectangle, left: Phaser.GameObjects.Rectangle, right: Phaser.GameObjects.Rectangle }
    gameOver = false
    avoidMsg: Phaser.GameObjects.Text

    constructor ()
    {
        super({key: 'Game'})
        this.spawnPoint = { x: 304, y: 144 }
        this.lastMobileDirection = { up: false, down: false, left: false, right: false }
    }

    init()
    {
        if(!this.input.keyboard){
            return
        }

        this.cursors = this.input.keyboard.createCursorKeys()

        this.wsad = {
			up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
			down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
			left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
			right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
		}
    }

    preload ()
    {
        this.load.image('bork', 'assets/bork.png')
        this.load.tilemapTiledJSON('tilemap', 'assets/level-1.json')
        this.load.image('tiles', 'assets/board.png')
        this.load.atlas('board-atlas', 'assets/board.png', 'assets/board.json')
        this.load.atlas('game-atlas', 'assets/game.png', 'assets/game.json')
        this.load.atlas('bork-atlas', 'assets/bork.png', 'assets/bork.json')
    }

    create ()
    {
        const map = this.make.tilemap({ key: 'tilemap' })

        const tileset = map.addTilesetImage('basic_tiles', 'tiles')
        if (!tileset) {
            return
        }

        const boardLayer = map.createLayer('Board', tileset, 0, 0)
        if (!boardLayer) {
            return
        }
        boardLayer.forEachTile((tile: Phaser.Tilemaps.Tile) => {
            tile.tint = 0x4027fe
        }).setCollisionByProperty({ collides: true })
        this.boardLayer = boardLayer

        const dotsLayer = map.createLayer('Dots', tileset)
        if(!dotsLayer){
            return
        }
		const dots = dotsLayer.createFromTiles(33, -1, { key: 'board-atlas', frame: 'white-dot-small.png', origin: 0 })
		dots.forEach(dot => {
			this.physics.add.existing(dot)
			const body = dot.body as Phaser.Physics.Arcade.Body
			body.setCircle(4, 12, 12)
		})

		const powerDots = dotsLayer.createFromTiles(34, -1, { key: 'board-atlas', frame: 'white-dot.png', origin: 0 })
		powerDots.forEach(dot => {
			this.physics.add.existing(dot)
			const body = dot.body as Phaser.Physics.Arcade.Body
			body.setCircle(8, 8, 8)

			dot.setTint(0xfe03f0)

			this.tweens.add({
				targets: dot,
				alpha: 0,
				duration: 1000,
				yoyo: true,
				repeat: -1
			})
		})

        createHeroAnims(this.anims)
        createGhostAnims(this.anims)

        const objectLayer = map.getObjectLayer('BoardObjects')
        if (objectLayer) {
            this.createFromObjectsLayer(objectLayer)
        } else {
            return
        }

        this.ghostGroup = this.createGhosts()

        if (this.hero)
        {
            this.physics.add.overlap(this.hero, dots, this.handlePlayerEatDot, this.processPlayerEatDot, this)
            this.physics.add.overlap(this.hero, powerDots, this.handlePlayerEatPowerDot, this.processPlayerEatDot, this)
            this.physics.add.overlap(this.hero, this.ghostGroup, this.handleHeroGhostCollision, undefined, this)
        }

        
		if(borkTrait == 'Maverick'){
			this.add.text(304, 16, borkTrait + ' = Slower Enemies', { fontFamily: 'Arial', fontSize: '14px', color: '#ffffff' }).setOrigin(0.5)
		} else if(borkTrait == 'Houdini'){
			this.add.text(304, 16, borkTrait + ' = Extra Life', { fontFamily: 'Arial', fontSize: '14px', color: '#ffffff' }).setOrigin(0.5)
		} else if(borkTrait == 'Junk Collector'){
			this.add.text(304, 16, borkTrait + ' = Extra Point', { fontFamily: 'Arial', fontSize: '14px', color: '#ffffff' }).setOrigin(0.5)
		}

        this.createMobileControls()

        this.goText = this.add.text(304, 207, 'GO!', { fontFamily: 'Arial', fontSize: '24px', color: '#ffffff' }).setOrigin(0.5).setVisible(true)
        this.livesText = this.add.text(263, 194, 'Lives: ' + triesRemaining, { fontFamily: 'Arial', fontSize: '24px', color: '#ffffff' }).setVisible(false)
        this.goLivesVisibility()

        this.avoidMsg = this.add.text(304, 432, 'AVOID ENEMIES - THEY ARE NEVER EDIBLE', {
            fontFamily: 'Arial Black', fontSize: 14, color: '#fffc3b',
            align: 'center'
        }).setOrigin(0.5)
    }

    handleHeroGhostCollision(obj1: Phaser.GameObjects.GameObject | Phaser.Tilemaps.Tile, obj2: Phaser.GameObjects.GameObject | Phaser.Tilemaps.Tile) {
        if (obj1 instanceof Phaser.GameObjects.GameObject && obj2 instanceof Phaser.GameObjects.GameObject) {
            const hero = obj1 === this.hero ? obj1 : obj2 === this.hero ? obj2 : null
            const ghost = obj1 !== this.hero ? obj1 : obj2 !== this.hero ? obj2 : null
    
            if (hero && ghost && !this.gameOver) {
                if (triesRemaining == 1) {
                    this.gameOver = true
                    this.hero.setTint(0xff0000)
                    this.hero.boostText.destroy()
                    this.livesText.destroy()
                    this.add.text(253, 194, 'You Lose!', { fontFamily: 'Arial', fontSize: '24px', color: '#ffffff' })
                    this.scene.pause()
                    triesRemaining = 0
                    setTriesRemaining(triesRemaining)
                    handleGameEnd()
                    setTimeout(() => {
                        this.scene.stop()
                    }, 10000000)
                } else {
                    this.hero.resetHero()
                    this.ghostGroup.clear(true, true)
                    this.ghostGroup = this.createGhosts()
                    triesRemaining--
                    this.updateLivesText()
                }
            }
        }
    }

    goLivesVisibility() {
        this.time.delayedCall(1400, () => {
            this.goText.setVisible(false)
        })
        this.time.delayedCall(1400, () => {
            this.livesText.setVisible(true)
        })
    }

    updateLivesText() {
        this.livesText.setText('Lives: ' + triesRemaining)
    }

    handlePlayerEatPowerDot(obj1: Phaser.GameObjects.GameObject | Phaser.Tilemaps.Tile, obj2: Phaser.GameObjects.GameObject | Phaser.Tilemaps.Tile)
	{
		if (!this.hero || !obj1)
		{
			return
		}
		this.hero.eatPowerDot(obj2 as Phaser.Physics.Arcade.Sprite)
	}

	processPlayerEatDot(obj1: Phaser.GameObjects.GameObject | Phaser.Tilemaps.Tile, obj2: Phaser.GameObjects.GameObject | Phaser.Tilemaps.Tile)
	{
		if (!this.hero || !obj1)
		{
			return false
		}
		
		return this.hero.canEatDot(obj2 as Phaser.Physics.Arcade.Sprite)
		
	}

	handlePlayerEatDot(obj1: Phaser.GameObjects.GameObject | Phaser.Tilemaps.Tile, obj2: Phaser.GameObjects.GameObject | Phaser.Tilemaps.Tile)
    {
        if (obj1 instanceof Phaser.GameObjects.GameObject && obj2 instanceof Phaser.GameObjects.GameObject) {
            obj2.destroy(true)
            eatDotCount++
            if(eatDotCount == 118) {
                if(borkTrait == 'Junk Collector'){
                    triesRemaining++
                    setTriesRemaining(triesRemaining)
                } else {
                    setTriesRemaining(triesRemaining)
                }
                //this.livesText.destroy()
                this.hero.boostText.destroy()
                this.hero.setTint(0xFFFFFF)
                this.add.text(304, 183, 'You Win!', {
                    fontFamily: 'Arial', fontSize: 14, color: '#ffffff',
                    align: 'center'
                }).setOrigin(0.5)
                this.add.text(304, 233, triesRemaining + ' Aether', {
                    fontFamily: 'Arial', fontSize: 14, color: '#ffffff',
                    align: 'center'
                }).setOrigin(0.5)
                
                this.scene.pause()
                setTimeout(() => {
                    this.scene.stop()
                }, 10000000)
            }
        }
    }

    createMobileControls() {
		const controlWidth = 608
		const controlHeight = 88
		const buttonWidth = 195
		const buttonHeight = 88
		const padding = 4
	
		const controlAreaX = (this.scale.width - controlWidth) / 2
		const controlAreaY = this.scale.height - controlHeight - 10
		const controlArea = this.add.container(controlAreaX + controlWidth / 2, controlAreaY + controlHeight / 2)
        
		const buttons = this.buttons = {
            up: this.add.rectangle(0, -buttonHeight - padding / 2, buttonWidth, buttonHeight, 0x0000ff).setInteractive(),
            down: this.add.rectangle(0, padding / 2, buttonWidth, buttonHeight, 0x0000ff).setInteractive(),
            left: this.add.rectangle(-buttonWidth - padding, -44, buttonWidth, buttonHeight, 0x0000ff).setInteractive(),
            right: this.add.rectangle(buttonWidth + padding, -44, buttonWidth, buttonHeight, 0x0000ff).setInteractive()
        }

        controlArea.add([this.buttons.up, this.buttons.down, this.buttons.left, this.buttons.right])
	
		const activateButton = (direction: Direction) => {
			Object.values(buttons).forEach(button => button.setFillStyle(0x0000ff))
			buttons[direction].setFillStyle(0xfe03f0)
			Object.keys(this.lastMobileDirection).forEach((key: any) => {
                this.lastMobileDirection[key as Direction] = (key === direction)
            })
		}
	
		Object.entries(buttons).forEach(([direction, button]) => {
			button.on('pointerdown', () => activateButton(direction as Direction))
			button.on('pointerover', () => {
				if (this.game.input.activePointer.isDown) {
					activateButton(direction as Direction)
				}
			})
			button.on('pointerup', () => {
				button.setFillStyle(0x0000ff)
				this.lastMobileDirection[direction as Direction] = false
			})
            button.on('pointerout', () => {
                button.setFillStyle(0x0000ff)
                this.lastMobileDirection[direction as Direction] = false
            })
		})
		
	}

    update(t: number, dt: number) {
        this.physics.world.step(1 / 120)

        if(!t){return}

        if (this.hero && this.hero.active && !this.gameOver) {
            this.physics.world.overlap(this.hero, this.ghostGroup, this.handleHeroGhostCollision, undefined, this)
        }
        if (this.hero.body && this.boardLayer) {
    
            const directions: Direction[] = ['up', 'down', 'left', 'right']
            const wsadKeys = {up: this.wsad.up, down: this.wsad.down, left: this.wsad.left, right: this.wsad.right}
            const cursorKeys = {up: this.cursors.up, down: this.cursors.down, left: this.cursors.left, right: this.cursors.right}
    
            directions.forEach(dir => {
                if (wsadKeys[dir].isDown || cursorKeys[dir].isDown || this.lastMobileDirection[dir]) {
                    this.buttons[dir].setFillStyle(0xfe03f0)
                } else {
                    this.buttons[dir].setFillStyle(0x0000ff)
                }
            })
    
            this.hero.handleMovement(dt, { cursors: this.cursors, wsad: this.wsad }, this.boardLayer)
    
            if (Object.values(this.lastMobileDirection).some(value => value)) {
                const mockKey = (isDown: boolean): Phaser.Input.Keyboard.Key => {
                    return {
                        isDown,
                        reset: () => {}
                    } as Phaser.Input.Keyboard.Key
                }
                directions.forEach(dir => {
                    if (this.lastMobileDirection[dir] && this.hero && this.cursors && this.boardLayer) {
                        const wsad = { up: mockKey(dir === 'up'), down: mockKey(dir === 'down'), left: mockKey(dir === 'left'), right: mockKey(dir === 'right') }
                        this.hero.handleMovement(dt, { cursors: this.cursors, wsad }, this.boardLayer)
                    }
                })
            }
            
        }
    }

    createGhosts()
	{
		this.ghostGroup = this.physics.add.group()
		    
        const blinky = this.add.ghost(256, 256)
            .makeRed()
			.enableTargetMarker(true)
        blinky.setAI(new ChaseHeroAI(this.hero!, blinky, this.boardLayer!))
		this.ghostGroup.add(blinky)

        const pinky = this.add.ghost(224, 256)
			.makePink()
			.enableTargetMarker(true)
		pinky.setAI(new InterceptHeroAI(this.hero!, pinky, this.boardLayer!, true))
		this.ghostGroup.add(pinky)

		const inky = this.add.ghost(288, 256)
			.makeTeal()
			.enableTargetMarker(true)
		inky.setAI(new FlankHeroAI(this.hero!, inky, blinky, this.boardLayer!, true))
		this.ghostGroup.add(inky)

		const clyde = this.add.ghost(320, 256)
			.makeOrange()
			.enableTargetMarker(true)

		clyde.setAI(new PlayfullyChaseHeroAI(
			this.hero!,
			clyde,
			this.boardLayer!,
			new ScatterAI(16, this.boardLayer!.height - 16, clyde, this.boardLayer!)
		))
		this.ghostGroup.add(clyde)

		return this.ghostGroup
	}

    createFromObjectsLayer(layer: Phaser.Tilemaps.ObjectLayer)
	{
		for (let i = 0; i < layer.objects.length; ++i)
		{
			const obj = layer.objects[i]
			switch (obj.name)
			{
				case 'spawn':
				{
					const x = Math.round(obj.x! / 32) * 32
					const y = Math.round(obj.y! / 32) * 32
					this.hero = this.add.hero(x + 16, y + 16, 'bork-atlas')
					//this.hero.setAI(new HeroAI())
					this.setupHero(this.boardLayer!)
					break
				}
			}
		}
	}

    setupHero(board: Phaser.Tilemaps.TilemapLayer)
	{
		if (!this.hero)
		{
			return
		}

		this.physics.add.collider(this.hero, board)

		this.physics.world.setBounds(0, 0, board.width, board.height)
	}
}

    
