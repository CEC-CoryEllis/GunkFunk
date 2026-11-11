import { describe, expect, it } from "vitest";
import { TRANSPARENT, hex, isOpaque, red, toHex } from "../../../src/art/pixel/color";
import { bayer, rampAt } from "../../../src/art/pixel/paint";
import { PixelCanvas, outlinedLayer } from "../../../src/art/pixel/pixel-canvas";
import { drawPixelMap } from "../../../src/art/pixel/pixel-map";
import { fillCapsule, fillCircle, fillRect, line } from "../../../src/art/pixel/shapes";
import { buildSheet } from "../../../src/art/pixel/sprite-sheet";

const RED = hex("#ff0000");
const BLUE = hex("#0000ff");

function count(canvas: PixelCanvas): number {
  let n = 0;
  for (const p of canvas.pixels) {
    if (isOpaque(p)) n++;
  }
  return n;
}

describe("color", () => {
  it("round-trips hex colours", () => {
    expect(toHex(hex("#12abef"))).toBe("#12abef");
    expect(toHex(hex("#fff"))).toBe("#ffffff");
    expect(red(RED)).toBe(255);
  });

  it("rejects malformed colours loudly", () => {
    expect(() => hex("green")).toThrow();
  });
});

describe("PixelCanvas", () => {
  it("rounds fractional coordinates instead of wrapping rows", () => {
    const c = new PixelCanvas(8, 8);
    c.set(3, 2.5, RED); // must land on row 3 (rounded), never row 2 + half a row
    expect(c.get(3, 3)).toBe(RED);
    expect(c.get(7, 2)).toBe(TRANSPARENT);
    expect(count(c)).toBe(1);
  });

  it("ignores out-of-bounds writes", () => {
    const c = new PixelCanvas(4, 4);
    c.set(-1, 0, RED);
    c.set(4, 0, RED);
    c.set(0, 99, RED);
    expect(count(c)).toBe(0);
  });

  it("outlines shapes with a 1px border", () => {
    const c = new PixelCanvas(10, 10);
    fillRect(c, 4, 4, 2, 2, RED);
    c.outline(BLUE);
    expect(c.get(3, 4)).toBe(BLUE);
    expect(c.get(4, 3)).toBe(BLUE);
    expect(c.get(3, 3)).toBe(TRANSPARENT); // 4-neighbourhood: no corners
    expect(count(c)).toBe(4 + 8);
  });

  it("composites outlined layers back-to-front", () => {
    const c = new PixelCanvas(10, 10);
    outlinedLayer(c, BLUE, (layer) => fillRect(layer, 2, 2, 3, 3, RED));
    expect(c.get(3, 3)).toBe(RED);
    expect(c.get(1, 3)).toBe(BLUE);
  });

  it("mirrors when drawing flipped", () => {
    const src = new PixelCanvas(3, 1);
    src.set(0, 0, RED);
    const dst = new PixelCanvas(3, 1);
    dst.draw(src, 0, 0, true);
    expect(dst.get(2, 0)).toBe(RED);
    expect(dst.get(0, 0)).toBe(TRANSPARENT);
  });
});

describe("shapes", () => {
  it("draws symmetric circles", () => {
    const c = new PixelCanvas(20, 20);
    fillCircle(c, 10, 10, 4, RED);
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 20; x++) {
        expect(c.isFilled(x, y)).toBe(c.isFilled(19 - x, y));
      }
    }
  });

  it("draws Bresenham lines including both endpoints", () => {
    const c = new PixelCanvas(10, 10);
    line(c, 1, 1, 8, 4, RED);
    expect(c.get(1, 1)).toBe(RED);
    expect(c.get(8, 4)).toBe(RED);
  });

  it("passes cylinder normals to capsule paints", () => {
    const c = new PixelCanvas(20, 10);
    const normals: number[] = [];
    fillCapsule(c, 3, 5, 16, 5, 3, (_x, _y, _nx, ny) => {
      normals.push(ny);
      return RED;
    });
    expect(Math.min(...normals)).toBeLessThan(-0.5);
    expect(Math.max(...normals)).toBeGreaterThan(0.5);
  });
});

describe("paint", () => {
  it("keeps Bayer thresholds strictly inside (0, 1)", () => {
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        expect(bayer(x, y)).toBeGreaterThan(0);
        expect(bayer(x, y)).toBeLessThan(1);
      }
    }
  });

  it("maps lightness extremes to ramp ends", () => {
    const ramp = [RED, BLUE, hex("#00ff00")];
    expect(rampAt(ramp, 0, 0, 0, 1)).toBe(RED);
    expect(rampAt(ramp, 1, 0, 0, 1)).toBe(hex("#00ff00"));
  });
});

describe("pixel maps", () => {
  it("draws legend colours and fails on unknown characters", () => {
    const c = new PixelCanvas(4, 2);
    drawPixelMap(c, 0, 0, ["r.b", ".r."], { r: RED, b: BLUE });
    expect(c.get(0, 0)).toBe(RED);
    expect(c.get(2, 0)).toBe(BLUE);
    expect(() => drawPixelMap(c, 0, 0, ["x"], { r: RED })).toThrow(/legend/);
  });
});

describe("sprite sheets", () => {
  it("packs frames and indexes animations in order", () => {
    const dot = (x: number) => (c: PixelCanvas) => c.set(x, 0, RED);
    const sheet = buildSheet({
      key: "test",
      frameWidth: 4,
      frameHeight: 2,
      originX: 2,
      originY: 2,
      animations: [
        { name: "a", frameRate: 10, repeat: -1, frames: [dot(0), dot(1)] },
        { name: "b", frameRate: 10, repeat: 0, frames: [dot(2)] },
      ],
    });
    expect(sheet.frameCount).toBe(3);
    expect(sheet.animations[1]!.key).toBe("test:b");
    expect(sheet.animations[1]!.frames).toEqual([2]);
    expect(sheet.canvas.get(4 + 1, 0)).toBe(RED); // frame 1, x = 1
  });
});
