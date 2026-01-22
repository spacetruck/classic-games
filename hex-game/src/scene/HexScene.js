import Phaser from "phaser";
import { THEME } from "../config.js";

export class HexScene extends Phaser.Scene {
  constructor() {
    super("HexScene");
    this.board = [];
    this.cells = [];
    this.currentPlayer = 1;
    this.gameOver = false;
    this.statusText = null;
    this.playerText = null;
  }

  create() {
    const { boardSize, sizes, colors } = THEME;
    const radius = sizes.hexRadius;
    const hexWidth = Math.sqrt(3) * radius;
    const hexHeight = 2 * radius;

    // Axial coordinates (q, r) where q is column and r is row.
    const axialToPixel = (q, r) => ({
      x: radius * Math.sqrt(3) * (q + r / 2),
      y: radius * 1.5 * r
    });

    const corners = this.getHexCorners(radius);
    const colorsHex = {
      cellFill: this.colorToHex(colors.cellFill),
      cellHover: this.colorToHex(colors.cellHover),
      gridLine: this.colorToHex(colors.gridLine),
      boardBackground: this.colorToHex(colors.boardBackground),
      red: this.colorToHex(colors.red),
      yellow: this.colorToHex(colors.yellow)
    };

    const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    for (let r = 0; r < boardSize; r += 1) {
      for (let q = 0; q < boardSize; q += 1) {
        const point = axialToPixel(q, r);
        bounds.minX = Math.min(bounds.minX, point.x - hexWidth / 2);
        bounds.maxX = Math.max(bounds.maxX, point.x + hexWidth / 2);
        bounds.minY = Math.min(bounds.minY, point.y - hexHeight / 2);
        bounds.maxY = Math.max(bounds.maxY, point.y + hexHeight / 2);
      }
    }

    const boardWidth = bounds.maxX - bounds.minX;
    const boardHeight = bounds.maxY - bounds.minY;
    const offsetX = (this.scale.width - boardWidth) / 2 - bounds.minX;
    const offsetY = sizes.uiHeight + (this.scale.height - sizes.uiHeight - boardHeight) / 2 - bounds.minY;

    this.createUi(colors);
    this.drawBoardBackdrop(boardSize, corners, axialToPixel, offsetX, offsetY, colorsHex);

    this.board = Array.from({ length: boardSize }, () => Array(boardSize).fill(0));
    this.cells = Array.from({ length: boardSize }, () => Array(boardSize).fill(null));

    for (let r = 0; r < boardSize; r += 1) {
      for (let q = 0; q < boardSize; q += 1) {
        const point = axialToPixel(q, r);
        const centerX = point.x + offsetX;
        const centerY = point.y + offsetY;

        const shadow = this.add.polygon(centerX + 3, centerY + 4, corners, 0x000000, 0.12);
        shadow.setDepth(0);

        const cell = this.add.polygon(centerX, centerY, corners, colorsHex.cellFill, 1);
        cell.setStrokeStyle(4, colorsHex.gridLine, 1);
        cell.setDepth(1);
        cell.setInteractive(new Phaser.Geom.Polygon(corners), Phaser.Geom.Polygon.Contains);
        cell.setData("coords", { q, r });

        cell.on("pointerover", () => {
          if (this.gameOver) {
            return;
          }
          if (this.board[r][q] === 0) {
            cell.setFillStyle(colorsHex.cellHover, 1);
          }
        });

        cell.on("pointerout", () => {
          if (this.board[r][q] === 0) {
            cell.setFillStyle(colorsHex.cellFill, 1);
          }
        });

        cell.on("pointerup", () => {
          this.handleMove(q, r, cell, colorsHex);
        });

        this.cells[r][q] = cell;
      }
    }

    this.updatePlayerText(colors);
  }

  createUi(colors) {
    const header = this.add.rectangle(0, 0, this.scale.width, THEME.sizes.uiHeight, this.colorToHex(colors.uiBackground));
    header.setOrigin(0, 0);

    this.playerText = this.add.text(24, 24, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "22px",
      color: colors.text
    });

    this.statusText = this.add.text(24, 52, "", {
      fontFamily: "Trebuchet MS",
      fontSize: "18px",
      color: colors.text
    });

    const buttonWidth = 140;
    const buttonHeight = 38;
    const buttonX = this.scale.width - buttonWidth - 24;
    const buttonY = 24;

    const button = this.add.rectangle(buttonX, buttonY, buttonWidth, buttonHeight, this.colorToHex(colors.boardBackground));
    button.setOrigin(0, 0);
    button.setStrokeStyle(3, this.colorToHex(colors.gridLine), 1);
    button.setInteractive({ useHandCursor: true });

    const buttonText = this.add.text(buttonX + 18, buttonY + 8, "New Game", {
      fontFamily: "Trebuchet MS",
      fontSize: "18px",
      color: colors.text
    });

    button.on("pointerup", () => this.resetGame());
  }

  drawBoardBackdrop(boardSize, corners, axialToPixel, offsetX, offsetY, colorsHex) {
    const topLeft = axialToPixel(0, 0);
    const topRight = axialToPixel(boardSize - 1, 0);
    const bottomRight = axialToPixel(boardSize - 1, boardSize - 1);
    const bottomLeft = axialToPixel(0, boardSize - 1);

    const points = [
      { x: topLeft.x + offsetX + corners[5].x, y: topLeft.y + offsetY + corners[5].y },
      { x: topRight.x + offsetX + corners[0].x, y: topRight.y + offsetY + corners[0].y },
      { x: bottomRight.x + offsetX + corners[2].x, y: bottomRight.y + offsetY + corners[2].y },
      { x: bottomLeft.x + offsetX + corners[3].x, y: bottomLeft.y + offsetY + corners[3].y }
    ];

    const graphics = this.add.graphics();
    graphics.fillStyle(colorsHex.boardBackground, 1);
    graphics.lineStyle(6, colorsHex.gridLine, 1);
    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
      graphics.lineTo(points[i].x, points[i].y);
    }
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
  }

  handleMove(q, r, cell, colorsHex) {
    if (this.gameOver) {
      return;
    }
    if (this.board[r][q] !== 0) {
      return;
    }

    this.board[r][q] = this.currentPlayer;
    const isRed = this.currentPlayer === 1;
    cell.setFillStyle(isRed ? colorsHex.red : colorsHex.yellow, 1);

    if (this.hasPlayerWon(this.currentPlayer)) {
      this.gameOver = true;
      this.statusText.setText(isRed ? "Red wins!" : "Yellow wins!");
      return;
    }

    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
    this.updatePlayerText(THEME.colors);
  }

  updatePlayerText(colors) {
    const isRed = this.currentPlayer === 1;
    const playerLabel = isRed ? "Red" : "Yellow";
    const playerColor = isRed ? colors.red : colors.yellow;
    this.playerText.setText(`Current player: ${playerLabel}`);
    this.playerText.setColor(playerColor);
    if (!this.gameOver) {
      this.statusText.setText("");
    }
  }

  resetGame() {
    const { boardSize, colors } = THEME;
    const colorsHex = {
      cellFill: this.colorToHex(colors.cellFill),
      gridLine: this.colorToHex(colors.gridLine)
    };

    for (let r = 0; r < boardSize; r += 1) {
      for (let q = 0; q < boardSize; q += 1) {
        this.board[r][q] = 0;
        const cell = this.cells[r][q];
        if (cell) {
          cell.setFillStyle(colorsHex.cellFill, 1);
          cell.setStrokeStyle(4, colorsHex.gridLine, 1);
        }
      }
    }

    this.currentPlayer = 1;
    this.gameOver = false;
    this.updatePlayerText(colors);
  }

  hasPlayerWon(player) {
    const size = THEME.boardSize;
    const queue = [];
    const visited = new Set();
    const directions = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, -1],
      [-1, 1]
    ];

    if (player === 1) {
      for (let r = 0; r < size; r += 1) {
        if (this.board[r][0] === player) {
          queue.push([0, r]);
          visited.add(`0,${r}`);
        }
      }
    } else {
      for (let q = 0; q < size; q += 1) {
        if (this.board[0][q] === player) {
          queue.push([q, 0]);
          visited.add(`${q},0`);
        }
      }
    }

    while (queue.length > 0) {
      const [q, r] = queue.shift();
      if (player === 1 && q === size - 1) {
        return true;
      }
      if (player === 2 && r === size - 1) {
        return true;
      }

      for (const [dq, dr] of directions) {
        const nq = q + dq;
        const nr = r + dr;
        if (nq < 0 || nr < 0 || nq >= size || nr >= size) {
          continue;
        }
        if (this.board[nr][nq] !== player) {
          continue;
        }
        const key = `${nq},${nr}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push([nq, nr]);
        }
      }
    }

    return false;
  }

  getHexCorners(radius) {
    const corners = [];
    for (let i = 0; i < 6; i += 1) {
      const angle = Phaser.Math.DegToRad(60 * i - 30);
      corners.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
    }
    return corners;
  }

  colorToHex(value) {
    return Phaser.Display.Color.HexStringToColor(value).color;
  }
}
