/**
 * Every number that defines how movement feels. Units: pixels and seconds.
 * Characters override a subset (Bulgo is heavier and punchier; Slickwick will
 * be faster and slipperier).
 */
export interface MovementTuning {
  runSpeed: number;
  groundAccel: number;
  groundDecel: number;
  /** Acceleration when reversing direction on the ground (skid). */
  turnAccel: number;
  airAccel: number;
  airDecel: number;

  gravity: number;
  /** Extra gravity while falling — snappier, less floaty arcs. */
  fallGravityMultiplier: number;
  /** Reduced gravity near the apex while jump is held — "hang time". */
  apexGravityMultiplier: number;
  apexThreshold: number;
  maxFallSpeed: number;

  jumpSpeed: number;
  /** Upward velocity is multiplied by this when jump is released early. */
  jumpCutMultiplier: number;
  doubleJumpSpeed: number;
  airJumps: number;
  coyoteTime: number;
  jumpBufferTime: number;

  wallSlideSpeed: number;
  wallJumpSpeedX: number;
  wallJumpSpeedY: number;
  wallJumpControlLock: number;

  slideSpeed: number;
  slideDuration: number;
  /** Minimum horizontal speed to turn a crouch into a slide. */
  slideMinSpeed: number;

  climbSpeed: number;
  dropThroughTime: number;
}

export const DEFAULT_TUNING: MovementTuning = {
  runSpeed: 150,
  groundAccel: 1250,
  groundDecel: 1700,
  turnAccel: 2600,
  airAccel: 950,
  airDecel: 360,

  gravity: 1150,
  fallGravityMultiplier: 1.3,
  apexGravityMultiplier: 0.55,
  apexThreshold: 45,
  maxFallSpeed: 430,

  jumpSpeed: 395,
  jumpCutMultiplier: 0.45,
  doubleJumpSpeed: 345,
  airJumps: 1,
  coyoteTime: 0.1,
  jumpBufferTime: 0.12,

  wallSlideSpeed: 75,
  wallJumpSpeedX: 210,
  wallJumpSpeedY: 370,
  wallJumpControlLock: 0.15,

  slideSpeed: 270,
  slideDuration: 0.42,
  slideMinSpeed: 95,

  climbSpeed: 85,
  dropThroughTime: 0.22,
};
