import Phaser from "phaser";
import type { PlaceId } from "@/lib/adventure/model";

export interface WorldHandle {
  visit: (id: PlaceId) => void;
  setCompleted: (ids: PlaceId[]) => void;
  setAppearance: (
    decorations: string[],
    meal: "noodles" | "rice",
    evening: boolean,
  ) => void;
  destroy: () => void;
}
const W = 1100,
  H = 720;
const places: Record<PlaceId, { x: number; y: number; label: string }> = {
  friend: { x: 4, y: 5, label: "MALI’S CAFÉ" },
  noodles: { x: 8, y: 5, label: "ARUN’S NOODLES" },
  market: { x: 9, y: 9, label: "DAO’S MARKET" },
};
const iso = (x: number, y: number) => ({
  x: 550 + (x - y) * 36,
  y: 110 + (x + y) * 19,
});

export function createWorld(
  parent: HTMLElement,
  onVisit: (id: PlaceId) => void,
  onDiscover: (id: string) => void,
  reduced: boolean,
): WorldHandle {
  let scene: Neighbourhood;
  class Neighbourhood extends Phaser.Scene {
    player!: Phaser.GameObjects.Container;
    grid = { x: 6, y: 10 };
    walking = false;
    walkSerial = 0;
    appearance = {
      decorations: [] as string[],
      meal: "noodles" as "noodles" | "rice",
      evening: false,
    };
    dynamicObjects: Phaser.GameObjects.GameObject[] = [];
    initialized = false;
    completed: PlaceId[] = [];
    markers: Partial<Record<PlaceId, Phaser.GameObjects.Text>> = {};
    blocked = new Set<string>();
    cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
    constructor() {
      super("LittleBangkok");
      // Expose the active Phaser scene to the React bridge without a global.
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      scene = this;
    }
    poly(points: number[], color: number, alpha = 1, depth = 0) {
      const g = this.add.graphics().setDepth(depth);
      g.fillStyle(color, alpha).fillPoints(
        Array.from(
          { length: points.length / 2 },
          (_, i) => new Phaser.Math.Vector2(points[i * 2], points[i * 2 + 1]),
        ),
        true,
      );
      return g;
    }
    rect(
      x: number,
      y: number,
      width: number,
      height: number,
      color: number,
      depth = 0,
      radius = 0,
    ) {
      const g = this.add.graphics().setDepth(depth);
      g.fillStyle(color);
      g.fillRoundedRect(x, y, width, height, radius);
      return g;
    }
    oval(
      x: number,
      y: number,
      width: number,
      height: number,
      color: number,
      alpha = 1,
      depth = 0,
    ) {
      const g = this.add.graphics().setDepth(depth);
      g.fillStyle(color, alpha).fillEllipse(x, y, width, height);
      return g;
    }
    text(
      x: number,
      y: number,
      text: string,
      size = 12,
      color = "#38564b",
      depth = 2000,
    ) {
      return this.add
        .text(x, y, text, {
          fontFamily: "Arial, sans-serif",
          fontSize: `${size}px`,
          color,
          fontStyle: "bold",
          align: "center",
        })
        .setOrigin(0.5)
        .setDepth(depth);
    }
    tile(x: number, y: number, color: number) {
      const p = iso(x, y);
      this.poly(
        [p.x, p.y - 19, p.x + 36, p.y, p.x, p.y + 19, p.x - 36, p.y],
        color,
      );
    }
    person(x: number, y: number, shirt: number, hair: number, scale = 1) {
      const shadow = this.add.ellipse(0, 2, 26, 12, 0x254b3d, 0.18);
      const leg1 = this.add
        .rectangle(-5, -9, 7, 20, 0x31485b)
        .setRotation(0.06);
      const leg2 = this.add
        .rectangle(5, -9, 7, 20, 0x31485b)
        .setRotation(-0.06);
      const foot1 = this.add.ellipse(-6, 1, 10, 5, 0xf7eed9),
        foot2 = this.add.ellipse(6, 1, 10, 5, 0xf7eed9);
      const torso = this.add
        .graphics()
        .fillStyle(shirt)
        .fillRoundedRect(-12, -40, 24, 26, 7);
      const arm1 = this.add
          .ellipse(-14, -27, 7, 19, 0xe5ac83)
          .setRotation(0.18),
        arm2 = this.add.ellipse(14, -27, 7, 19, 0xe5ac83).setRotation(-0.18);
      const head = this.add.circle(0, -48, 13, 0xe8b58e);
      const hairstyle = this.add
        .graphics()
        .fillStyle(hair)
        .fillRoundedRect(-14, -61, 28, 14, { tl: 12, tr: 12, bl: 3, br: 3 });
      const eye1 = this.add.circle(-4, -47, 1.5, 0x39443b),
        eye2 = this.add.circle(4, -47, 1.5, 0x39443b);
      const blush = this.add.ellipse(-7, -43, 5, 3, 0xd98f78, 0.6);
      return this.add
        .container(x, y, [
          shadow,
          leg1,
          leg2,
          foot1,
          foot2,
          arm1,
          arm2,
          torso,
          head,
          hairstyle,
          eye1,
          eye2,
          blush,
        ])
        .setScale(scale)
        .setDepth(y + 80);
    }
    tree(x: number, y: number, scale = 1) {
      const p = iso(x, y),
        d = p.y + 50;
      this.oval(p.x, p.y + 5, 60 * scale, 25 * scale, 0x37583f, 0.14, d - 1);
      this.rect(
        p.x - 5 * scale,
        p.y - 48 * scale,
        10 * scale,
        52 * scale,
        0x8b7652,
        d,
        4,
      );
      this.oval(
        p.x + 9 * scale,
        p.y - 57 * scale,
        56 * scale,
        64 * scale,
        0x45785e,
        1,
        d,
      );
      this.oval(
        p.x - 17 * scale,
        p.y - 66 * scale,
        50 * scale,
        55 * scale,
        0x659476,
        1,
        d,
      );
      this.oval(p.x, p.y - 88 * scale, 48 * scale, 46 * scale, 0x8db18a, 1, d);
      this.oval(
        p.x - 12 * scale,
        p.y - 85 * scale,
        15 * scale,
        7 * scale,
        0xb0c695,
        0.6,
        d,
      );
    }
    planter(x: number, y: number) {
      const p = iso(x, y),
        d = p.y + 50;
      this.rect(p.x - 10, p.y - 15, 20, 18, 0xc68d68, d, 4);
      this.oval(p.x, p.y - 16, 24, 8, 0xe8b28a, 1, d);
      this.oval(p.x - 6, p.y - 24, 12, 20, 0x5c8c65, 1, d);
      this.oval(p.x + 5, p.y - 27, 12, 22, 0x83a778, 1, d);
      this.oval(p.x + 4, p.y - 32, 8, 8, 0xeab68e, 1, d);
    }
    building(x: number, y: number, type: "cafe" | "noodles" | "market") {
      const p = iso(x, y),
        d = p.y + 35,
        width = type === "cafe" ? 130 : 112,
        height = type === "cafe" ? 105 : 65;
      this.oval(p.x + 5, p.y + 12, width + 55, 45, 0x284b3c, 0.13, d - 1);
      this.poly(
        [
          p.x - width / 2,
          p.y - height,
          p.x + 20,
          p.y - height + 28,
          p.x + 20,
          p.y + 24,
          p.x - width / 2,
          p.y - 5,
        ],
        type === "cafe" ? 0xf2d2a1 : 0xe9ba8b,
        1,
        d,
      );
      this.poly(
        [
          p.x + 20,
          p.y - height + 28,
          p.x + width / 2 + 28,
          p.y - height + 3,
          p.x + width / 2 + 28,
          p.y - 5,
          p.x + 20,
          p.y + 24,
        ],
        0xd8a477,
        1,
        d,
      );
      if (type === "cafe") {
        this.rect(p.x - 46, p.y - 62, 27, 49, 0x3d675e, d, 2);
        this.rect(p.x - 9, p.y - 55, 24, 25, 0x729c91, d, 2);
        this.rect(p.x - 7, p.y - 53, 2, 21, 0xefdcba, d);
        this.rect(p.x - 7, p.y - 43, 19, 2, 0xefdcba, d);
        this.poly(
          [
            p.x - 78,
            p.y - height - 3,
            p.x - 9,
            p.y - height - 48,
            p.x + 95,
            p.y - height - 9,
            p.x + 25,
            p.y - height + 35,
          ],
          0x4a7a70,
          1,
          d + 1,
        );
        this.poly(
          [
            p.x - 78,
            p.y - height - 3,
            p.x + 25,
            p.y - height + 35,
            p.x + 25,
            p.y - height + 45,
            p.x - 78,
            p.y - height + 7,
          ],
          0x345e56,
          1,
          d + 1,
        );
        for (let i = 0; i < 6; i++)
          this.poly(
            [
              p.x - 66 + i * 16,
              p.y - height - 7 - i * 7,
              p.x + 34 + i * 8,
              p.y - height + 27 - i * 7,
              p.x + 36 + i * 8,
              p.y - height + 25 - i * 7,
              p.x - 64 + i * 16,
              p.y - height - 9 - i * 7,
            ],
            0x7b9d84,
            0.4,
            d + 2,
          );
        this.rect(p.x + 40, p.y - 39, 25, 25, 0x60867b, d, 2);
        this.text(p.x - 25, p.y - 79, "มะลิ · CAFÉ", 10, "#4b6250", d + 3);
      } else {
        const roof = type === "noodles" ? 0xcb775c : 0xc09b61;
        this.poly(
          [
            p.x - 75,
            p.y - 75,
            p.x - 11,
            p.y - 108,
            p.x + 90,
            p.y - 74,
            p.x + 24,
            p.y - 37,
          ],
          roof,
          1,
          d + 1,
        );
        for (let i = 0; i < 5; i++)
          this.poly(
            [
              p.x - 73 + i * 20,
              p.y - 75 + i * 7,
              p.x - 9 + i * 20,
              p.y - 107 + i * 7,
              p.x + 1 + i * 20,
              p.y - 104 + i * 7,
              p.x - 63 + i * 20,
              p.y - 71 + i * 7,
            ],
            0xffefcd,
            0.75,
            d + 2,
          );
        this.poly(
          [
            p.x - 75,
            p.y - 75,
            p.x + 24,
            p.y - 37,
            p.x + 24,
            p.y - 26,
            p.x - 75,
            p.y - 64,
          ],
          roof,
          1,
          d + 2,
        );
        this.rect(p.x - 65, p.y - 65, 5, 58, 0x89694f, d + 3);
        this.rect(p.x + 18, p.y - 29, 5, 53, 0x89694f, d + 3);
        this.poly(
          [
            p.x - 65,
            p.y - 16,
            p.x - 19,
            p.y - 39,
            p.x + 23,
            p.y - 20,
            p.x - 24,
            p.y + 4,
          ],
          0xf5ddad,
          1,
          d + 3,
        );
        this.poly(
          [
            p.x - 65,
            p.y - 16,
            p.x - 24,
            p.y + 4,
            p.x - 24,
            p.y + 16,
            p.x - 65,
            p.y - 4,
          ],
          0x9a7454,
          1,
          d + 3,
        );
        if (type === "noodles") {
          this.oval(p.x - 24, p.y - 24, 25, 12, 0x6b7770, 1, d + 4);
          this.oval(p.x - 24, p.y - 27, 25, 12, 0xbbcec1, 1, d + 4);
          this.oval(p.x - 25, p.y - 28, 18, 7, 0x9a664c, 1, d + 5);
          for (let i = 0; i < 3; i++) {
            const steam = this.oval(
              p.x - 25 + i * 5,
              p.y - 45 - i * 8,
              8,
              16,
              0xfff6dd,
              0.65,
              d + 5,
            );
            if (!reduced)
              this.tweens.add({
                targets: steam,
                y: -25,
                alpha: 0,
                duration: 1800 + i * 300,
                repeat: -1,
                delay: i * 450,
              });
          }
          this.text(p.x - 15, p.y - 66, "ก๋วยเตี๋ยว", 11, "#fff0d3", d + 6);
        } else {
          for (let i = 0; i < 6; i++)
            this.oval(
              p.x - 46 + (i % 3) * 13,
              p.y - 20 - Math.floor(i / 3) * 8,
              12,
              10,
              [0xeaaa64, 0x99ad67, 0xcb7d65][i % 3],
              1,
              d + 4,
            );
          this.text(p.x - 15, p.y - 66, "ตลาด · MARKET", 9, "#fff0d3", d + 6);
          this.poly(
            [
              p.x + 42,
              p.y - 43,
              p.x + 60,
              p.y - 50,
              p.x + 60,
              p.y - 17,
              p.x + 42,
              p.y - 10,
            ],
            0x8b9eab,
            1,
            d + 4,
          );
        }
      }
    }
    create() {
      this.cameras.main.setBackgroundColor("#dce5cc");
      // A small floating neighbourhood, with a canal and warm stone paths.
      this.oval(550, 455, 935, 455, 0x608776, 0.12);
      const a = iso(0, 0),
        b = iso(13, 0),
        c = iso(13, 13),
        d = iso(0, 13);
      this.poly(
        [d.x - 36, d.y, c.x, c.y + 19, c.x, c.y + 43, d.x - 36, d.y + 24],
        0x9aaf83,
      );
      this.poly(
        [c.x, c.y + 19, b.x + 36, b.y, b.x + 36, b.y + 24, c.x, c.y + 43],
        0x79966c,
      );
      this.poly(
        [a.x, a.y - 19, b.x + 36, b.y, c.x, c.y + 19, d.x - 36, d.y],
        0xb5c79a,
      );
      for (let x = 0; x < 14; x++)
        for (let y = 0; y < 14; y++) {
          const canal = x < 2,
            path =
              x >= 2 && (y === 5 || y === 6 || x === 6 || x === 7 || y === 10);
          this.tile(
            x,
            y,
            canal
              ? (x + y) % 2
                ? 0x76b3ac
                : 0x81bcb2
              : path
                ? (x + y) % 3
                  ? 0xe8d8b2
                  : 0xdfcea5
                : (x * 7 + y) % 3
                  ? 0xb4c99a
                  : 0xbcd0a1,
          );
          if (canal) this.blocked.add(`${x},${y}`);
          if (!canal && !path && (x + y) % 4 === 0) {
            const p = iso(x, y);
            this.oval(p.x + 8, p.y - 3, 9, 3, 0x8fab7f, 0.6);
          }
        }
      // Bridge over the canal; decorative boards, railings, animated ripples.
      for (let i = 0; i < 7; i++) {
        const p = iso(0.3 + i * 0.28, 6);
        this.poly(
          [
            p.x - 32,
            p.y - 12,
            p.x,
            p.y - 29,
            p.x + 10,
            p.y - 24,
            p.x - 22,
            p.y - 7,
          ],
          0x9d7d59,
          1,
          350,
        );
      }
      for (let y = 2; y < 13; y += 2) {
        const p = iso(0.5, y);
        const ripple = this.oval(p.x, p.y, 25, 5, 0xd7e8cf, 0.45);
        if (!reduced)
          this.tweens.add({
            targets: ripple,
            alpha: 0.12,
            scaleX: 1.5,
            duration: 2100 + y * 80,
            yoyo: true,
            repeat: -1,
          });
      }
      for (const [x, y, s] of [
        [3, 2, 1.1],
        [10, 2, 1.05],
        [12, 4, 0.9],
        [3, 11, 1],
        [11, 12, 1.15],
        [12, 11, 0.85],
        [4, 12, 0.8],
        [2, 8, 0.75],
      ])
        this.tree(x, y, s);
      this.building(4, 3.5, "cafe");
      this.building(8.5, 3.7, "noodles");
      this.building(10.5, 8, "market");
      // Building footprints keep walks out of walls.
      for (const [x0, y0, x1, y1] of [
        [3, 2, 5, 4],
        [8, 3, 10, 4],
        [10, 7, 12, 8],
      ])
        for (let x = x0; x <= x1; x++)
          for (let y = y0; y <= y1; y++) this.blocked.add(`${x},${y}`);
      for (const [x, y] of [
        [3, 5],
        [5, 4],
        [8, 6],
        [10, 9],
        [12, 7],
        [4, 8],
      ])
        this.planter(x, y);
      // Café terrace table and stools.
      const table = iso(4, 7);
      this.oval(table.x, table.y, 45, 20, 0x385444, 0.12, table.y);
      this.rect(table.x - 3, table.y - 23, 6, 23, 0x9f7a55, table.y + 50);
      this.oval(table.x, table.y - 25, 45, 23, 0xe9c58e, 1, table.y + 50);
      this.oval(table.x - 7, table.y - 29, 9, 7, 0xf5ead2, 1, table.y + 51);
      for (const offset of [-30, 30]) {
        this.rect(
          table.x + offset - 3,
          table.y - 5,
          6,
          16,
          0x94734e,
          table.y + 50,
        );
        this.oval(
          table.x + offset,
          table.y - 8,
          23,
          11,
          0xcba879,
          1,
          table.y + 51,
        );
      }
      // Picnic garden and woven mat: the destination at the end of the story.
      const picnic = iso(9.5, 12);
      this.poly(
        [
          picnic.x - 60,
          picnic.y - 6,
          picnic.x - 5,
          picnic.y - 34,
          picnic.x + 57,
          picnic.y - 6,
          picnic.x + 2,
          picnic.y + 22,
        ],
        0xe8b99c,
        1,
        picnic.y + 10,
      );
      for (let i = 0; i < 4; i++)
        this.poly(
          [
            picnic.x - 52 + i * 15,
            picnic.y - 3 + i * 6,
            picnic.x + i * 15,
            picnic.y - 30 + i * 6,
            picnic.x + 4 + i * 15,
            picnic.y - 28 + i * 6,
            picnic.x - 48 + i * 15,
            picnic.y - 1 + i * 6,
          ],
          0xf6d8ad,
          1,
          picnic.y + 11,
        );
      this.oval(picnic.x, picnic.y - 5, 27, 13, 0x96734d, 1, picnic.y + 12);
      this.text(picnic.x, picnic.y + 42, "TONIGHT’S PICNIC", 10, "#617958");
      // A string of lanterns across the street.
      const line = this.add.graphics().setDepth(1200);
      line.lineStyle(1, 0x7c896d, 0.8);
      line.beginPath();
      line.moveTo(440, 190);
      line.lineTo(770, 235);
      line.strokePath();
      for (let i = 0; i < 7; i++) {
        this.oval(
          470 + i * 43,
          199 + i * 6,
          12,
          18,
          i % 2 ? 0xefc979 : 0xdd987c,
          1,
          1201,
        );
        this.rect(467 + i * 43, 207 + i * 6, 6, 4, 0xb27853, 1202);
      }
      for (const [id, place] of Object.entries(places) as [
        PlaceId,
        (typeof places)[PlaceId],
      ][]) {
        const p = iso(place.x, place.y);
        this.person(
          p.x,
          p.y,
          id === "friend" ? 0xeff0cf : id === "noodles" ? 0xebac73 : 0xba91a3,
          0x4c3b30,
        );
        const badge = this.text(p.x, p.y - 90, "!", 18, "#345a48")
          .setBackgroundColor("#fff1c8")
          .setPadding(10, 4)
          .setInteractive({ useHandCursor: true });
        badge.on("pointerdown", () => this.visit(id));
        this.markers[id] = badge;
        if (!reduced)
          this.tweens.add({
            targets: badge,
            y: p.y - 96,
            duration: 1200,
            yoyo: true,
            repeat: -1,
          });
        const hotspot = this.add
          .zone(p.x, p.y - 30, 90, 100)
          .setDepth(1500)
          .setInteractive({ useHandCursor: true });
        hotspot.on("pointerdown", () => this.visit(id));
        this.text(p.x, p.y + 29, place.label, 10, "#49624e");
      }
      // Discoverable details, with clear sparkles and generous hit targets.
      const cat = iso(5, 8.5);
      this.oval(cat.x, cat.y - 4, 27, 15, 0xd7a566, 1, cat.y + 50);
      this.oval(cat.x + 13, cat.y - 10, 16, 16, 0xe4b875, 1, cat.y + 50);
      this.poly(
        [cat.x + 8, cat.y - 14, cat.x + 7, cat.y - 24, cat.x + 15, cat.y - 16],
        0xe4b875,
        1,
        cat.y + 51,
      );
      this.poly(
        [
          cat.x + 17,
          cat.y - 15,
          cat.x + 23,
          cat.y - 23,
          cat.x + 23,
          cat.y - 11,
        ],
        0xe4b875,
        1,
        cat.y + 51,
      );
      for (const [id, x, y] of [
        ["cat", 5, 8.5],
        ["flower", 2.5, 6.8],
        ["water", 0.5, 10],
      ] as const) {
        const p = iso(x, y);
        const sparkle = this.text(p.x + 18, p.y - 30, "✦", 18, "#fdf0be");
        if (!reduced)
          this.tweens.add({
            targets: sparkle,
            alpha: 0.4,
            duration: 1300,
            yoyo: true,
            repeat: -1,
          });
        this.add
          .zone(p.x, p.y - 10, 60, 70)
          .setDepth(1550)
          .setInteractive({ useHandCursor: true })
          .on("pointerdown", () => onDiscover(id));
      }
      const start = iso(this.grid.x, this.grid.y);
      this.player = this.person(start.x, start.y, 0x658caa, 0x453b37, 1.12);
      const playerLabel = this.add
        .text(0, 26, "YOU", {
          fontFamily: "Arial",
          fontSize: "10px",
          color: "#526e60",
          fontStyle: "bold",
        })
        .setOrigin(0.5)
        .setAlpha(0.7);
      this.player.add(playerLabel);
      this.cursors = this.input.keyboard?.createCursorKeys();
      this.input.on(
        "pointerdown",
        (
          pointer: Phaser.Input.Pointer,
          objects: Phaser.GameObjects.GameObject[],
        ) => {
          if (objects.length) return;
          const dx = (pointer.x - 550) / 36,
            dy = (pointer.y - 110) / 19;
          this.walk(Math.round((dx + dy) / 2), Math.round((dy - dx) / 2));
        },
      );
      this.events.on("update", () => {
        if (
          this.walking ||
          !this.cursors ||
          !parent.contains(document.activeElement)
        )
          return;
        if (this.cursors.left.isDown) this.walk(this.grid.x - 1, this.grid.y);
        else if (this.cursors.right.isDown)
          this.walk(this.grid.x + 1, this.grid.y);
        else if (this.cursors.up.isDown)
          this.walk(this.grid.x, this.grid.y - 1);
        else if (this.cursors.down.isDown)
          this.walk(this.grid.x, this.grid.y + 1);
      });
      this.game.canvas.setAttribute("tabindex", "0");
      this.game.canvas.setAttribute(
        "aria-label",
        "Neighbourhood map. Arrow keys move; use location buttons to talk.",
      );
      this.initialized = true;
      this.updateMarkers();
      this.drawAppearance();
    }
    path(x: number, y: number) {
      if (x < 2 || y < 0 || x > 13 || y > 13 || this.blocked.has(`${x},${y}`))
        return [];
      const queue = [{ ...this.grid }],
        came = new Map<string, { x: number; y: number } | null>([
          [`${this.grid.x},${this.grid.y}`, null],
        ]);
      for (let i = 0; i < queue.length; i++) {
        const p = queue[i];
        if (p.x === x && p.y === y) break;
        for (const [dx, dy] of [
          [0, 1],
          [1, 0],
          [-1, 0],
          [0, -1],
        ]) {
          const next = { x: p.x + dx, y: p.y + dy },
            key = `${next.x},${next.y}`;
          if (
            next.x < 2 ||
            next.y < 0 ||
            next.x > 13 ||
            next.y > 13 ||
            this.blocked.has(key) ||
            came.has(key)
          )
            continue;
          came.set(key, p);
          queue.push(next);
        }
      }
      if (!came.has(`${x},${y}`)) return [];
      const path = [];
      let current: { x: number; y: number } | null = { x, y };
      while (
        current &&
        (current.x !== this.grid.x || current.y !== this.grid.y)
      ) {
        path.unshift(current);
        current = came.get(`${current.x},${current.y}`)!;
      }
      return path;
    }
    walk(x: number, y: number, after?: () => void) {
      if (!this.player) {
        this.time.delayedCall(100, () => this.walk(x, y, after));
        return;
      }
      const serial = ++this.walkSerial;
      this.tweens.killTweensOf(this.player);
      const old = iso(this.grid.x, this.grid.y);
      this.player.setPosition(old.x, old.y);
      this.walking = false;
      const path = this.path(x, y);
      if (!path.length) {
        if (x === this.grid.x && y === this.grid.y) after?.();
        return;
      }
      this.walking = true;
      const ring = this.add
        .ellipse(iso(x, y).x, iso(x, y).y, 28, 13)
        .setStrokeStyle(2, 0xfff3ca)
        .setDepth(900);
      const step = () => {
        if (serial !== this.walkSerial) {
          ring.destroy();
          return;
        }
        const next = path.shift();
        if (!next) {
          this.walking = false;
          ring.destroy();
          after?.();
          return;
        }
        const point = iso(next.x, next.y);
        this.tweens.add({
          targets: this.player,
          x: point.x,
          y: point.y,
          duration: reduced ? 30 : 125,
          onUpdate: () => this.player.setDepth(this.player.y + 80),
          onComplete: () => {
            this.grid = next;
            step();
          },
        });
      };
      step();
    }
    visit(id: PlaceId) {
      const p = places[id];
      this.walk(p.x, p.y, () => onVisit(id));
    }
    drawAppearance() {
      if (!this.initialized) return;
      this.dynamicObjects.forEach((o) => o.destroy());
      this.dynamicObjects = [];
      const previous = new Set(this.children.list);
      if (this.completed.includes("noodles")) {
        const p = iso(4, 7);
        this.oval(p.x + 10, p.y - 29, 18, 9, 0xfff5da, 1, p.y + 52);
        this.oval(
          p.x + 10,
          p.y - 30,
          13,
          6,
          this.appearance.meal === "rice" ? 0xd4b176 : 0xc18e5d,
          1,
          p.y + 53,
        );
        this.text(
          p.x,
          p.y + 30,
          this.appearance.meal === "rice"
            ? "YOUR PAD KRA PAO"
            : "YOUR KHAO SOI",
          9,
          "#7e805d",
        );
      }
      if (this.completed.includes("market")) {
        const p = iso(9.5, 12);
        this.poly(
          [
            p.x + 17,
            p.y - 7,
            p.x + 34,
            p.y - 15,
            p.x + 50,
            p.y - 8,
            p.x + 32,
            p.y,
          ],
          0x9ca6b8,
          1,
          p.y + 15,
        );
        this.text(p.x + 65, p.y + 10, "A GIFT FOR MALI", 9, "#7e805d");
      }
      if (this.appearance.decorations.includes("flowers"))
        for (let i = 0; i < 12; i++) {
          const p = iso(2.2, 2 + i * 0.65);
          this.rect(p.x - 1, p.y - 13, 2, 13, 0x789461, p.y + 60);
          this.oval(
            p.x,
            p.y - 13,
            9,
            9,
            i % 2 ? 0xe9a69a : 0xedc87f,
            1,
            p.y + 61,
          );
        }
      if (this.appearance.decorations.includes("cushions"))
        for (const [x, y] of [
          [8.5, 12],
          [10.5, 12],
          [9.5, 11.5],
        ]) {
          const p = iso(x, y);
          this.oval(p.x, p.y, 30, 16, 0xb4939d, 1, p.y + 12);
          this.oval(p.x, p.y - 3, 28, 13, 0xccaeb0, 1, p.y + 13);
        }
      if (this.appearance.decorations.includes("lanterns"))
        for (let i = 0; i < 6; i++) {
          const p = iso(8 + i * 0.6, 11.5);
          this.rect(p.x, p.y - 63, 2, 65, 0x7b7956, p.y + 100);
          this.oval(
            p.x,
            p.y - 61,
            17,
            22,
            i % 2 ? 0xe7b771 : 0xdba28e,
            1,
            p.y + 101,
          );
          this.oval(p.x, p.y - 61, 8, 16, 0xffe8ac, 0.65, p.y + 102);
        }
      if (this.appearance.evening) {
        this.rect(0, 0, W, H, 0xe6a471, 1900).setAlpha(0.13);
        const p = iso(9.5, 12);
        this.person(p.x - 40, p.y + 12, 0xeee5be, 0x4c3b30, 0.9);
        this.person(p.x + 42, p.y + 12, 0xebac73, 0x4c3b30, 0.9);
        this.person(p.x, p.y - 25, 0xba91a3, 0x4c3b30, 0.9);
        this.text(p.x, p.y + 58, "YOU HAVE A PLACE HERE", 11, "#5a6042");
        for (let i = 0; i < 14; i++) {
          const star = this.oval(
            iso(7 + (i % 4), 10 + Math.floor(i / 4)).x,
            380 + i * 9,
            4,
            4,
            0xfff3bc,
            0.8,
            1950,
          );
          if (!reduced)
            this.tweens.add({
              targets: star,
              alpha: 0.1,
              y: star.y - 20,
              duration: 1800 + i * 90,
              yoyo: true,
              repeat: -1,
            });
        }
      }
      this.dynamicObjects = this.children.list.filter((o) => !previous.has(o));
    }
    updateMarkers() {
      for (const id of Object.keys(places) as PlaceId[])
        this.markers[id]?.setText(this.completed.includes(id) ? "✓" : "!");
    }
  }
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: W,
    height: H,
    backgroundColor: "#dce5cc",
    scene: Neighbourhood,
    render: { antialias: true, pixelArt: false },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    audio: { noAudio: true },
    input: { keyboard: true },
    banner: false,
  });
  return {
    visit: (id) => scene?.visit(id),
    setCompleted: (ids) => {
      if (scene) {
        scene.completed = ids;
        scene.updateMarkers();
        scene.drawAppearance();
      }
    },
    setAppearance: (decorations, meal, evening) => {
      if (scene) {
        scene.appearance = { decorations, meal, evening };
        scene.drawAppearance();
      }
    },
    destroy: () => game.destroy(true),
  };
}
