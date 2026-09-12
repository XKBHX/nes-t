import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Pixel, RED, BLACK, WHITE } from '../src/graphics/pixel';

describe('pixel', () => {
  it('stores RGBA components', () => {
    const pixel = new Pixel(1, 2, 3, 4);
    assert.equal(pixel.red, 1);
    assert.equal(pixel.green, 2);
    assert.equal(pixel.blue, 3);
    assert.equal(pixel.alpha, 4);
  });

  it('compares, duplicates, and blends', () => {
    const pixel = new Pixel(10, 20, 30, 40);
    const copy = pixel.duplicate();
    assert.equal(pixel.isEqual(copy), true);

    const scaled = pixel.scale(2);
    assert.equal(scaled.red, 20);
    assert.equal(scaled.green, 40);
    assert.equal(pixel.red, 10);

    const added = BLACK.add(new Pixel(1, 2, 3, 0));
    assert.equal(added.red, 1);
    assert.equal(added.green, 2);
    assert.equal(added.blue, 3);
  });

  it('exposes named palette colors', () => {
    assert.equal(RED.isEqual(new Pixel(255, 0, 0)), true);
    assert.equal(WHITE.isEqual(new Pixel(255, 255, 255)), true);
    assert.equal(BLACK.isEqual(new Pixel(0, 0, 0)), true);
  });
});
