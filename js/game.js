var gravity = 1000; //variable for world gravity

var player; //variable for player
/*variable store players configuration (different speeds, FPS for animations, checkers,
* checkpoints, prefixes for animations)
*/
var playerConf = {
    'speeds': {
        speed: 250,
        velocityX: 0,
        jumpSpeed: -490,
        climbSpeed: -90
    },
    'animSpeeds': {
        runFPS: 15,
        jumpFPS: 10,
        idleFPS: 5
    },
    'checks': {
        onGround: true,
        isClimbing: false,
        isJumping: false,
        fallBoosted: false,
        tped: false
    },
    'checkpoint': {
        'default': {
            x: 48,
            y: 864
        },
        'present': {
            x: 48,
            y: 864
        }
    },
    'anims': {
        'default': '',
        'present': ''
    }
};

var cursors; //variable for storing control keys

var map; //variable for map
var layers = {}; //variable for storing layers
var tilesets = {}; //variable for storing tilesets

var mapStuffCoordsLinks = { //variable for storing map confiduration (potions, levers, crossbows)
    'potions': {
        'jump': {
            'coords': {
                x: 37,
                y: 38
            },
            'boost': -150
        },
        'fall': {
            'coords': {
                x: 90,
                y: 7
            },
            'boost': -880
        },
        'climb': {
            'coords': {
                x: 145,
                y: 56
            },
            'boost': -100
        }
    },
    'levers': {
        'first': {
            'coords': {
                x: 1,
                y: 34
            },
            'link': [
                [35, 35],
                [35, 36],
                [35, 37],
                [35, 38]
            ],
            'pulled': false
        },
        'second': {
            'coords': {
                x: 62,
                y: 2
            },
            'link': [
                [43, 1],
                [43, 2],
                [43, 3],
                [43, 4]
            ],
            'pulled': false
        },
        'third': {
            'coords': {
                x: 74,
                y: 43
            },
            'link': [
                [96, 49],
                [96, 50],
                [96, 51],
                [96, 52]
            ],
            'pulled': false
        },
        'fourth': {
            'coords': {
                x: 97,
                y: 55
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
    },
    'crossbows': {
        'left': null,
        'right': null,
        'sprites': [],
        'timers': {
            'left': null,
            'right': null
        },
        'arrows': {
            'speed': 300,
            'group': null,
            'delay': 2000
        }
    }
};

var won = false; //variable for checking if player won

var sounds; //variable for storing sounds

var spacebarText; //variable for text "spacebar" which shows up after player drink 2nd potion

/**
 * function that load all assets needed for the game (spritesheets, tilesets, tilemap, sounds)
 */
function preload() {
    this.load.spritesheet(
        'player',
        'assets/player_spritesheet.png', {
            frameWidth: 50,
            frameHeight: 37
        }
    );
    this.load.spritesheet(
        'player_jump',
        'assets/player_spritesheet_boots.png', {
            frameWidth: 50,
            frameHeight: 37
        }
    );
    this.load.spritesheet(
        'player_jump_fall',
        'assets/player_spritesheet_boots_cape.png', {
            frameWidth: 50,
            frameHeight: 37
        }
    );
    this.load.spritesheet(
        'player_jump_fall_climb',
        'assets/player_spritesheet_boots_cape_gauntlets.png', {
            frameWidth: 50,
            frameHeight: 37
        }
    );
    this.load.image('tileset', 'assets/tileset.png');
    this.load.image('items', 'assets/items.png');
    this.load.image('decor', 'assets/decor.png');
    this.load.tilemapTiledJSON('map', 'assets/map.json');
    this.load.spritesheet('crossbow', 'assets/crossbow.png', {
        frameWidth: 32,
        frameHeight: 28
    });
    this.load.image('arrow', 'assets/arrow.png');
    this.load.audio('background_music', 'assets/dungeon_theme.mp3');
    this.load.audio('death', 'assets/death.wav');
    this.load.audio('jump', 'assets/jump.ogg');
    this.load.audio('win', 'assets/win.ogg');
}

/**
 * function that initiates all variables, creates map, adds collision callbacks, animations
 */
function create() {
    addSounds(this);

    cursors = this.input.keyboard.createCursorKeys(); //control keys

    map = this.add.tilemap('map', 32, 32);

    addTilesets();
    addLayers();

    setCollisionsCallbacks(this);
    addCrossbowsAndAnims(this);

    //create bounds of the map so player won't be able to fall of the screen in any way
    this.physics.world.bounds.width = layers.mapLayer.width;
    this.physics.world.bounds.height = layers.mapLayer.height;

    //initiate player, set smaller collision box, and make him unable to fall of the screen
    player = this.physics.add.sprite(playerConf.checkpoint.default.x, playerConf.checkpoint.default.y, 'player', 0);
    player.body.setSize(26, 31).setOffset(12.5, 6);
    player.setCollideWorldBounds(true);

    addPlayerAnims(this);

    /*change camera bounds to be exactly as map bounds, make it follow the player and zoom in because tilesets are too
    small and map easily would fit the screen*/
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.startFollow(player);
    this.cameras.main.zoom = 2;

    /*text "spacebar" which shows up after player grabs 2nd potion, position it properly with specific style, make it be
     in the camera view and make it invisible*/
    spacebarText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY + this.cameras.main.height / 2 - 250, 'SPACEBAR', {
        fontFamily: 'Sans Serif',
        fontSize: '16px',
        color: '#fff',
        align: 'center'
    }).setScrollFactor(0).setOrigin(0.5, 0.5);
    spacebarText.visible = false;

    addCollideOverlap(this);

    /*variable for storing cheat buttons, just in ase if game is too hard, A - 1st checkpoint, S - 2nd checkpoint,
    * D - 3rd checkpoint, F - 4th checkpoint, G - finish
    */
    var cheatBtns = {
        'check1': this.input.keyboard.addKey('A').on('down', (e) => {
            playerConf.checkpoint.present.x = 608;
            playerConf.checkpoint.present.y = 592;

            player.x = playerConf.checkpoint.present.x;
            player.y = playerConf.checkpoint.present.y;
        }),
        'check2': this.input.keyboard.addKey('S').on('down', (e) => {
            playerConf.checkpoint.present.x = 1168;
            playerConf.checkpoint.present.y = 48;

            player.x = playerConf.checkpoint.present.x;
            player.y = playerConf.checkpoint.present.y;
        }),
        'check3': this.input.keyboard.addKey('D').on('down', (e) => {
            playerConf.checkpoint.present.x = 1680;
            playerConf.checkpoint.present.y = 880;

            player.x = playerConf.checkpoint.present.x;
            player.y = playerConf.checkpoint.present.y;
        }),
        'check4': this.input.keyboard.addKey('F').on('down', (e) => {
            playerConf.checkpoint.present.x = 2352;
            playerConf.checkpoint.present.y = 880;

            player.x = playerConf.checkpoint.present.x;
            player.y = playerConf.checkpoint.present.y;
        }),
        'finish': this.input.keyboard.addKey('G').on('down', (e) => {
            playerConf.checkpoint.present.x = 2544;
            playerConf.checkpoint.present.y = 112;

            player.x = playerConf.checkpoint.present.x;
            player.y = playerConf.checkpoint.present.y;
        })
    };
}

/**
 * function that add sounds to the game
 * @param game {Phaser.Scene} - game context
 */
function addSounds(game) {
    if (!sounds) sounds = {
        backMusic: game.sound.add('background_music', {
            volume: 0.1,
            loop: true
        }).play(),
        deathSound: game.sound.add('death', {
            volume: 0.3,
            loop: false
        }),
        jumpSound: game.sound.add('jump', {
            volume: 0.5,
            loop: false
        }),
        winSound: game.sound.add('win', {
            volume: 0.7,
            loop: false
        })
    };
}

/**
 * function that adds tilesets to the map
 */
function addTilesets() {
    tilesets.dungeonTileset = map.addTilesetImage('tileset', 'tileset');
    tilesets.itemsTileset = map.addTilesetImage('items', 'items');
    tilesets.decorTileset = map.addTilesetImage('decoration', 'decor');
}

/**
 * function that adds layers to the game
 */
function addLayers() {
    layers.backgroundLayer = map.createStaticLayer('Background', tilesets.dungeonTileset);
    layers.miscLayer = map.createStaticLayer('Misc', [tilesets.dungeonTileset, tilesets.decorTileset]);
    layers.checkpointLayer = map.createDynamicLayer('Checkpoint', tilesets.dungeonTileset);
    layers.tpDoorsLayer = map.createDynamicLayer('TPDoor', tilesets.dungeonTileset);
    layers.mapLayer = map.createDynamicLayer('Map', tilesets.dungeonTileset);
    layers.treasureLayer = map.createDynamicLayer('Treasure', tilesets.itemsTileset);
    layers.potionLayer = map.createDynamicLayer('Potions', tilesets.itemsTileset);
    layers.leverBlocksLayer = map.createDynamicLayer('LeverBlocks', tilesets.dungeonTileset);
    layers.obstaclesLayer = map.createDynamicLayer('Obstacles', tilesets.dungeonTileset);
    layers.climbLayer = map.createDynamicLayer('Climbing', tilesets.dungeonTileset);
    layers.leversLayer = map.createDynamicLayer('Levers', tilesets.dungeonTileset);
}

/**
 * functiin that sets collision calbacks for layers
 * @param game {Phaser.Scene} - game context
 */
function setCollisionsCallbacks(game) {
    layers.mapLayer.setCollisionByExclusion([-1]);
    layers.checkpointLayer.setTileIndexCallback([85], setCheckpoint, game);
    layers.tpDoorsLayer.setTileIndexCallback([159, 183, 207], tpDoor, game);
    layers.treasureLayer.setTileIndexCallback([439, 440], (player, tile) => {
        if (!won) {
            won = true;
            win(game);
        }

    }, game);
    layers.potionLayer.setTileIndexCallback([405, 421, 436], (player, tile) => {
        grabPotion(player, tile, game);
    }, game);
    layers.leverBlocksLayer.setCollisionByExclusion([-1]);

    layers.obstaclesLayer.setTileIndexCallback([167, 190, 192, 215], obstacleKill, game);
    layers.climbLayer.setTileIndexCallback([131, 155], climb, game);
    layers.leversLayer.setTileIndexCallback([117, 119], leverFlip, this);
}

/**
 * function that adds crossbows to the game and sets animations crossbow shooting
 * @param game {Phaser.Scene} - game context
 */
function addCrossbowsAndAnims(game) {
    game.anims.create({
        key: 'crossbow_shoot',
        frames: game.anims.generateFrameNumbers('crossbow', {
            start: 0,
            end: 1
        }),
        frameRate: 10,
        repeat: 0
    });

    mapStuffCoordsLinks.crossbows.left = game.add.group();
    mapStuffCoordsLinks.crossbows.right = game.add.group();

    //left directed crossbows
    mapStuffCoordsLinks.crossbows.sprites.push(game.add.sprite(560, 776, 'crossbow', 0));
    mapStuffCoordsLinks.crossbows.sprites.push(game.add.sprite(560, 552, 'crossbow', 0));
    mapStuffCoordsLinks.crossbows.sprites.push(game.add.sprite(784, 456, 'crossbow', 0));
    mapStuffCoordsLinks.crossbows.sprites.push(game.add.sprite(784, 264, 'crossbow', 0));
    mapStuffCoordsLinks.crossbows.sprites.push(game.add.sprite(1008, 168, 'crossbow', 0));
    mapStuffCoordsLinks.crossbows.sprites.push(game.add.sprite(1008, 120, 'crossbow', 0));
    mapStuffCoordsLinks.crossbows.sprites.push(game.add.sprite(1536, 360, 'crossbow', 0));
    mapStuffCoordsLinks.crossbows.sprites.push(game.add.sprite(1536, 600, 'crossbow', 0));
    mapStuffCoordsLinks.crossbows.sprites.push(game.add.sprite(2672, 856, 'crossbow', 0));
    mapStuffCoordsLinks.crossbows.sprites.push(game.add.sprite(2672, 680, 'crossbow', 0));
    mapStuffCoordsLinks.crossbows.sprites.push(game.add.sprite(2672, 344, 'crossbow', 0));

    for (let i = 0; i < 11; i++) mapStuffCoordsLinks.crossbows.left.add(mapStuffCoordsLinks.crossbows.sprites[i]);

    mapStuffCoordsLinks.crossbows.timers.left = game.time.addEvent({
        delay: mapStuffCoordsLinks.crossbows.arrows.delay,
        callback: shoot,
        args: ['left', game],
        callbackScope: game,
        loop: true
    });

    //right directed crosssbows
    mapStuffCoordsLinks.crossbows.sprites.push(game.add.sprite(1104, 808, 'crossbow', 0).setFlipX(true));
    mapStuffCoordsLinks.crossbows.sprites.push(game.add.sprite(114, 152, 'crossbow', 0).setFlipX(true));
    mapStuffCoordsLinks.crossbows.sprites.push(game.add.sprite(2400, 232, 'crossbow', 0).setFlipX(true));

    for (let i = 11; i < mapStuffCoordsLinks.crossbows.sprites.length; i++)
        mapStuffCoordsLinks.crossbows.right.add(mapStuffCoordsLinks.crossbows.sprites[i]);

    //looped timer for shooting arrows
    mapStuffCoordsLinks.crossbows.timers.right = game.time.addEvent({
        delay: mapStuffCoordsLinks.crossbows.arrows.delay,
        callback: shoot,
        args: ['right', game],
        callbackScope: game,
        loop: true
    });

    mapStuffCoordsLinks.crossbows.arrows.group = game.add.group();
}

/**
 * function which is used to shoot an arrow
 * @param dir {string} - direction
 * @param game {Phaser.Scene} - game context
 */
function shoot(dir, game) {
    if (dir === 'left') {
        for (let i = 0; i < mapStuffCoordsLinks.crossbows.left.getChildren().length; i++) {
            let crossbow = mapStuffCoordsLinks.crossbows.left.getChildren()[i];
            mapStuffCoordsLinks.crossbows.left.getChildren()[i].anims.play('crossbow_shoot', false);

            let arrow = game.physics.add.sprite(crossbow.x - 31, crossbow.y, 'arrow');
            arrow.body.setAllowGravity(false);
            arrow.body.setVelocityX(-mapStuffCoordsLinks.crossbows.arrows.speed);

            mapStuffCoordsLinks.crossbows.arrows.group.add(arrow);
        }
    } else {
        for (let i = 0; i < mapStuffCoordsLinks.crossbows.right.getChildren().length; i++) {
            let crossbow = mapStuffCoordsLinks.crossbows.right.getChildren()[i];
            mapStuffCoordsLinks.crossbows.right.getChildren()[i].anims.play('crossbow_shoot', false);

            let arrow = game.physics.add.sprite(crossbow.x + 31, crossbow.y, 'arrow');
            arrow.setFlipX(true);
            arrow.body.setAllowGravity(false);
            arrow.body.setVelocityX(mapStuffCoordsLinks.crossbows.arrows.speed);

            mapStuffCoordsLinks.crossbows.arrows.group.add(arrow);
        }
    }
}

/**
 * function that is used to set checkpoint when player overlaps with checkpoint and removes checkpoint tile from the map
 * @param player {Phaser.GameObjects.Sprite} - player
 * @param tile {Phaser.Tilemaps.Tile} - checkpoint tile
 */
function setCheckpoint(player, tile) {
    playerConf.checkpoint.present.x = tile.x * 16;
    playerConf.checkpoint.present.y = tile.y * 16;
    layers.checkpointLayer.removeTileAt(tile.x, tile.y);
}

/**
 * function that is used to teleport player from one door to another (works only once, in one direction)
 * @param player {Phaser.GameObjects.Sprite} - player
 * @param tile {Phaser.Tilemaps.Tile} - door tile (not used, default variable)
 */
function tpDoor(player, tile) {
    if (!playerConf.checks.tped) {
        playerConf.checks.tped = true;
        player.x = 1168;
        player.y = 48;
    }
}

/**
 * function that is used when player grabs a potion, sets proper boost (jump, fall, or climb and changes sprites of the
 * player so he can see if potion was grabbed) and removes the potion tile from the map
 * @param player {Phaser.GameObjects.Sprite} - player
 * @param tile {Phaser.Tilemaps.Tile} - potion tile
 */
function grabPotion(player, tile) {
    if (tile.x === mapStuffCoordsLinks.potions.jump.coords.x && tile.y === mapStuffCoordsLinks.potions.jump.coords.y) {
        playerConf.speeds.jumpSpeed += mapStuffCoordsLinks.potions.jump.boost;
        playerConf.anims.present = '_boots';
    } else if (tile.x === mapStuffCoordsLinks.potions.fall.coords.x && tile.y === mapStuffCoordsLinks.potions.fall.coords.y) {
        playerConf.checks.fallBoosted = true;
        playerConf.anims.present = '_boots_cape';
    } else if (tile.x === mapStuffCoordsLinks.potions.climb.coords.x && tile.y === mapStuffCoordsLinks.potions.climb.coords.y) {
        playerConf.speeds.climbSpeed += mapStuffCoordsLinks.potions.climb.boost;
        playerConf.anims.present = '_boots_cape_gauntlets';
    }

    layers.potionLayer.removeTileAt(tile.x, tile.y);
}

/**
 * function that is used when player overlaps with lever tile to open the door (lever can be flipped only once)
 * @param player {Phaser.GameObjects.Sprite} - player
 * @param tile {Phaser.Tilemaps.Tile} - lever tile
 */
function leverFlip(player, tile) {
    if (tile.x === mapStuffCoordsLinks.levers.first.coords.x && tile.y === mapStuffCoordsLinks.levers.first.coords.y &&
        !mapStuffCoordsLinks.levers.first.pulled) {
        mapStuffCoordsLinks.levers.first.pulled = true;
        tile.flipX = true;
        for (var brick in mapStuffCoordsLinks.levers.first.link) {
            layers.leverBlocksLayer.removeTileAt(mapStuffCoordsLinks.levers.first.link[brick][0], mapStuffCoordsLinks.levers.first.link[brick][1]);
        }
    } else if (tile.x === mapStuffCoordsLinks.levers.second.coords.x && tile.y === mapStuffCoordsLinks.levers.second.coords.y &&
        !mapStuffCoordsLinks.levers.second.pulled) {
        mapStuffCoordsLinks.levers.second.pulled = true;
        tile.flipX = true;
        for (var brick in mapStuffCoordsLinks.levers.second.link) {
            layers.leverBlocksLayer.removeTileAt(mapStuffCoordsLinks.levers.second.link[brick][0], mapStuffCoordsLinks.levers.second.link[brick][1]);
        }
    } else if (tile.x === mapStuffCoordsLinks.levers.third.coords.x && tile.y === mapStuffCoordsLinks.levers.third.coords.y &&
        !mapStuffCoordsLinks.levers.third.pulled) {
        mapStuffCoordsLinks.levers.third.pulled = true;
        tile.flipX = true;
        for (var brick in mapStuffCoordsLinks.levers.third.link) {
            layers.leverBlocksLayer.removeTileAt(mapStuffCoordsLinks.levers.third.link[brick][0], mapStuffCoordsLinks.levers.third.link[brick][1]);
        }
    } else if (tile.x === mapStuffCoordsLinks.levers.fourth.coords.x && tile.y === mapStuffCoordsLinks.levers.fourth.coords.y &&
        !mapStuffCoordsLinks.levers.fourth.pulled) {
        mapStuffCoordsLinks.levers.fourth.pulled = true;
        tile.flipX = true;
        for (var brick in mapStuffCoordsLinks.levers.fourth.link) {
            layers.leverBlocksLayer.removeTileAt(mapStuffCoordsLinks.levers.fourth.link[brick][0], mapStuffCoordsLinks.levers.fourth.link[brick][1]);
        }
    }
}

/**
 * function that is used when player collides with arrow and kills him, arrow is destroyed too
 * @param player {Phaser.GameObjects.Sprite} - player
 * @param arrow {Phaser.GameObjects.Sprite} - arrow object
 */
function arrowKill(player, arrow) {
    arrow.destroy();
    kill();
}

/**
 * function that basically does killing, but specifically used when player is killed by an obstacle to make code more
 * structured and understandable
 */
function obstacleKill() {
    kill();
}

/**
 * funciton that is used when player dies, teleports player to last checkpoint and plays death sound
 */
function kill() {
    player.x = playerConf.checkpoint.present.x;
    player.y = playerConf.checkpoint.present.y;
    sounds.deathSound.play();
}

/**
 * function that is used to set checkers for jumping and climbing when player starts climbing
 * @param player {Phaser.GameObjects.Sprite} - player
 * @param tile {Phaser.Tilemaps.Tile} - climbing tile (chain)
 */
function climb(player, tile) {
    playerConf.checks.isClimbing = true;
    playerConf.checks.isJumping = false;
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
    });
    game.anims.create({
        key: 'player_run',
        frames: game.anims.generateFrameNumbers('player', {
            start: 8,
            end: 13
        }),
        frameRate: playerConf.animSpeeds.runFPS,
        repeat: -1
    });
    game.anims.create({
        key: 'player_duck',
        frames: game.anims.generateFrameNumbers('player', {
            start: 4,
            end: 7
        }),
        frameRate: playerConf.animSpeeds.idleFPS,
        repeat: -1
    });
    game.anims.create({
        key: 'player_jump',
        frames: game.anims.generateFrameNumbers('player', {
            start: 14,
            end: 21
        }),
        frameRate: playerConf.animSpeeds.jumpFPS,
        repeat: 0
    });
    game.anims.create({
        key: 'player_fall',
        frames: game.anims.generateFrameNumbers('player', {
            start: 20,
            end: 21
        }),
        frameRate: playerConf.animSpeeds.jumpFPS,
        repeat: -1
    });
    game.anims.create({
        key: 'player_climb',
        frames: game.anims.generateFrameNumbers('player', {
            start: 22,
            end: 25
        }),
        frameRate: playerConf.animSpeeds.idleFPS,
        repeat: -1
    });

    game.anims.create({
        key: 'player_boots_idle',
        frames: game.anims.generateFrameNumbers('player_jump', {
            start: 0,
            end: 3
        }),
        frameRate: playerConf.animSpeeds.idleFPS,
        repeat: -1
    });
    game.anims.create({
        key: 'player_boots_run',
        frames: game.anims.generateFrameNumbers('player_jump', {
            start: 8,
            end: 13
        }),
        frameRate: playerConf.animSpeeds.runFPS,
        repeat: -1
    });
    game.anims.create({
        key: 'player_boots_duck',
        frames: game.anims.generateFrameNumbers('player_jump', {
            start: 4,
            end: 7
        }),
        frameRate: playerConf.animSpeeds.idleFPS,
        repeat: -1
    });
    game.anims.create({
        key: 'player_boots_jump',
        frames: game.anims.generateFrameNumbers('player_jump', {
            start: 14,
            end: 21
        }),
        frameRate: playerConf.animSpeeds.jumpFPS,
        repeat: 0
    });
    game.anims.create({
        key: 'player_boots_fall',
        frames: game.anims.generateFrameNumbers('player_jump', {
            start: 20,
            end: 21
        }),
        frameRate: playerConf.animSpeeds.jumpFPS,
        repeat: -1
    });
    game.anims.create({
        key: 'player_boots_climb',
        frames: game.anims.generateFrameNumbers('player_jump', {
            start: 22,
            end: 25
        }),
        frameRate: playerConf.animSpeeds.idleFPS,
        repeat: -1
    });

    game.anims.create({
        key: 'player_boots_cape_idle',
        frames: game.anims.generateFrameNumbers('player_jump_fall', {
            start: 0,
            end: 3
        }),
        frameRate: playerConf.animSpeeds.idleFPS,
        repeat: -1
    });
    game.anims.create({
        key: 'player_boots_cape_run',
        frames: game.anims.generateFrameNumbers('player_jump_fall', {
            start: 8,
            end: 13
        }),
        frameRate: playerConf.animSpeeds.runFPS,
        repeat: -1
    });
    game.anims.create({
        key: 'player_boots_cape_duck',
        frames: game.anims.generateFrameNumbers('player_jump_fall', {
            start: 4,
            end: 7
        }),
        frameRate: playerConf.animSpeeds.idleFPS,
        repeat: -1
    });
    game.anims.create({
        key: 'player_boots_cape_jump',
        frames: game.anims.generateFrameNumbers('player_jump_fall', {
            start: 14,
            end: 21
        }),
        frameRate: playerConf.animSpeeds.jumpFPS,
        repeat: 0
    });
    game.anims.create({
        key: 'player_boots_cape_fall',
        frames: game.anims.generateFrameNumbers('player_jump_fall', {
            start: 20,
            end: 21
        }),
        frameRate: playerConf.animSpeeds.jumpFPS,
        repeat: -1
    });
    game.anims.create({
        key: 'player_boots_cape_climb',
        frames: game.anims.generateFrameNumbers('player_jump_fall', {
            start: 22,
            end: 25
        }),
        frameRate: playerConf.animSpeeds.idleFPS,
        repeat: -1
    });

    game.anims.create({
        key: 'player_boots_cape_gauntlets_idle',
        frames: game.anims.generateFrameNumbers('player_jump_fall_climb', {
            start: 0,
            end: 3
        }),
        frameRate: playerConf.animSpeeds.idleFPS,
        repeat: -1
    });
    game.anims.create({
        key: 'player_boots_cape_gauntlets_run',
        frames: game.anims.generateFrameNumbers('player_jump_fall_climb', {
            start: 8,
            end: 13
        }),
        frameRate: playerConf.animSpeeds.runFPS,
        repeat: -1
    });
    game.anims.create({
        key: 'player_boots_cape_gauntlets_duck',
        frames: game.anims.generateFrameNumbers('player_jump_fall_climb', {
            start: 4,
            end: 7
        }),
        frameRate: playerConf.animSpeeds.idleFPS,
        repeat: -1
    });
    game.anims.create({
        key: 'player_boots_cape_gauntlets_jump',
        frames: game.anims.generateFrameNumbers('player_jump_fall_climb', {
            start: 14,
            end: 21
        }),
        frameRate: playerConf.animSpeeds.jumpFPS,
        repeat: 0
    });
    game.anims.create({
        key: 'player_boots_cape_gauntlets_fall',
        frames: game.anims.generateFrameNumbers('player_jump_fall_climb', {
            start: 20,
            end: 21
        }),
        frameRate: playerConf.animSpeeds.jumpFPS,
        repeat: -1
    });
    game.anims.create({
        key: 'player_boots_cape_gauntlets_climb',
        frames: game.anims.generateFrameNumbers('player_jump_fall_climb', {
            start: 22,
            end: 25
        }),
        frameRate: playerConf.animSpeeds.idleFPS,
        repeat: -1
    });
}

/**
 * function that is used to add colliders and overlaps to the game
 * @param game {Phaser.Scene} - game context
 */
function addCollideOverlap(game) {
    game.physics.add.collider(layers.mapLayer, player);
    game.physics.add.overlap(layers.checkpointLayer, player);
    game.physics.add.overlap(layers.tpDoorsLayer, player);
    game.physics.add.overlap(layers.treasureLayer, player);
    game.physics.add.overlap(layers.potionLayer, player);
    game.physics.add.collider(layers.leverBlocksLayer, player);

    game.physics.add.overlap(player, layers.obstaclesLayer);
    game.physics.add.overlap(player, layers.climbLayer);
    game.physics.add.overlap(player, layers.leversLayer);

    game.physics.add.collider(mapStuffCoordsLinks.crossbows.arrows.group, layers.mapLayer, (arrow, map) => {
        arrow.destroy();
    });
    game.physics.add.collider(player, mapStuffCoordsLinks.crossbows.arrows.group, arrowKill);
}

/**
 * function that is called every frame of the game (if I'm not mistaken), used to check different player states, changes
 * animations because of different states, checks controls
 */
function update() {
    player.body.setVelocityX(0);
    playerConf.checks.onGround = player.body.onFloor();

    if (playerConf.checks.onGround || playerConf.checks.isClimbing) {
        playerConf.checks.isJumping = false;
        spacebarText.visible = false;
    } else if (playerConf.checks.fallBoosted && !playerConf.checks.isClimbing) {
        spacebarText.visible = true;
        if (cursors.space.isDown) player.body.setVelocityY(this.physics.world.gravity.y + mapStuffCoordsLinks.potions.fall.boost);
    }

    if (playerConf.checks.isClimbing) {
        player.body.setAllowGravity(false);
        player.body.setVelocityY(0);
    } else {
        player.setFlipY(false);
        player.body.setAllowGravity(true);
        if (!playerConf.checks.onGround && !playerConf.checks.isJumping) {
            player.anims.play('player' + playerConf.anims.present + '_fall', true);
        }
    }

    if (cursors.up.isDown) {
        if (cursors.left.isDown) {
            leftRightMove('left');
        }
        if (cursors.right.isDown) {
            leftRightMove('right');
        }

        if (playerConf.checks.onGround) {
            jump();
        }
        if (playerConf.checks.isClimbing) {
            player.setFlipY(false);
            player.body.setVelocityY(playerConf.speeds.climbSpeed);
            player.anims.play('player' + playerConf.anims.present + '_climb', true);
        }
    } else if (cursors.left.isDown) {
        if (cursors.up.isDown && playerConf.checks.onGround) {
            jump();
        }
        leftRightMove('left');
    } else if (cursors.right.isDown) {
        if (cursors.up.isDown && playerConf.checks.onGround) {
            jump();
        }
        leftRightMove('right');
    } else if (cursors.down.isDown) {
        if (playerConf.checks.onGround) {
            player.anims.play('player' + playerConf.anims.present + '_duck', true);
        }
        if (playerConf.checks.isClimbing) {
            player.setFlipY(true);
            player.body.setVelocityY(-playerConf.speeds.climbSpeed);
            player.anims.play('player' + playerConf.anims.present + '_climb', true);
        }
    } else {
        playerConf.speeds.velocityX = 0;

        if (playerConf.checks.onGround) {
            player.anims.play('player' + playerConf.anims.present + '_idle', true);
        } else if (playerConf.checks.isClimbing) {
            player.anims.play('player' + playerConf.anims.present + '_climb');
        }
    }

    playerConf.checks.isClimbing = false;
}

/**
 * function that is used when player jumps, sets x and y velocities properly changes animation to jumping one, plays
 * jump sound
 */
function jump() {
    player.body.setVelocityX(playerConf.speeds.velocityX);
    player.body.setVelocityY(playerConf.speeds.jumpSpeed);
    player.anims.play('player' + playerConf.anims.present + '_jump');
    playerConf.checks.isJumping = true;
    sounds.jumpSound.play();
}

/**
 * function that is used when player is running, changes animation, flips character sprite depending on direction, sets
 * proper velocity
 * @param dir {string} - direction
 */
function leftRightMove(dir) {
    var dirs = {
        'left': {
            'flip': true,
            'speed': -playerConf.speeds.speed
        },
        'right': {
            'flip': false,
            'speed': playerConf.speeds.speed
        }
    };
    player.setFlipX(dirs[dir]['flip']);
    player.body.setVelocityX(dirs[dir]['speed']);
    playerConf.speeds.velocityX = dirs[dir]['speed'];

    if (playerConf.checks.onGround) {
        player.anims.play('player' + playerConf.anims.present + '_run', true);
    } else if (playerConf.checks.isClimbing) {
        player.anims.play('player' + playerConf.anims.present + '_climb', true);
    }
}

/**
 * function that is called when player wins the game, puts winning text, adds keyboard key that restarts the game
 * @param game {Phaser.Scene} - game context
 */
function win(game) {
    sounds.winSound.play();

    var winTextStyle = {
        fontFamily: 'Sans Serif',
        fontSize: '32px',
        color: '#fff',
        align: 'center'
    };
    var winText = game.add.text(game.cameras.main.centerX, game.cameras.main.centerY, "You Win!!", winTextStyle).setScrollFactor(0).setOrigin(0.5, 0.5);

    var restartTextStyle = {
        fontFamily: 'Sans Serif',
        fontSize: '16px',
        color: '#fff',
        align: 'center'
    };
    var restartText = game.add.text(game.cameras.main.centerX, game.cameras.main.centerY + 40, "Press R to restart", restartTextStyle).setScrollFactor(0).setOrigin(0.5, 0.5);

    var R = game.input.keyboard.addKey('R');
    R.on('down', (e) => {
        window.location.href = 'index.html';
    });
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
};

var game = new Phaser.Game(config);
