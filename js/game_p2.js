var game = new Phaser.Game(
    window.innerWidth,
    window.innerHeight,
    Phaser.AUTO,
    '',
    {
        preload: preload,
        update: update,
        create: create,
        render: render
    }
);

function preload() {
    game.load.spritesheet(
        'player',
        'assets/dungeon/player_spritesheet.png',
        50,
        37
    );
    game.load.image('tileset', 'assets/dungeon/tileset.png');
    game.load.tilemap(
        'map',
        'assets/dungeon/map.json',
        null,
        Phaser.Tilemap.TILED_JSON
    );
}

var gravity = 100;
var direction = 'right';
var velocityX = 0;
var isJumping = false;
var cursors;
var speed;
var runFPS;
var jumpFPS;
var idleFPS;

var map;
var dungeonTileset;
var backgroundLayer;
var mapLayer;
var miscLayer;

var player;

function create() {
    game.physics.startSystem(Phaser.Physics.ARCADE);
    game.physics.arcade.gravity.y = 250;

    cursors = game.input.keyboard.createCursorKeys();
    speed = 250;
    runFPS = 15;
    jumpFPS = 10;
    idleFPS = 5;

    map = game.add.tilemap('map', 32, 32);
    dungeonTileset = map.addTilesetImage('tileset', 'tileset');

    backgroundLayer = map.createLayer('Background');
    mapLayer = map.createLayer('Map');
    miscLayer = map.createLayer('Misc');

    mapLayer.resizeWorld();

    player = game.add.sprite(73, 380, 'player', 0);
    player.anchor.setTo(0.5, 0.5);
    game.physics.enable(player, Phaser.Physics.ARCADE);
    player.body.collideWorldBounds = true;

    map.setCollisionByExclusion([-1], true, 'Map');

    addPlayerAnims();

    game.camera.follow(player, Phaser.Camera.FOLLOW_PLATFORMER);
}

function addPlayerAnims() {
    player.animations.add('player_idle', [0, 1, 2, 3], idleFPS, true);
    player.animations.add('player_run', [8, 9, 10, 11, 12, 13], runFPS, true);
    player.animations.add('player_duck', [4, 5, 6, 7], idleFPS, true);
    player.animations.add('player_jump', [16, 17, 18, 19, 20, 21, 22, 23], jumpFPS, false);
}

function update() {
    game.physics.arcade.collide(player, mapLayer);
    player.body.velocity.x = 0;

    if (player.body.onFloor()) {
        isJumping = false;
    }

    if (cursors.up.isDown) {
        if (cursors.right.isDown || cursors.left.isDown) { player.body.velocity.x = velocityX; }

        if (!isJumping) {
            isJumping = true;
            player.animations.play('player_jump');
            player.body.velocity.y = -250;
        }
    } else if (cursors.left.isDown) {
        if (direction !== 'left') {
            direction = 'left';
            player.scale.x = -1;
        }

        if (!isJumping) {
            player.animations.play('player_run');
        }
        player.body.velocity.x = -speed;
        velocityX = -speed;
    } else if (cursors.down.isDown) {
        if (!isJumping) {
            player.animations.play('player_duck');
        }
    } else if (cursors.right.isDown) {
        if (direction !== 'right') {
            direction = 'right';
            player.scale.x = 1;
        }

        if (!isJumping) {
            player.animations.play('player_run');
        }

        player.body.velocity.x = speed;
        velocityX = speed;
    } else {
        if (!isJumping) {
            isJumping = false;
            player.animations.play('player_idle');
            velocityX = 0;
        }
    }
}

function render() {
    game.debug.body(player);
}
