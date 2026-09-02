export type AnimationSpeed = "SLOW" | "MEDIUM" | "FAST" | "INSTANT";

export type StepDelayConfig = Record<AnimationSpeed, number>;

export const STEP_DELAYS: StepDelayConfig = {
  SLOW: 40,
  MEDIUM: 15,
  FAST: 4,
  INSTANT: 0,
};

export type Coordinate = { row: number; col: number };
