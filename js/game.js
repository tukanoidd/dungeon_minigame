const gravity = 1000 //variable for world gravity

var player  //variable for player

/*variable store players configuration (different speeds, FPS for animations, checkers,
* checkpoints, prefixes for animations)
*/
var playerConf = {
	'speeds': { // various speed parameters for different situations
		'speed': 250, // default walking speed
		'velocityX': 0, // current walking speed
		'jump': -490, // jump speed
		'climb': -90 // climbing speed
	},
	'animSpeeds': { // various animation speeds
		'runFPS': 15, // frames per second for running animation
		'jumpFPS': 10, // frames per second for jumping animation
		'idleFPS': 5 // frames per second for idle animation
	},
	'checks': { // various checks for the player
		'onGround': true, // if player is on the ground
		'isClimbing': false, // if player is climbing
		'isJumping': false, // if player is jumping
		'fallBoosted': false, // if player has cape boost that makes you fall slower
		'tped': false // if [player teleported
	},
	'checkpoint': { // checkpoint information
		'default': { // default checkpoint coordinates to spawn player in
			'x': 48,
			'y': 864
		},
		'current': { // checkpoint coordinates where to respawn player to
			'x': 48,
			'y': 864
		}
	},
	'currentAnim': '' // current player animation
}

var cursors //variable for storing control keys

var map  //variable for map
var layers = {} //variable for storing layers
var tilesets = {} //variable for storing tilesets

var mapStuffCoordsLinks = { //variable for storing map confiduration (potions, levers, crossbows)
	'potions': [ // list of information for different potions on the map (potion's coordinates, what boost it gives, it's animation suffix and what ability it gives)
		{
			'coords': {
				'x': 37,
				'y': 38
			},
			'boost': -150,
			'anim': '_boots',
			'ability': 'jump'
		},
		{
			'coords': {
				'x': 90,
				'y': 7
			},
			'boost': -880,
			'anim': '_boots_cape',
			'ability': 'fall'
		},
		{
			'coords': {
				'x': 145,
				'y': 56
			},
			'boost': -100,
			'anim': '_boots_cape_gauntlets',
			'ability': 'climb'
		}
	],
	'levers': [ // information about levers on the map (their coordinates, what door tiles' coordinates they're linked to and if it was already pulled or not)
		{
			'coords': {
				'x': 1,
				'y': 34
			},
			'link': [
				[35, 35],
				[35, 36],
				[35, 37],
				[35, 38]
			],
			'pulled': false
		},
		{
			'coords': {
				'x': 62,
				'y': 2
			},
			'link': [
				[43, 1],
				[43, 2],
				[43, 3],
				[43, 4]
			],
			'pulled': false
		},
		{
			'coords': {
				'x': 74,
				'y': 43
			},
			'link': [
				[96, 49],
				[96, 50],
				[96, 51],
				[96, 52]
			],
			'pulled': false
		},
		{
			'coords': {
				'x': 97,
				'y': 55
			},
			'link': [
				[142, 52],
				[142, 53],
				[142, 54],
				[142, 55],
				[142, 56]
			],
			'pulled': false
		},
	],
	'crossbows': { // information about crossbows in the map
		'left': null, // crossbows that are turned to the left
		'right': null, // crossbows that are turned to the right
		'sprites': [], // crossbow sprites (spawned on the map)
		'timers': { // crossbows timers that tell them when to shoot and in which direction
			'left': null, // left turned crossbows' timers
			'right': null // right turned crossbows' timers
		},
		'arrows': { // arrow configuration
			'speed': 300, // speed of the arrow
			'group': null, // group of arrows spawned
			'delay': 2000 // timer shoot delay
		}
	}
}

let won = false //variable for checking if player won

let sounds  //variable for storing sounds

let spacebarText  //variable for text "spacebar" which shows up after player drink 2nd potion

/**
 * function that load all assets needed for the game (spritesheets, tilesets, tilemap, sounds)
 */
function preload() {
	// load player animation spritesheets
	let abilities = []
	let currPotion = {anim: ''}

	for (let i = 0; i < 4; i++) { // for loop 4 times (default/jump/fall/climp spritesheets)
		if (i !== 0) {
			currPotion = mapStuffCoordsLinks.potions[i-1]
			abilities.push(currPotion.ability)
			console.log(abilities.join('_'))
		}

		this.load.spritesheet(
			`player${(i !== 0 ? `_${abilities.join('_')}` : '')}`, // if index is not 0 then look for potion ability to add to the name of parameter
			`assets/player_spritesheet${(i !== 0 ? currPotion.anim : '')}.png`, // if index is not 0 then look for potion anim suffix to add to the name of the spritesheet file
			{ // they all have the same frame dimensions
				frameWidth: 50,
				frameHeight: 37
			}
		)
		console.log(`player${(i !== 0 ? `_${abilities.join('_')}` : '')}`, `assets/player_spritesheet${(i !== 0 ? currPotion.anim : '')}.png`)
	}

	// load images
	this.load.image('tileset', 'assets/tileset.png') // load tileset
	this.load.image('items', 'assets/items.png') // load items tileset
	this.load.image('decor', 'assets/decor.png') // load decor tileset

	this.load.tilemapTiledJSON('map', 'assets/map.json') // load map informaation from json

	this.load.spritesheet('crossbow', 'assets/crossbow.png', // load crossbow animation spritesheet
		{
			frameWidth: 32,
			frameHeight: 28
		}
	)
	this.load.image('arrow', 'assets/arrow.png') // load arrow image

	// load audio
	this.load.audio('background_music', 'assets/dungeon_theme.mp3') // load backgroud music
	this.load.audio('death', 'assets/death.wav') // load death sound
	this.load.audio('jump', 'assets/jump.ogg') // load jump sound
	this.load.audio('win', 'assets/win.ogg') // load game win sound
}

/**
 * function that initiates all variables, creates map, adds collision callbacks, animations
 */
function create() {
	addSounds(this) // add all of the sound to the game

	cursors = this.input.keyboard.createCursorKeys() //control keys

	map = this.add.tilemap('map', 32, 32) // initialize the map from tilemap

	addTilesets() // add all tilesets
	addLayers() // add all scene layers

	setCollisionsCallbacks(this) // setup all colisions and overlaps
	addCrossbowsAndAnims(this) // add all the crosbows to the map and their animations

	//create bounds of the map so player won't be able to fall of the screen in any way
	this.physics.world.bounds.width = layers.mapLayer.width
	this.physics.world.bounds.height = layers.mapLayer.height

	// set yp player
	player = this.physics.add.sprite(
		playerConf.checkpoint.default.x,
		playerConf.checkpoint.default.y,
		'player',
		0
	) // initiate the player
	player.body
		.setSize(26, 31)
		.setOffset(12.5, 6) // set smaller collision box
	player.setCollideWorldBounds(true) // make player unable to fall of the screen

	addPlayerAnims(this) // add all player animations

	this.cameras.main.setBounds(
		0,
		0,
		map.widthInPixels,
		map.heightInPixels
	) // change camera bounds to be exactly as map bounds
	this.cameras.main.startFollow(player) // follow the player
	this.cameras.main.zoom = 2 // zoom in because tilesets are too small and map easily would fit the screen

	/*text "spacebar" which shows up after player grabs 2nd potion, position it properly with specific style, make it be
	 in the camera view and make it invisible*/
	spacebarText = this.add.text(
		this.cameras.main.centerX,
		this.cameras.main.centerY + this.cameras.main.height / 2 - 250,
		'SPACEBAR',
		{
			fontFamily: 'Sans Serif',
			fontSize: '16px',
			color: '#fff',
			align: 'center'
		}
	).setScrollFactor(0).setOrigin(0.5, 0.5)
	spacebarText.visible = false

	addCollideOverlap(this) // add all collisions and overlaps

	/*variable for storing cheat buttons, just in ase if game is too hard, A - 1st checkpoint, S - 2nd checkpoint,
	* D - 3rd checkpoint, F - 4th checkpoint, G - finish
	*/
	this.input.keyboard.addKey('A').on('down', (_) => {
		playerConf.checkpoint.current.x = 608
		playerConf.checkpoint.current.y = 592

		player.x = playerConf.checkpoint.current.x
		player.y = playerConf.checkpoint.current.y
	})

	this.input.keyboard.addKey('S').on('down', (_) => {
		playerConf.checkpoint.current.x = 1168
		playerConf.checkpoint.current.y = 48

		player.x = playerConf.checkpoint.current.x
		player.y = playerConf.checkpoint.current.y
	})

	this.input.keyboard.addKey('D').on('down', (_) => {
		playerConf.checkpoint.current.x = 1680
		playerConf.checkpoint.current.y = 880

		player.x = playerConf.checkpoint.current.x
		player.y = playerConf.checkpoint.current.y
	})

	this.input.keyboard.addKey('F').on('down', (_) => {
		playerConf.checkpoint.current.x = 2352
		playerConf.checkpoint.current.y = 880

		player.x = playerConf.checkpoint.current.x
		player.y = playerConf.checkpoint.current.y
	})

	this.input.keyboard.addKey('G').on('down', (_) => {
		playerConf.checkpoint.current.x = 2544
		playerConf.checkpoint.current.y = 112

		player.x = playerConf.checkpoint.current.x
		player.y = playerConf.checkpoint.current.y
	})
}

/**
 * function that add sounds to the game
 * @param game {Phaser.Scene} - game context
 */
function addSounds(game) {
	if (!sounds) // if sounds object wasn't initialized yet
		sounds = {
			backMusic: game.sound.add(
				'background_music',
				{
					volume: 0.1,
					loop: true
				}
			).play(), // play it straight away
			deathSound: game.sound.add(
				'death',
				{
					volume: 0.3,
					loop: false
				}
			),
			jumpSound: game.sound.add(
				'jump',
				{
					volume: 0.5,
					loop: false
				}
			),
			winSound: game.sound.add(
				'win',
				{
					volume: 0.7,
					loop: false
				}
			)
		}
}

/**
 * function that adds tilesets to the map
 */
function addTilesets() {
	tilesets.dungeonTileset = map.addTilesetImage('tileset', 'tileset')
	tilesets.itemsTileset = map.addTilesetImage('items', 'items')
	tilesets.decorTileset = map.addTilesetImage('decoration', 'decor')
}

/**
 * function that adds layers to the game
 */
function addLayers() {
	layers.backgroundLayer = map.createStaticLayer('Background', tilesets.dungeonTileset)
	layers.miscLayer = map.createStaticLayer('Misc', [tilesets.dungeonTileset, tilesets.decorTileset])
	layers.checkpointLayer = map.createDynamicLayer('Checkpoint', tilesets.dungeonTileset)
	layers.tpDoorsLayer = map.createDynamicLayer('TPDoor', tilesets.dungeonTileset)
	layers.mapLayer = map.createDynamicLayer('Map', tilesets.dungeonTileset)
	layers.treasureLayer = map.createDynamicLayer('Treasure', tilesets.itemsTileset)
	layers.potionLayer = map.createDynamicLayer('Potions', tilesets.itemsTileset)
	layers.leverBlocksLayer = map.createDynamicLayer('LeverBlocks', tilesets.dungeonTileset)
	layers.obstaclesLayer = map.createDynamicLayer('Obstacles', tilesets.dungeonTileset)
	layers.climbLayer = map.createDynamicLayer('Climbing', tilesets.dungeonTileset)
	layers.leversLayer = map.createDynamicLayer('Levers', tilesets.dungeonTileset)
}

/**
 * functiin that sets collision calbacks for layers
 * @param game {Phaser.Scene} - game context
 */
function setCollisionsCallbacks(game) {
	layers.mapLayer.setCollisionByExclusion([-1])
	layers.checkpointLayer.setTileIndexCallback([85], setCheckpoint, game)
	layers.tpDoorsLayer.setTileIndexCallback([159, 183, 207], tpDoor, game)
	layers.treasureLayer.setTileIndexCallback(
		[439, 440],
		(_, __) => {
			if (!won) {
				won = true
				win(game)
			}
		},
		game
	)
	layers.potionLayer.setTileIndexCallback(
		[405, 421, 436],
		(player, tile) => grabPotion(player, tile),
		game
	)
	layers.leverBlocksLayer.setCollisionByExclusion([-1])

	layers.obstaclesLayer.setTileIndexCallback([167, 190, 192, 215], kill, game)
	layers.climbLayer.setTileIndexCallback([131, 155], climb, game)
	layers.leversLayer.setTileIndexCallback([117, 119], leverFlip, this)
}

/**
 * function that adds crossbows to the game and sets animations crossbow shooting
 * @param game {Phaser.Scene} - game context
 */
function addCrossbowsAndAnims(game) {
	game.anims.create({
		key: 'crossbow_shoot',
		frames: game.anims.generateFrameNumbers(
			'crossbow',
			{
				start: 0,
				end: 1
			}
		),
		frameRate: 10,
		repeat: 0
	})

	mapStuffCoordsLinks.crossbows.left = game.add.group()
	mapStuffCoordsLinks.crossbows.right = game.add.group()

	//left directed crossbows
	mapStuffCoordsLinks.crossbows.sprites.push(game.add.sprite(560, 776, 'crossbow', 0))
	mapStuffCoordsLinks.crossbows.sprites.push(game.add.sprite(560, 552, 'crossbow', 0))
	mapStuffCoordsLinks.crossbows.sprites.push(game.add.sprite(784, 456, 'crossbow', 0))
	mapStuffCoordsLinks.crossbows.sprites.push(game.add.sprite(784, 264, 'crossbow', 0))
	mapStuffCoordsLinks.crossbows.sprites.push(game.add.sprite(1008, 168, 'crossbow', 0))
	mapStuffCoordsLinks.crossbows.sprites.push(game.add.sprite(1008, 120, 'crossbow', 0))
	mapStuffCoordsLinks.crossbows.sprites.push(game.add.sprite(1536, 360, 'crossbow', 0))
	mapStuffCoordsLinks.crossbows.sprites.push(game.add.sprite(1536, 600, 'crossbow', 0))
	mapStuffCoordsLinks.crossbows.sprites.push(game.add.sprite(2672, 856, 'crossbow', 0))
	mapStuffCoordsLinks.crossbows.sprites.push(game.add.sprite(2672, 680, 'crossbow', 0))
	mapStuffCoordsLinks.crossbows.sprites.push(game.add.sprite(2672, 344, 'crossbow', 0))

	for (let i = 0; i < 11; i++)
		mapStuffCoordsLinks.crossbows.left.add(mapStuffCoordsLinks.crossbows.sprites[i])

	mapStuffCoordsLinks.crossbows.timers.left = game.time.addEvent({
		delay: mapStuffCoordsLinks.crossbows.arrows.delay,
		callback: shoot,
		args: [false, game],
		callbackScope: game,
		loop: true
	})

	//right directed crosssbows
	mapStuffCoordsLinks.crossbows.sprites.push(game.add.sprite(1104, 808, 'crossbow', 0).setFlipX(true))
	mapStuffCoordsLinks.crossbows.sprites.push(game.add.sprite(114, 152, 'crossbow', 0).setFlipX(true))
	mapStuffCoordsLinks.crossbows.sprites.push(game.add.sprite(2400, 232, 'crossbow', 0).setFlipX(true))

	for (let i = 11; i < mapStuffCoordsLinks.crossbows.sprites.length; i++)
		mapStuffCoordsLinks.crossbows.right.add(mapStuffCoordsLinks.crossbows.sprites[i])

	//looped timer for shooting arrows
	mapStuffCoordsLinks.crossbows.timers.right = game.time.addEvent({
		delay: mapStuffCoordsLinks.crossbows.arrows.delay,
		callback: shoot,
		args: [true, game],
		callbackScope: game,
		loop: true
	})

	mapStuffCoordsLinks.crossbows.arrows.group = game.add.group()
}

/**
 * function which is used to shoot an arrow
 * @param isRight {boolean} - if is shooting right
 * @param game {Phaser.Scene} - game context
 */
function shoot(isRight, game) {
	if (!isRight) {
		for (let i = 0; i < mapStuffCoordsLinks.crossbows.left.getChildren().length; i++) {
			let crossbow = mapStuffCoordsLinks.crossbows.left.getChildren()[i]
			mapStuffCoordsLinks.crossbows.left.getChildren()[i].anims.play('crossbow_shoot', false)

			let arrow = game.physics.add.sprite(crossbow.x - 31, crossbow.y, 'arrow')
			arrow.body.setAllowGravity(false)
			arrow.body.setVelocityX(-mapStuffCoordsLinks.crossbows.arrows.speed)

			mapStuffCoordsLinks.crossbows.arrows.group.add(arrow)
		}
	} else {
		for (let i = 0; i < mapStuffCoordsLinks.crossbows.right.getChildren().length; i++) {
			let crossbow = mapStuffCoordsLinks.crossbows.right.getChildren()[i]
			mapStuffCoordsLinks.crossbows.right.getChildren()[i].anims.play('crossbow_shoot', false)

			let arrow = game.physics.add.sprite(crossbow.x + 31, crossbow.y, 'arrow')
			arrow.setFlipX(true)
			arrow.body.setAllowGravity(false)
			arrow.body.setVelocityX(mapStuffCoordsLinks.crossbows.arrows.speed)

			mapStuffCoordsLinks.crossbows.arrows.group.add(arrow)
		}
	}
}

/**
 * function that is used to set checkpoint when player overlaps with checkpoint and removes checkpoint tile from the map
 * @param player {Phaser.GameObjects.Sprite} - player
 * @param tile {Phaser.Tilemaps.Tile} - checkpoint tile
 */
function setCheckpoint(player, tile) {
	playerConf.checkpoint.current.x = tile.x * 16
	playerConf.checkpoint.current.y = tile.y * 16
	layers.checkpointLayer.removeTileAt(tile.x, tile.y)
}

/**
 * function that is used to teleport player from one door to another (works only once, in one direction)
 * @param player {Phaser.GameObjects.Sprite} - player
 * @param tile {Phaser.Tilemaps.Tile} - door tile (not used, default variable)
 */
function tpDoor(player, tile) {
	if (!playerConf.checks.tped) {
		playerConf.checks.tped = true
		player.x = 1168
		player.y = 48
	}
}

/**
 * function that is used when player grabs a potion, sets proper boost (jump, fall, or climb and changes sprites of the
 * player so he can see if potion was grabbed) and removes the potion tile from the map
 * @param player {Phaser.GameObjects.Sprite} - player
 * @param tile {Phaser.Tilemaps.Tile} - potion tile
 */
function grabPotion(player, tile) {
	for (let potion of mapStuffCoordsLinks.potions) {
		if (tile.x === potion.coords.x && tile.y === potion.coords.y) {
			if (potion.ability !== 'fall')
				playerConf.speeds[potion.ability] += potion.boost
			else
				playerConf.checks.fallBoosted = true

			playerConf.currentAnim = potion.anim
		}
	}

	layers.potionLayer.removeTileAt(tile.x, tile.y)
}

/**
 * function that is used when player overlaps with lever tile to open the door (lever can be flipped only once)
 * @param player {Phaser.GameObjects.Sprite} - player
 * @param tile {Phaser.Tilemaps.Tile} - lever tile
 */
function leverFlip(player, tile) {
	for (let lever of mapStuffCoordsLinks.levers) {
		if (tile.x === lever.coords.x && tile.y === lever.coords.y && !lever.pulled) {
			lever.pulled = true
			tile.flipX = true

			for (let brick of lever.link)
				layers.leverBlocksLayer.removeTileAt(brick[0], brick[1])
		}
	}
}

/**
 * function that is used when player collides with arrow and kills him, arrow is destroyed too
 * @param player {Phaser.GameObjects.Sprite} - player
 * @param arrow {Phaser.GameObjects.Sprite} - arrow object
 */
function arrowKill(player, arrow) {
	arrow.destroy()
	kill()
}

/**
 * funciton that is used when player dies, teleports player to last checkpoint and plays death sound
 */
function kill() {
	player.x = playerConf.checkpoint.current.x
	player.y = playerConf.checkpoint.current.y
	sounds.deathSound.play()
}

/**
 * function that is used to set checkers for jumping and climbing when player starts climbing
 * @param player {Phaser.GameObjects.Sprite} - player
 * @param tile {Phaser.Tilemaps.Tile} - climbing tile (chain)
 */
function climb(player, tile) {
	playerConf.checks.isClimbing = true
	playerConf.checks.isJumping = false
}

/**
 * function that adds all player animations to the game (run, duck (which is not used because of limitations of phaser
 * arcade physics(can't change collision box properly), was too lazy to get rid of it), climb, jump, fall, idle)
 * @param game {Phaser.Scene} - game context
 */
function addPlayerAnims(game) {
	game.anims.create({
		key: 'player_idle',
		frames: game.anims.generateFrameNumbers('player', {
			start: 0,
			end: 3
		}),
		frameRate: playerConf.animSpeeds.idleFPS,
		repeat: -1
	})
	game.anims.create({
		key: 'player_run',
		frames: game.anims.generateFrameNumbers('player', {
			start: 8,
			end: 13
		}),
		frameRate: playerConf.animSpeeds.runFPS,
		repeat: -1
	})
	game.anims.create({
		key: 'player_duck',
		frames: game.anims.generateFrameNumbers('player', {
			start: 4,
			end: 7
		}),
		frameRate: playerConf.animSpeeds.idleFPS,
		repeat: -1
	})
	game.anims.create({
		key: 'player_jump',
		frames: game.anims.generateFrameNumbers('player', {
			start: 14,
			end: 21
		}),
		frameRate: playerConf.animSpeeds.jumpFPS,
		repeat: 0
	})
	game.anims.create({
		key: 'player_fall',
		frames: game.anims.generateFrameNumbers('player', {
			start: 20,
			end: 21
		}),
		frameRate: playerConf.animSpeeds.jumpFPS,
		repeat: -1
	})
	game.anims.create({
		key: 'player_climb',
		frames: game.anims.generateFrameNumbers('player', {
			start: 22,
			end: 25
		}),
		frameRate: playerConf.animSpeeds.idleFPS,
		repeat: -1
	})

	game.anims.create({
		key: 'player_boots_idle',
		frames: game.anims.generateFrameNumbers('player_jump', {
			start: 0,
			end: 3
		}),
		frameRate: playerConf.animSpeeds.idleFPS,
		repeat: -1
	})
	game.anims.create({
		key: 'player_boots_run',
		frames: game.anims.generateFrameNumbers('player_jump', {
			start: 8,
			end: 13
		}),
		frameRate: playerConf.animSpeeds.runFPS,
		repeat: -1
	})
	game.anims.create({
		key: 'player_boots_duck',
		frames: game.anims.generateFrameNumbers('player_jump', {
			start: 4,
			end: 7
		}),
		frameRate: playerConf.animSpeeds.idleFPS,
		repeat: -1
	})
	game.anims.create({
		key: 'player_boots_jump',
		frames: game.anims.generateFrameNumbers('player_jump', {
			start: 14,
			end: 21
		}),
		frameRate: playerConf.animSpeeds.jumpFPS,
		repeat: 0
	})
	game.anims.create({
		key: 'player_boots_fall',
		frames: game.anims.generateFrameNumbers('player_jump', {
			start: 20,
			end: 21
		}),
		frameRate: playerConf.animSpeeds.jumpFPS,
		repeat: -1
	})
	game.anims.create({
		key: 'player_boots_climb',
		frames: game.anims.generateFrameNumbers('player_jump', {
			start: 22,
			end: 25
		}),
		frameRate: playerConf.animSpeeds.idleFPS,
		repeat: -1
	})

	game.anims.create({
		key: 'player_boots_cape_idle',
		frames: game.anims.generateFrameNumbers('player_jump_fall', {
			start: 0,
			end: 3
		}),
		frameRate: playerConf.animSpeeds.idleFPS,
		repeat: -1
	})
	game.anims.create({
		key: 'player_boots_cape_run',
		frames: game.anims.generateFrameNumbers('player_jump_fall', {
			start: 8,
			end: 13
		}),
		frameRate: playerConf.animSpeeds.runFPS,
		repeat: -1
	})
	game.anims.create({
		key: 'player_boots_cape_duck',
		frames: game.anims.generateFrameNumbers('player_jump_fall', {
			start: 4,
			end: 7
		}),
		frameRate: playerConf.animSpeeds.idleFPS,
		repeat: -1
	})
	game.anims.create({
		key: 'player_boots_cape_jump',
		frames: game.anims.generateFrameNumbers('player_jump_fall', {
			start: 14,
			end: 21
		}),
		frameRate: playerConf.animSpeeds.jumpFPS,
		repeat: 0
	})
	game.anims.create({
		key: 'player_boots_cape_fall',
		frames: game.anims.generateFrameNumbers('player_jump_fall', {
			start: 20,
			end: 21
		}),
		frameRate: playerConf.animSpeeds.jumpFPS,
		repeat: -1
	})
	game.anims.create({
		key: 'player_boots_cape_climb',
		frames: game.anims.generateFrameNumbers('player_jump_fall', {
			start: 22,
			end: 25
		}),
		frameRate: playerConf.animSpeeds.idleFPS,
		repeat: -1
	})

	game.anims.create({
		key: 'player_boots_cape_gauntlets_idle',
		frames: game.anims.generateFrameNumbers('player_jump_fall_climb', {
			start: 0,
			end: 3
		}),
		frameRate: playerConf.animSpeeds.idleFPS,
		repeat: -1
	})
	game.anims.create({
		key: 'player_boots_cape_gauntlets_run',
		frames: game.anims.generateFrameNumbers('player_jump_fall_climb', {
			start: 8,
			end: 13
		}),
		frameRate: playerConf.animSpeeds.runFPS,
		repeat: -1
	})
	game.anims.create({
		key: 'player_boots_cape_gauntlets_duck',
		frames: game.anims.generateFrameNumbers('player_jump_fall_climb', {
			start: 4,
			end: 7
		}),
		frameRate: playerConf.animSpeeds.idleFPS,
		repeat: -1
	})
	game.anims.create({
		key: 'player_boots_cape_gauntlets_jump',
		frames: game.anims.generateFrameNumbers('player_jump_fall_climb', {
			start: 14,
			end: 21
		}),
		frameRate: playerConf.animSpeeds.jumpFPS,
		repeat: 0
	})
	game.anims.create({
		key: 'player_boots_cape_gauntlets_fall',
		frames: game.anims.generateFrameNumbers('player_jump_fall_climb', {
			start: 20,
			end: 21
		}),
		frameRate: playerConf.animSpeeds.jumpFPS,
		repeat: -1
	})
	game.anims.create({
		key: 'player_boots_cape_gauntlets_climb',
		frames: game.anims.generateFrameNumbers('player_jump_fall_climb', {
			start: 22,
			end: 25
		}),
		frameRate: playerConf.animSpeeds.idleFPS,
		repeat: -1
	})
}

/**
 * function that is used to add colliders and overlaps to the game
 * @param game {Phaser.Scene} - game context
 */
function addCollideOverlap(game) {
	game.physics.add.collider(layers.mapLayer, player)
	game.physics.add.overlap(layers.checkpointLayer, player)
	game.physics.add.overlap(layers.tpDoorsLayer, player)
	game.physics.add.overlap(layers.treasureLayer, player)
	game.physics.add.overlap(layers.potionLayer, player)
	game.physics.add.collider(layers.leverBlocksLayer, player)

	game.physics.add.overlap(player, layers.obstaclesLayer)
	game.physics.add.overlap(player, layers.climbLayer)
	game.physics.add.overlap(player, layers.leversLayer)

	game.physics.add.collider(
		mapStuffCoordsLinks.crossbows.arrows.group,
		layers.mapLayer,
		(arrow, _) => arrow.destroy()
	)
	game.physics.add.collider(player, mapStuffCoordsLinks.crossbows.arrows.group, arrowKill)
}

/**
 * function that is called every frame of the game (if I'm not mistaken), used to check different player states, changes
 * animations because of different states, checks controls
 */
function update() {
	player.body.setVelocityX(0)
	playerConf.checks.onGround = player.body.onFloor() // check if player is on the floor

	if (playerConf.checks.onGround || playerConf.checks.isClimbing) { // if player is on ground or climbing
		playerConf.checks.isJumping = false
		spacebarText.visible = false
	} else if (playerConf.checks.fallBoosted && !playerConf.checks.isClimbing) { // if player has slow falling ability and is not climbing
		spacebarText.visible = true // show 'SPACEBAR' text

		if (cursors.space.isDown) // if spacebar is pressed
			player.body.setVelocityY(this.physics.world.gravity.y
				+ mapStuffCoordsLinks.potions
					.find(p => p.ability === 'fall')
					.boost
			) // set players Y velocity equal to gravity speed + the boost
	}

	if (playerConf.checks.isClimbing) { // if player is climbing
		player.body.setAllowGravity(false)
		player.body.setVelocityY(0)
	} else { // not climbing
		player.setFlipY(false)
		player.body.setAllowGravity(true)

		if (!playerConf.checks.onGround && !playerConf.checks.isJumping) // if player is not on ground and not jumping
			player.anims.play('player' + playerConf.currentAnim + '_fall', true)
	}

	if (cursors.up.isDown) { // if up arrow is pressed
		if (cursors.left.isDown) // if left arrow is pressed
			leftRightMove(false) // go left

		if (cursors.right.isDown) // if right arrow is pressed
			leftRightMove(true) // go right

		if (playerConf.checks.onGround) // if player is on the ground
			jump()

		if (playerConf.checks.isClimbing) { // if player is climbing
			player.setFlipY(false)
			player.body.setVelocityY(playerConf.speeds.climb)
			player.anims.play('player' + playerConf.currentAnim + '_climb', true)
		}
	} else if (cursors.left.isDown) { // if left arrow is pressed
		if (cursors.up.isDown && playerConf.checks.onGround) // if up arrow is pressed and the player is on the ground
			jump()

		leftRightMove(false) // go left
	} else if (cursors.right.isDown) { // if right arrow is pressed
		if (cursors.up.isDown && playerConf.checks.onGround) // if up arrow is pressed and player is on ground
			jump()

		leftRightMove(true) // go right
	} else if (cursors.down.isDown) { // if arrow down is pressed
		if (playerConf.checks.onGround) // if player is on the ground
			player.anims.play('player' + playerConf.currentAnim + '_duck', true)

		if (playerConf.checks.isClimbing) { // if player is climbing
			player.setFlipY(true)
			player.body.setVelocityY(-playerConf.speeds.climb)
			player.anims.play('player' + playerConf.currentAnim + '_climb', true)
		}
	} else { // if no arrows are pressed
		playerConf.speeds.velocityX = 0 // stop

		if (playerConf.checks.onGround) { // if player is on the ground
			player.anims.play('player' + playerConf.currentAnim + '_idle', true)
		} else if (playerConf.checks.isClimbing) { // if player is climbing
			player.anims.play('player' + playerConf.currentAnim + '_climb')
		}
	}

	playerConf.checks.isClimbing = false
}

/**
 * function that is used when player jumps, sets x and y velocities properly changes animation to jumping one, plays
 * jump sound
 */
function jump() {
	player.body.setVelocityX(playerConf.speeds.velocityX)
	player.body.setVelocityY(playerConf.speeds.jump)
	player.anims.play('player' + playerConf.currentAnim + '_jump')
	playerConf.checks.isJumping = true
	sounds.jumpSound.play()
}

/**
 * function that is used when player is running, changes animation, flips character sprite depending on direction, sets
 * proper velocity
 * @param isRight {boolean} - if going right
 */
function leftRightMove(isRight) {
	let speed = (isRight ? 1 : -1) * playerConf.speeds.speed

	player.setFlipX(!isRight)
	player.body.setVelocityX(speed)
	playerConf.speeds.velocityX = speed

	if (playerConf.checks.onGround)
		player.anims.play('player' + playerConf.currentAnim + '_run', true)
	else if (playerConf.checks.isClimbing)
		player.anims.play('player' + playerConf.currentAnim + '_climb', true)
}

/**
 * function that is called when player wins the game, puts winning text, adds keyboard key that restarts the game
 * @param game {Phaser.Scene} - game context
 */
function win(game) {
	sounds.winSound.play()

	let winTextStyle = {
		fontFamily: 'Sans Serif',
		fontSize: '32px',
		color: '#fff',
		align: 'center'
	}
	game.add.text(game.cameras.main.centerX, game.cameras.main.centerY, 'You Win!!', winTextStyle).setScrollFactor(0).setOrigin(0.5, 0.5)

	let restartTextStyle = {
		fontFamily: 'Sans Serif',
		fontSize: '16px',
		color: '#fff',
		align: 'center'
	}
	game.add.text(game.cameras.main.centerX, game.cameras.main.centerY + 40, 'Press R to restart', restartTextStyle).setScrollFactor(0).setOrigin(0.5, 0.5)

	game.input.keyboard.addKey('R').on(
		'down',
		(_) => window.location.href = 'index.html'
	)
}

//configuration of the game
var config = {
	type: Phaser.AUTO,
	width: window.innerWidth,
	height: window.innerHeight,
	physics: {
		default: 'arcade',
		arcade: {
			gravity: {
				y: gravity
			},
			debug: false
		}
	},
	scene: {
		key: 'main',
		preload: preload,
		create: create,
		update: update
	}
}

var game = new Phaser.Game(config)
