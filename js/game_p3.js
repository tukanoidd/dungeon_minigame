var gravity = 300;

var player;
var playerProps = {
    'speeds': {
        speed: 250,
        velocityX: 0,
        jumpSpeed: -230,
        climbSpeed: -70
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

var cursors;

var map;
var layers = {};
var tilesets = {};

var mapStuffCoordsLinks = {
    'potions': {
        'jump': {
            'coords': {
                x: 37,
                y: 38
            },
            'boost': -50
        },
        'fall': {
            'coords': {
                x: 90,
                y: 7
            },
            'boost': -50
        },
        'climb': {
            'coords': {
                x: 145,
                y: 56
            },
            'boost': -50
        }
    },
    'levers': {
        'first': {
            'coords': {
                x: 1,
                y: 34
            },
            'link': [[35, 35], [35, 36], [35, 37], [35, 38]],
            'pulled': false
        },
        'second': {
            'coords': {
                x: 62,
                y: 2
            },
            'link': [[43, 1], [43, 2], [43, 3], [43, 4]],
            'pulled': false
        },
        'third': {
            'coords': {
                x: 74,
                y: 43
            },
            'link': [[96, 49], [96, 50], [96, 51], [96, 52]],
            'pulled': false
        },
        'fourth': {
            'coords': {
                x: 97,
                y: 55
            },
            'link': [[142, 52], [142, 53], [142, 54], [142, 55], [142, 56]],
            'pulled': false
        },
    }
};

function preload() {
    this.load.spritesheet(
        'player',
        'assets/player_spritesheet.png',
        {
            frameWidth: 50,
            frameHeight: 37
        }
    );
    this.load.spritesheet(
        'player_jump',
        'assets/player_spritesheet_boots.png',
        {
            frameWidth: 50,
            frameHeight: 37
        }
    );
    this.load.spritesheet(
        'player_jump_fall',
        'assets/player_spritesheet_boots_cape.png',
        {
            frameWidth: 50,
            frameHeight: 37
        }
    );
    this.load.spritesheet(
        'player_jump_fall_climb',
        'assets/player_spritesheet_boots_cape_gauntlets.png',
        {
            frameWidth: 50,
            frameHeight: 37
        }
    );
    this.load.image('tileset', 'assets/tileset.png');
    this.load.image('items', 'assets/items.png');
    this.load.image('decor', 'assets/decor.png');
    this.load.tilemapTiledJSON('map', 'assets/map3.json');
}

function create() {
    cursors = this.input.keyboard.createCursorKeys();

    map = this.add.tilemap('map', 32, 32);

    addTilesets();
    addLayers();

    setCollisionsCallbacks(this);

    this.physics.world.bounds.width = layers.mapLayer.width;
    this.physics.world.bounds.height = layers.mapLayer.height;

    player = this.physics.add.sprite(playerProps.checkpoint.default.x, playerProps.checkpoint.default.y, 'player', 0);
    player.body.setSize(25, 37);
    player.setCollideWorldBounds(true);

    addPlayerAnims(this);

    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.startFollow(player);
    this.cameras.main.zoom = 2;

    addCollideOverlap(this);
}

function addTilesets() {
    tilesets.dungeonTileset = map.addTilesetImage('tileset', 'tileset');
    tilesets.itemsTileset = map.addTilesetImage('items', 'items');
    tilesets.decorTileset = map.addTilesetImage('decoration', 'decor');
}

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

function setCollisionsCallbacks(game) {
    layers.mapLayer.setCollisionByExclusion([-1]);
    layers.checkpointLayer.setTileIndexCallback([85], setCheckpoint, game);
    layers.tpDoorsLayer.setTileIndexCallback([159, 183, 207], tpDoor, game);
    //treasure
    layers.potionLayer.setTileIndexCallback([405, 421, 436], (player, tile) => {
        grabPotion(player, tile, game);
    }, game);
    layers.leverBlocksLayer.setCollisionByExclusion([-1]);

    layers.obstaclesLayer.setTileIndexCallback([167, 190, 192, 215], obstacleKill, game);
    layers.climbLayer.setTileIndexCallback([131, 155], climb, game);
    layers.leversLayer.setTileIndexCallback([117, 119], leverFlip, this);
}

function setCheckpoint(player, tile) {
    playerProps.checkpoint.present.x = tile.x * 16;
    playerProps.checkpoint.present.y = tile.y * 16;
    layers.checkpointLayer.removeTileAt(tile.x, tile.y);
}

function tpDoor(player, tile) {
    if (!playerProps.checks.tped) {
        playerProps.checks.tped = true;
        player.x = 1168;
        player.y = 48;
    }
}

function grabPotion(player, tile, game) {
    if (tile.x === mapStuffCoordsLinks.potions.jump.coords.x && tile.y === mapStuffCoordsLinks.potions.jump.coords.y) {
        playerProps.speeds.jumpSpeed += mapStuffCoordsLinks.potions.jump.boost;
        playerProps.anims.present = '_boots';
    } else if (tile.x === mapStuffCoordsLinks.potions.fall.coords.x && tile.y === mapStuffCoordsLinks.potions.fall.coords.y) {
        game.physics.world.gravity.y += mapStuffCoordsLinks.potions.fall.boost;
        playerProps.anims.present = '_boots_cape';
    } else if (tile.x === mapStuffCoordsLinks.potions.climb.coords.x && tile.y === mapStuffCoordsLinks.potions.climb.coords.y) {
        playerProps.speeds.climbSpeed += mapStuffCoordsLinks.potions.climb.boost;
        playerProps.anims.present = '_boots_cape_gauntlets';
    }

    layers.potionLayer.removeTileAt(tile.x, tile.y);
}

function leverFlip(player, tile) {
    if (tile.x === mapStuffCoordsLinks.levers.first.coords.x && tile.y === mapStuffCoordsLinks.levers.first.coords.y
        && !mapStuffCoordsLinks.levers.first.pulled) {
        mapStuffCoordsLinks.levers.first.pulled = true;
        tile.flipX = true;
        for (var brick in mapStuffCoordsLinks.levers.first.link) {
            layers.leverBlocksLayer.removeTileAt(mapStuffCoordsLinks.levers.first.link[brick][0], mapStuffCoordsLinks.levers.first.link[brick][1]);
        }
    } else if (tile.x === mapStuffCoordsLinks.levers.second.coords.x && tile.y === mapStuffCoordsLinks.levers.second.coords.y
        && !mapStuffCoordsLinks.levers.second.pulled) {
        mapStuffCoordsLinks.levers.second.pulled = true;
        tile.flipX = true;
        for (var brick in mapStuffCoordsLinks.levers.second.link) {
            layers.leverBlocksLayer.removeTileAt(mapStuffCoordsLinks.levers.second.link[brick][0], mapStuffCoordsLinks.levers.second.link[brick][1]);
        }
    } else if (tile.x === mapStuffCoordsLinks.levers.third.coords.x && tile.y === mapStuffCoordsLinks.levers.third.coords.y
        && !mapStuffCoordsLinks.levers.third.pulled) {
        mapStuffCoordsLinks.levers.third.pulled = true;
        tile.flipX = true;
        for (var brick in mapStuffCoordsLinks.levers.third.link) {
            layers.leverBlocksLayer.removeTileAt(mapStuffCoordsLinks.levers.third.link[brick][0], mapStuffCoordsLinks.levers.third.link[brick][1]);
        }
    } else if (tile.x === mapStuffCoordsLinks.levers.fourth.coords.x && tile.y === mapStuffCoordsLinks.levers.fourth.coords.y
        && !mapStuffCoordsLinks.levers.fourth.pulled) {
        mapStuffCoordsLinks.levers.fourth.pulled = true;
        tile.flipX = true;
        for (var brick in mapStuffCoordsLinks.levers.fourth.link) {
            layers.leverBlocksLayer.removeTileAt(mapStuffCoordsLinks.levers.fourth.link[brick][0], mapStuffCoordsLinks.levers.fourth.link[brick][1]);
        }
    }
}

function obstacleKill(player, tile) {
    player.x = playerProps.checkpoint.present.x;
    player.y = playerProps.checkpoint.present.y;
}

function reset(game) {
    game.scene.restart();
}

function climb(player, tile) {
    playerProps.checks.isClimbing = true;
    playerProps.checks.isJumping = false;

    return false;
}

function addPlayerAnims(game) {
    game.anims.create({
        key: 'player_idle',
        frames: game.anims.generateFrameNumbers('player', {start: 0, end: 3}),
        frameRate: playerProps.animSpeeds.idleFPS,
        repeat: -1
    });
    game.anims.create({
        key: 'player_run',
        frames: game.anims.generateFrameNumbers('player', {start: 8, end: 13}),
        frameRate: playerProps.animSpeeds.runFPS,
        repeat: -1
    });
    game.anims.create({
        key: 'player_duck',
        frames: game.anims.generateFrameNumbers('player', {start: 4, end: 7}),
        frameRate: playerProps.animSpeeds.idleFPS,
        repeat: -1
    });
    game.anims.create({
        key: 'player_jump',
        frames: game.anims.generateFrameNumbers('player', {start: 14, end: 21}),
        frameRate: playerProps.animSpeeds.jumpFPS,
        repeat: 0
    });
    game.anims.create({
        key: 'player_fall',
        frames: game.anims.generateFrameNumbers('player', {start: 20, end: 21}),
        frameRate: playerProps.animSpeeds.jumpFPS,
        repeat: -1
    });
    game.anims.create({
        key: 'player_climb',
        frames: game.anims.generateFrameNumbers('player', {start: 22, end: 25}),
        frameRate: playerProps.animSpeeds.idleFPS,
        repeat: -1
    });

    game.anims.create({
        key: 'player_boots_idle',
        frames: game.anims.generateFrameNumbers('player_jump', {start: 0, end: 3}),
        frameRate: playerProps.animSpeeds.idleFPS,
        repeat: -1
    });
    game.anims.create({
        key: 'player_boots_run',
        frames: game.anims.generateFrameNumbers('player_jump', {start: 8, end: 13}),
        frameRate: playerProps.animSpeeds.runFPS,
        repeat: -1
    });
    game.anims.create({
        key: 'player_boots_duck',
        frames: game.anims.generateFrameNumbers('player_jump', {start: 4, end: 7}),
        frameRate: playerProps.animSpeeds.idleFPS,
        repeat: -1
    });
    game.anims.create({
        key: 'player_boots_jump',
        frames: game.anims.generateFrameNumbers('player_jump', {start: 14, end: 21}),
        frameRate: playerProps.animSpeeds.jumpFPS,
        repeat: 0
    });
    game.anims.create({
        key: 'player_boots_fall',
        frames: game.anims.generateFrameNumbers('player_jump', {start: 20, end: 21}),
        frameRate: playerProps.animSpeeds.jumpFPS,
        repeat: -1
    });
    game.anims.create({
        key: 'player_boots_climb',
        frames: game.anims.generateFrameNumbers('player_jump', {start: 22, end: 25}),
        frameRate: playerProps.animSpeeds.idleFPS,
        repeat: -1
    });

    game.anims.create({
        key: 'player_boots_cape_idle',
        frames: game.anims.generateFrameNumbers('player_jump_fall', {start: 0, end: 3}),
        frameRate: playerProps.animSpeeds.idleFPS,
        repeat: -1
    });
    game.anims.create({
        key: 'player_boots_cape_run',
        frames: game.anims.generateFrameNumbers('player_jump_fall', {start: 8, end: 13}),
        frameRate: playerProps.animSpeeds.runFPS,
        repeat: -1
    });
    game.anims.create({
        key: 'player_boots_cape_duck',
        frames: game.anims.generateFrameNumbers('player_jump_fall', {start: 4, end: 7}),
        frameRate: playerProps.animSpeeds.idleFPS,
        repeat: -1
    });
    game.anims.create({
        key: 'player_boots_cape_jump',
        frames: game.anims.generateFrameNumbers('player_jump_fall', {start: 14, end: 21}),
        frameRate: playerProps.animSpeeds.jumpFPS,
        repeat: 0
    });
    game.anims.create({
        key: 'player_boots_cape_fall',
        frames: game.anims.generateFrameNumbers('player_jump_fall', {start: 20, end: 21}),
        frameRate: playerProps.animSpeeds.jumpFPS,
        repeat: -1
    });
    game.anims.create({
        key: 'player_boots_cape_climb',
        frames: game.anims.generateFrameNumbers('player_jump_fall', {start: 22, end: 25}),
        frameRate: playerProps.animSpeeds.idleFPS,
        repeat: -1
    });

    game.anims.create({
        key: 'player_boots_cape_gauntlets_idle',
        frames: game.anims.generateFrameNumbers('player_jump_fall_climb', {start: 0, end: 3}),
        frameRate: playerProps.animSpeeds.idleFPS,
        repeat: -1
    });
    game.anims.create({
        key: 'player_boots_cape_gauntlets_run',
        frames: game.anims.generateFrameNumbers('player_jump_fall_climb', {start: 8, end: 13}),
        frameRate: playerProps.animSpeeds.runFPS,
        repeat: -1
    });
    game.anims.create({
        key: 'player_boots_cape_gauntlets_duck',
        frames: game.anims.generateFrameNumbers('player_jump_fall_climb', {start: 4, end: 7}),
        frameRate: playerProps.animSpeeds.idleFPS,
        repeat: -1
    });
    game.anims.create({
        key: 'player_boots_cape_gauntlets_jump',
        frames: game.anims.generateFrameNumbers('player_jump_fall_climb', {start: 14, end: 21}),
        frameRate: playerProps.animSpeeds.jumpFPS,
        repeat: 0
    });
    game.anims.create({
        key: 'player_boots_cape_gauntlets_fall',
        frames: game.anims.generateFrameNumbers('player_jump_fall_climb', {start: 20, end: 21}),
        frameRate: playerProps.animSpeeds.jumpFPS,
        repeat: -1
    });
    game.anims.create({
        key: 'player_boots_cape_gauntlets_climb',
        frames: game.anims.generateFrameNumbers('player_jump_fall_climb', {start: 22, end: 25}),
        frameRate: playerProps.animSpeeds.idleFPS,
        repeat: -1
    });
}

function addCollideOverlap(game) {
    game.physics.add.collider(layers.mapLayer, player);
    game.physics.add.overlap(layers.checkpointLayer, player);
    game.physics.add.overlap(layers.tpDoorsLayer, player);
    //treasure
    game.physics.add.overlap(layers.potionLayer, player);
    game.physics.add.collider(layers.leverBlocksLayer, player);

    game.physics.add.overlap(player, layers.obstaclesLayer);
    game.physics.add.overlap(player, layers.climbLayer);
    game.physics.add.overlap(player, layers.leversLayer);
}

function update() {
    player.body.setVelocityX(0);
    playerProps.checks.onGround = player.body.onFloor();

    if (playerProps.checks.onGround) {
        playerProps.checks.isJumping = false;
    }

    if (playerProps.checks.isClimbing) {
        player.body.setAllowGravity(false);
        player.body.setVelocityY(0);
    } else {
        player.setFlipY(false);
        player.body.setAllowGravity(true);
        if (!playerProps.checks.onGround && !playerProps.checks.isJumping) {
            player.anims.play('player'+playerProps.anims.present+'_fall', true);
        }
    }

    if (cursors.up.isDown) {
        if (cursors.left.isDown) {
            leftRightMove('left');
        }
        if (cursors.right.isDown) {
            leftRightMove('right');
        }

        if (playerProps.checks.onGround) {
            jump();
        }
        if (playerProps.checks.isClimbing) {
            player.setFlipY(false);
            player.body.setVelocityY(playerProps.speeds.climbSpeed);
            player.anims.play('player'+playerProps.anims.present+'_climb', true);
        }
    } else if (cursors.left.isDown) {
        if (cursors.up.isDown && playerProps.checks.onGround) {
            jump();
        }
        leftRightMove('left');
    } else if (cursors.right.isDown) {
        if (cursors.up.isDown && playerProps.checks.onGround) {
            jump();
        }
        leftRightMove('right');
    } else if (cursors.down.isDown) {
        if (playerProps.checks.onGround) {
            player.anims.play('player'+playerProps.anims.present+'_duck', true);
        }
        if (playerProps.checks.isClimbing) {
            player.setFlipY(true);
            player.body.setVelocityY(-playerProps.speeds.climbSpeed);
            player.anims.play('player'+playerProps.anims.present+'_climb', true);
        }
    } else {
        playerProps.speeds.velocityX = 0;

        if (playerProps.checks.onGround) {
            player.anims.play('player'+playerProps.anims.present+'_idle', true);
        } else if (playerProps.checks.isClimbing) {
            player.anims.play('player'+playerProps.anims.present+'_climbing');
        }
    }

    playerProps.checks.isClimbing = false;
}

function jump() {
    player.body.setVelocityX(playerProps.speeds.velocityX);
    player.body.setVelocityY(playerProps.speeds.jumpSpeed);
    player.anims.play('player'+playerProps.anims.present+'_jump');
    playerProps.checks.isJumping = true;
}

function leftRightMove(dir) {
    var dirs = {
        'left': {
            'flip': true,
            'speed': -playerProps.speeds.speed
        },
        'right': {
            'flip': false,
            'speed': playerProps.speeds.speed
        }
    };
    player.setFlipX(dirs[dir]['flip']);
    player.body.setVelocityX(dirs[dir]['speed']);
    playerProps.speeds.velocityX = dirs[dir]['speed'];

    if (playerProps.checks.onGround) {
        player.anims.play('player'+playerProps.anims.present+'_run', true);
    } else if (playerProps.checks.isClimbing) {
        player.anims.play('player'+playerProps.anims.present+'_climb', true);
    }
}

var config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: {
                y: 250
            },
            debug: true
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
