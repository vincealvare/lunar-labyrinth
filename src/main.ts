import { Game as MainGame } from './scenes/Game';
import { TitleScreen } from './scenes/TitleScreen';

import { Game, Types } from "phaser";

const config: Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 608,
    height: 530,
    parent: 'game-container',
    backgroundColor: '#000000',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { x: 0 , y: 0 },
            fps: 120,
            debug: false
        }
    },
    scene: [
        TitleScreen,
        MainGame
    ]
};

export default new Game(config);
