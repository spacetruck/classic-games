import Phaser from "phaser";
import { THEME } from "./config.js";
import { HexScene } from "./scene/HexScene.js";

const config = {
  type: Phaser.AUTO,
  parent: "app",
  width: 960,
  height: 720,
  backgroundColor: THEME.colors.pageBackground,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [HexScene]
};

new Phaser.Game(config);
