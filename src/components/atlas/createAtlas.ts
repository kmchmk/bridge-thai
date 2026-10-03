import Phaser from "phaser";
import {
  DISTRICTS,
  LOCATIONS,
  SECRETS,
  type DistrictId,
} from "@/lib/atlas/catalog";
export interface AtlasWorldHandle {
  focus: (district: DistrictId) => void;
  visit: (id: string) => void;
  cancel: () => void;
  zoom: (delta: number) => void;
  pan: (x: number, y: number) => void;
  progress: (completed: string[], secrets: string[]) => void;
  interactive: (enabled: boolean) => void;
  appearance: (
    decorations: string[],
    meal: string,
    picnic: boolean,
    bag: string | null,
    picnicCount: number,
  ) => void;
  destroy: () => void;
}
export function createAtlas(
  parent: HTMLElement,
  onVisit: (id: string) => void,
  onSecret: (id: string) => void,
): AtlasWorldHandle {
  let scene: Journey;
  let pendingDistrict: DistrictId = "town";
  let pendingVisit: string | null = null;
  let pendingCompleted: string[] = [];
  let pendingSecrets: string[] = [];
  let acceptsInput = true;
  let appearance = {
    decorations: [] as string[],
    meal: "noodles",
    picnic: false,
    picnicCount: 0,
    bag: null as string | null,
  };
  let adornments: Phaser.GameObjects.GameObject[] = [];
  let bagText: Phaser.GameObjects.Text | undefined;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  class Journey extends Phaser.Scene {
    player!: Phaser.GameObjects.Container;
    initialized = false;
    serial = 0;
    district: DistrictId = "town";
    markers: Record<string, Phaser.GameObjects.Text> = {};
    hidden: Record<string, Phaser.GameObjects.Container> = {};
    drag: { x: number; y: number; cx: number; cy: number } | null = null;
    constructor() {
      super("JourneyAtlas");
      // The React bridge keeps the active Phaser scene, without a browser global.
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      scene = this;
    }
    label(x: number, y: number, text: string, size = 14, color = "#375649") {
      return this.add
        .text(x, y, text, {
          fontFamily: "Arial, sans-serif",
          fontSize: `${size}px`,
          color,
          align: "center",
          stroke: "#f5f3e6",
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(y + 120);
    }
    building(x: number, y: number, color: number, kind: string) {
      const g = this.add.graphics().setDepth(y);
      g.fillStyle(0x42584c, 0.12).fillEllipse(x, y + 68, 138, 40);
      g.fillStyle(color).fillRoundedRect(x - 50, y - 12, 100, 74, 5);
      g.fillStyle(0xf7e6bb).fillRect(x - 35, y + 10, 22, 24);
      g.fillStyle(0x648c85).fillRect(x + 8, y + 12, 23, 42);
      g.fillStyle(0x5b7f6d).fillPoints(
        [
          new Phaser.Math.Vector2(x - 65, y - 8),
          new Phaser.Math.Vector2(x, y - 49),
          new Phaser.Math.Vector2(x + 65, y - 8),
          new Phaser.Math.Vector2(x, y + 15),
        ],
        true,
      );
      g.lineStyle(3, 0x8ba58a).lineBetween(x - 43, y - 9, x, y - 34);
      g.lineBetween(x - 25, y + 2, x + 23, y - 28);
      if (kind === "🚕" || kind === "🛻") {
        g.fillStyle(kind === "🚕" ? 0xe9c75d : 0xd77d62).fillRoundedRect(
          x - 40,
          y + 31,
          80,
          32,
          8,
        );
        g.fillStyle(0x43645b)
          .fillCircle(x - 24, y + 64, 9)
          .fillCircle(x + 24, y + 64, 9);
      }
      if (kind === "🛶" || kind === "🚤") {
        g.fillStyle(0xa87452).fillEllipse(x, y + 65, 126, 35);
        g.fillStyle(0xe9cf9d).fillEllipse(x, y + 62, 88, 20);
      }
    }
    person(x: number, y: number, color: number) {
      const g = this.add.graphics();
      g.fillStyle(0x344b42, 0.18).fillEllipse(0, 18, 26, 9);
      g.fillStyle(color).fillRoundedRect(-10, -12, 20, 27, 6);
      g.fillStyle(0xf0be93).fillCircle(0, -22, 12);
      g.fillStyle(0x65473a).fillEllipse(0, -29, 24, 14);
      g.lineStyle(6, 0x5c736b)
        .lineBetween(-5, 12, -5, 22)
        .lineBetween(5, 12, 5, 22);
      return this.add.container(x, y, [g]).setDepth(y + 100);
    }
    create() {
      this.cameras.main
        .setBounds(0, 0, 2660, 1600)
        .setBackgroundColor("#f1efdd");
      const g = this.add.graphics();
      g.fillStyle(0xb5d4cd).fillRoundedRect(875, 30, 125, 1510, 55);
      g.fillStyle(0xa9cfca).fillRoundedRect(1800, 40, 100, 1500, 40);
      g.fillStyle(0xd8c9a5).fillRoundedRect(80, 730, 2470, 58, 12);
      g.fillRoundedRect(870, 300, 1060, 56, 12);
      for (const d of DISTRICTS) {
        g.fillStyle(d.color).fillRoundedRect(
          d.x - 350,
          d.y - 280,
          700,
          560,
          90,
        );
        g.fillStyle(0xe8dbb8).fillRoundedRect(d.x - 290, d.y - 8, 580, 66, 12);
        g.fillRoundedRect(d.x - 34, d.y - 230, 68, 455, 12);
        this.label(d.x, d.y - 245, d.name.toUpperCase(), 22);
        for (let i = 0; i < 14; i++) {
          const x = d.x - 320 + ((i * 193) % 635),
            y = d.y - 245 + ((i * 149) % 480);
          if (Math.abs(x - d.x) < 70 || Math.abs(y - d.y) < 80) continue;
          const t = this.add.graphics().setDepth(y);
          t.fillStyle(0x718f70).fillRect(x - 4, y + 5, 8, 40);
          t.fillStyle(i % 2 ? 0x9fb591 : 0x87a483)
            .fillCircle(x, y, 25)
            .fillCircle(x - 10, y + 7, 20)
            .fillCircle(x + 12, y + 8, 18);
        }
      }
      // The coast has a real shoreline, boats and stepping stones; the hill village a ridge.
      g.fillStyle(0xaacec8).fillRoundedRect(1020, 1440, 760, 140, 45);
      g.fillStyle(0xadc19d)
        .fillTriangle(100, 905, 260, 800, 420, 905)
        .fillTriangle(360, 905, 510, 770, 660, 905);
      for (const l of LOCATIONS) {
        this.building(l.x, l.y, l.color, l.icon);
        this.person(l.x + 45, l.y + 78, l.color);
        this.label(l.x, l.y - 68, l.icon, 25);
        this.label(l.x, l.y + 120, l.name, 20);
        const zone = this.add
          .zone(l.x, l.y + 10, 170, 190)
          .setInteractive({ useHandCursor: true })
          .setDepth(l.y + 130);
        zone.on("pointerup", (p: Phaser.Input.Pointer) => {
          if (
            p.downElement === this.game.canvas &&
            p.upElement === this.game.canvas &&
            p.getDistance() < 12
          )
            this.walk(l.id);
        });
        this.markers[l.id] = this.label(l.x - 58, l.y + 25, "", 22, "#4a8067");
      }
      for (const s of SECRETS) {
        const art = this.add.graphics();
        art.fillStyle(0xc4a968).fillCircle(0, 0, 9);
        art
          .lineStyle(2, 0xfaf4d4)
          .lineBetween(-7, 0, 7, 0)
          .lineBetween(0, -7, 0, 7);
        const container = this.add
          .container(s.x, s.y, [art])
          .setDepth(s.y + 150);
        this.hidden[s.id] = container;
        const z = this.add
          .zone(s.x, s.y, 52, 52)
          .setInteractive({ useHandCursor: true })
          .setDepth(4000);
        z.on("pointerup", (p: Phaser.Input.Pointer) => {
          if (
            p.downElement === this.game.canvas &&
            p.upElement === this.game.canvas &&
            p.getDistance() < 12
          ) {
            this.cancel();
            onSecret(s.id);
            this.burst(s.x, s.y);
          }
        });
        if (!reduced)
          this.tweens.add({
            targets: container,
            alpha: 0.5,
            scaleX: 1.15,
            scaleY: 1.15,
            duration: 1600,
            yoyo: true,
            repeat: -1,
          });
      }
      this.player = this.person(480, 400, 0xd8a85c);
      this.player.add(
        this.add
          .text(0, -58, "YOU", {
            fontSize: "12px",
            fontFamily: "Arial",
            color: "#3e6553",
            backgroundColor: "#fff7d6",
            padding: { x: 5, y: 3 },
          })
          .setOrigin(0.5),
      );
      this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
        this.drag = {
          x: p.x,
          y: p.y,
          cx: this.cameras.main.scrollX,
          cy: this.cameras.main.scrollY,
        };
      });
      this.input.on("pointermove", (p: Phaser.Input.Pointer) => {
        if (p.isDown && this.drag && p.getDistance() > 12) {
          this.cancel();
          const c = this.cameras.main;
          c.setScroll(
            this.drag.cx - (p.x - this.drag.x) / c.zoom,
            this.drag.cy - (p.y - this.drag.y) / c.zoom,
          );
        }
      });
      this.input.on("pointerup", () => {
        this.drag = null;
      });
      let size = `${Math.round(this.scale.width)}x${Math.round(this.scale.height)}`;
      this.scale.on("resize", (gs: Phaser.Structs.Size) => {
        // The map's height is fractional, so Phaser keeps re-announcing the same
        // size every half second. Only a real change may recentre the camera,
        // otherwise it restarts (and visibly jerks) the walk in progress.
        const now = `${Math.round(gs.width)}x${Math.round(gs.height)}`;
        if (now === size) return;
        size = now;
        // A late mobile layout resize must not strand a pending walk after reload.
        this.focus(this.district);
        if (pendingVisit) this.walk(pendingVisit);
      });
      this.initialized = true;
      this.input.enabled = acceptsInput;
      this.focus(pendingDistrict);
      if (pendingVisit) this.walk(pendingVisit);
      applyProgress();
      applyAppearance();
    }
    burst(x: number, y: number) {
      for (let i = 0; i < 8; i++) {
        const star = this.add.star(x, y, 4, 3, 7, 0xe1c46c).setDepth(5000);
        this.tweens.add({
          targets: star,
          x: x + Math.cos((i * Math.PI) / 4) * 65,
          y: y + Math.sin((i * Math.PI) / 4) * 65,
          alpha: 0,
          duration: reduced ? 50 : 900,
          onComplete: () => star.destroy(),
        });
      }
    }
    focus(id: DistrictId) {
      this.district = id;
      if (!this.initialized) return;
      this.cancel();
      const d = DISTRICTS.find((d) => d.id === id)!;
      const c = this.cameras.main;
      c.setZoom(
        Math.max(
          0.3,
          Math.min(
            1.1,
            Math.min(this.scale.width / 730, this.scale.height / 600),
          ),
        ),
      );
      c.centerOn(d.x, d.y + 10);
    }
    cancel() {
      this.serial++;
      this.cameras.main.panEffect.reset();
      if (this.player) {
        this.tweens.killTweensOf(this.player);
        this.stride(0);
        this.report("idle");
      }
    }
    stride(elapsed: number) {
      // A small hop and sway on each step so the walk reads as walking.
      const body = this.player.getAt(0) as Phaser.GameObjects.Graphics;
      body.y = elapsed ? -Math.abs(Math.sin(elapsed / 90)) * 6 : 0;
      this.player.setAngle(elapsed ? Math.sin(elapsed / 90) * 4 : 0);
    }
    report(state: "idle" | "walking") {
      // Exposed on the map element so the walk can be observed and tested.
      const el = parent.dataset;
      el.walk = state;
      el.player = `${Math.round(this.player.x)},${Math.round(this.player.y)}`;
      const c = this.cameras.main;
      el.camera = `${Math.round(c.midPoint.x)},${Math.round(c.midPoint.y)}`;
    }
    walk(id: string) {
      const l = LOCATIONS.find((l) => l.id === id);
      if (!l) return;
      if (!this.initialized) {
        pendingVisit = id;
        return;
      }
      this.cancel();
      const serial = this.serial;
      this.district = l.district;
      const x = l.x + 45,
        y = l.y + 112;
      // Walk from where the person actually is, so a nearby tap is a real walk.
      // If they are off screen (another district, or across the map), they
      // start a short way from the door instead, so the arrival is always seen.
      const view = this.cameras.main.worldView;
      const seen =
        this.player.x > view.x - 40 &&
        this.player.x < view.right + 40 &&
        this.player.y > view.y - 40 &&
        this.player.y < view.bottom + 40;
      if (!seen) this.player.setPosition(l.x - 120, l.y + 330);
      const from = Math.hypot(this.player.x - x, this.player.y - y);
      const duration = reduced ? 0 : Math.max(650, Math.min(2200, from * 2.2));
      this.cameras.main.pan(l.x, l.y + 90, duration, "Sine.easeInOut");
      this.report("walking");
      this.tweens.add({
        targets: this.player,
        x,
        y,
        duration,
        ease: "Sine.easeInOut",
        onUpdate: (tween: Phaser.Tweens.Tween) => {
          this.player.setDepth(this.player.y + 100);
          this.stride(reduced ? 0 : tween.elapsed);
          this.report("walking");
        },
        onComplete: () => {
          if (serial !== this.serial) return;
          this.stride(0);
          pendingVisit = null;
          this.report("idle");
          this.burst(x, y - 30);
          onVisit(id);
        },
      });
    }
  }
  const applyProgress = () => {
    for (const [id, m] of Object.entries(scene?.markers ?? {}))
      m.setText(pendingCompleted.includes(id) ? "✓" : "");
    for (const [id, c] of Object.entries(scene?.hidden ?? {}))
      if (pendingSecrets.includes(id) && c.list.length === 1) {
        c.add(
          scene!.add
            .text(0, 0, SECRETS.find((s) => s.id === id)!.icon, {
              fontSize: "24px",
            })
            .setOrigin(0.5),
        );
      }
  };
  const applyAppearance = () => {
    if (!scene?.initialized) return;
    for (const o of adornments) {
      scene.tweens.killTweensOf(o);
      o.destroy();
    }
    adornments = [];
    bagText?.destroy();
    bagText = undefined;
    if (appearance.bag) {
      bagText = scene.add.text(
        20,
        -42,
        appearance.bag === "scarf"
          ? "🧣"
          : appearance.bag === "rice"
            ? "🍛"
            : "🍜",
        { fontSize: "26px" },
      );
      scene.player.add(bagText);
    }
    const text = (x: number, y: number, t: string, size = 26) => {
      const o = scene.add
        .text(x, y, t, { fontSize: `${size}px` })
        .setOrigin(0.5)
        .setDepth(y + 180);
      adornments.push(o);
      return o;
    };
    const dots = (x: number, y: number, color: number) => {
      const g = scene.add.graphics().setDepth(y + 90);
      g.fillStyle(color)
        .fillCircle(x, y, 5)
        .fillCircle(x + 9, y - 5, 4)
        .fillCircle(x - 9, y - 5, 4);
      adornments.push(g);
    };
    if (pendingCompleted.includes("noodle-stall"))
      text(510, 375, appearance.meal === "rice" ? "🍛" : "🍜", 35);
    if (pendingCompleted.includes("market-haggling")) text(695, 385, "🧣", 33);
    if (appearance.picnic || appearance.picnicCount > 0) {
      const blanket = scene.add.graphics().setDepth(550);
      blanket.fillStyle(0xf1c9a5).fillRoundedRect(620, 560, 175, 76, 14);
      adornments.push(blanket);
      text(710, 570, "🧑‍🤝‍🧑", 34);
      text(710, 605, "🧺", 35);
      if (appearance.picnic || appearance.picnicCount >= 2)
        text(655, 605, "🍛", 28);
      if (appearance.picnicCount >= 3) text(760, 605, "🍈🍈", 24);
      adornments.push(
        scene.label(
          710,
          645,
          appearance.picnic
            ? "MALI SAVED YOU A SEAT"
            : "YOUR PICNIC IS GROWING",
          12,
        ),
      );
    }
    // Found secrets become distinct inhabitants and landmarks, not just journal text.
    if (pendingSecrets.includes("cat-parade"))
      for (let i = 0; i < 3; i++) {
        const cat = text(130 + i * 25, 530, "🐈", 25);
        if (!reduced)
          scene.tweens.add({
            targets: cat,
            x: cat.x + 55,
            duration: 2500 + i * 350,
            yoyo: true,
            repeat: -1,
          });
      }
    if (pendingSecrets.includes("tiny-door")) {
      const g = scene.add.graphics().setDepth(305);
      g.fillStyle(0x698970).fillRoundedRect(792, 140, 27, 38, 13);
      g.fillStyle(0xe2c873).fillCircle(812, 164, 3);
      adornments.push(g);
    }
    if (pendingSecrets.includes("bottle")) {
      const bottle = text(1720, 670, "💌", 29);
      if (!reduced)
        scene.tweens.add({
          targets: bottle,
          y: 678,
          duration: 1700,
          yoyo: true,
          repeat: -1,
        });
    }
    if (pendingSecrets.includes("paper-boat"))
      for (let i = 0; i < 3; i++) {
        const boat = text(940, 150 + i * 30, "⛵", 23);
        if (!reduced)
          scene.tweens.add({
            targets: boat,
            y: boat.y + 90,
            duration: 4000 + i * 500,
            yoyo: true,
            repeat: -1,
          });
      }
    if (pendingSecrets.includes("fireflies"))
      for (let i = 0; i < 16; i++) {
        const firefly = scene.add
          .circle(725 + ((i * 41) % 125), 1350 + ((i * 23) % 85), 2, 0xf5d27c)
          .setDepth(4000);
        adornments.push(firefly);
        if (!reduced)
          scene.tweens.add({
            targets: firefly,
            alpha: 0.15,
            y: firefly.y - 15,
            duration: 1000 + ((i * 131) % 1500),
            yoyo: true,
            repeat: -1,
          });
      }
    if (pendingSecrets.includes("orchard")) {
      const swing = text(130, 930, "🪑", 25);
      if (!reduced)
        scene.tweens.add({
          targets: swing,
          angle: 10,
          duration: 1600,
          yoyo: true,
          repeat: -1,
        });
      text(170, 920, "🥭", 30);
    }
    if (pendingSecrets.includes("shell")) {
      text(1630, 1400, "🐚", 38);
      for (let i = 0; i < 3; i++) text(1590 + i * 35, 1450, "〰", 18);
    }
    if (pendingSecrets.includes("turtle")) {
      const turtle = text(1050, 930, "🐢", 28);
      if (!reduced)
        scene.tweens.add({
          targets: turtle,
          x: 1090,
          y: 945,
          duration: 6000,
          yoyo: true,
          repeat: -1,
        });
    }
    if (pendingSecrets.includes("book")) {
      text(2470, 490, "📖", 33);
      text(2510, 520, "📚", 25);
    }
    if (pendingSecrets.includes("rainbow")) {
      const rainbow = scene.add.graphics().setDepth(1300);
      [0xd89988, 0xe4bf6c, 0x9eb77f, 0x7eaaa0, 0xa699be].forEach((c, i) => {
        rainbow
          .lineStyle(6, c, 0.9)
          .beginPath()
          .arc(1980, 1060, 95 - i * 8, Math.PI, 0, false)
          .strokePath();
      });
      adornments.push(rainbow);
    }
    if (pendingCompleted.includes("island-ferry")) {
      const ferry = text(1420, 1510, "⛵", 43);
      if (!reduced)
        scene.tweens.add({
          targets: ferry,
          x: 1580,
          duration: 6500,
          yoyo: true,
          repeat: -1,
        });
    }
    if (pendingCompleted.includes("hotel-checkin")) text(1420, 330, "💡", 23);
    if (pendingCompleted.includes("meet-parents")) text(290, 1120, "🍵", 25);
    if (pendingSecrets.length === 10)
      for (const d of DISTRICTS) text(d.x, d.y - 215, "✦", 28);
    if (appearance.decorations.includes("lanterns"))
      for (const d of DISTRICTS) {
        text(d.x - 120, d.y + 80, "🏮");
        text(d.x + 120, d.y + 80, "🏮");
      }
    if (appearance.decorations.includes("flowers"))
      for (let i = 0; i < 15; i++)
        dots(840 + (i % 2) * 175, 140 + i * 83, 0xcc9a9f);
    if (appearance.decorations.includes("cushions"))
      for (let i = 0; i < 4; i++) text(645 + i * 45, 650, "🟨", 21);
    if (appearance.decorations.includes("fish"))
      for (let i = 0; i < 6; i++) {
        const fish = text(938, 200 + i * 210, "🐟", 23);
        if (!reduced)
          scene.tweens.add({
            targets: fish,
            y: fish.y + 55,
            duration: 3000 + i * 160,
            yoyo: true,
            repeat: -1,
          });
      }
  };
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: parent.clientWidth,
    height: parent.clientHeight,
    transparent: false,
    backgroundColor: "#f1efdd",
    scene: Journey,
    scale: { mode: Phaser.Scale.RESIZE },
    render: { antialias: true },
    audio: { noAudio: true },
    input: { touch: { capture: false } },
    banner: false,
  });
  return {
    focus: (id) => {
      pendingDistrict = id;
      scene?.focus(id);
    },
    visit: (id) => {
      pendingVisit = id;
      scene?.walk(id);
    },
    cancel: () => {
      pendingVisit = null;
      scene?.cancel();
    },
    zoom: (delta) => {
      const c = scene?.cameras.main;
      if (c) c.setZoom(Phaser.Math.Clamp(c.zoom + delta, 0.3, 1.5));
    },
    pan: (x, y) => {
      const c = scene?.cameras.main;
      if (c) c.setScroll(c.scrollX + x / c.zoom, c.scrollY + y / c.zoom);
    },
    progress: (completed, secrets) => {
      pendingCompleted = completed;
      pendingSecrets = secrets;
      applyProgress();
      applyAppearance();
    },
    interactive: (enabled) => {
      acceptsInput = enabled;
      if (scene?.initialized) scene.input.enabled = enabled;
    },
    appearance: (decorations, meal, picnic, bag, picnicCount) => {
      appearance = { decorations, meal, picnic, bag, picnicCount };
      applyAppearance();
    },
    destroy: () => game.destroy(true),
  };
}
