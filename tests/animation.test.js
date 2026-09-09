import test from 'node:test';
import assert from 'node:assert/strict';
import { ActorAnimator } from '../src/animation.js';
import * as G from '../src/game.js';

test('gait follows actual travel, stops at rest, freezes on pause, and ignores teleporting', () => {
  const animator = new ActorAnimator(), actor = { x: 10, y: 10 };
  const idle = { ...animator.pose(actor, 0) };
  actor.x += .25;
  const run = { ...animator.pose(actor, .1) };
  assert.ok(run.pace > 0); assert.notEqual(run.step, idle.step);
  assert.deepEqual(animator.pose(actor, .1), run);
  for (let t = .2; t < 1; t += .1) animator.pose(actor, t);
  assert.ok(animator.pose(actor, 1).pace < .001);
  actor.x += 20; assert.equal(animator.pose(actor, 1.1).pace, 0);
});

test('windup and strike poses follow simulation events for hero and all monsters', () => {
  for (const type of ['wolf', 'draugr', 'breaker', 'boss']) {
    const g = G.createGame();
    const enemy = G.makeEnemy(type, g.player.x + 1, g.player.y, type);
    // A boss only engages inside its arena.
    if (type === 'boss') { Object.assign(g.player, G.BOSS_POS); enemy.x = g.player.x + 1; enemy.y = g.player.y; }
    g.enemies = [enemy];
    const animator = new ActorAnimator();
    G.tick(g, .1); assert.equal(enemy.phase, 'windup');
    const start = animator.pose(enemy, g.time).windup;
    G.tick(g, .1); assert.ok(animator.pose(enemy, g.time).windup > start);
    for (let i = 0; i < 20 && enemy.phase === 'windup'; i++) G.tick(g, .1);
    assert.ok(Number.isFinite(enemy.strikeAt));
    assert.ok(animator.pose(enemy, g.time).strike > 0);
  }
  const g = G.createGame(); G.attack(g);
  assert.equal(new ActorAnimator().pose(g.player, g.time).strike, 1);
});

test('a breaker striking a wall also emits an attack animation', () => {
  const g = G.createGame(); g.home = { x: 20, y: 35 };
  g.parts = [{ id: 1, type: 'wall', x: 20, y: 35, hp: 150 }];
  const e = G.makeEnemy('breaker', 19.3, 35, 'breaker', true); g.enemies = [e];
  for (let i = 0; i < 20 && e.strikeAt === undefined; i++) G.tick(g, .1);
  assert.ok(Number.isFinite(e.strikeAt)); assert.ok(g.parts[0].hp < 150);
});
