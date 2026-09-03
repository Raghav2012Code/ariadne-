import anime from "animejs";
import type { AnimationSpeed, Coordinate } from "@/types/animation";
import { STEP_DELAYS } from "@/types/animation";

type TimelineHandle = ReturnType<typeof anime.timeline>;

class GridAnimatorController {
  private activeTimeline: TimelineHandle | null = null;
  private activeToken = 0;
  private pendingTimers: number[] = [];

  private getDelay(speed: AnimationSpeed): number {
    return STEP_DELAYS[speed];
  }

  private isStartOrTarget(el: Element | null): boolean {
    if (!el) return false;
    return el.classList.contains("is-start") || el.classList.contains("is-target");
  }

  private queryNode(coord: Coordinate): Element | null {
    return document.querySelector(`[data-node="${coord.row}-${coord.col}"]`);
  }

  cancelAnimation(): void {
    this.activeToken++;
    if (this.activeTimeline) {
      try {
        this.activeTimeline.pause();
      } catch {
        /* timeline already settled */
      }
      this.activeTimeline = null;
    }
    try {
      anime.remove(".node-cell");
    } catch {
      /* nothing to remove */
    }
    for (const t of this.pendingTimers) window.clearTimeout(t);
    this.pendingTimers = [];
  }

  resetCellStyles(): void {
    this.cancelAnimation();
    const nodes = document.querySelectorAll<HTMLElement>("[data-node]");
    nodes.forEach((el) => {
      if (el.classList.contains("is-start") || el.classList.contains("is-target")) return;
      el.classList.remove("is-visited", "is-frontier", "is-path", "is-wall-anim");
      el.style.backgroundColor = "";
      el.style.transform = "";
      el.style.boxShadow = "";
      el.style.borderColor = "";
      el.style.borderRadius = "";
      el.style.backgroundImage = "";
    });
  }

  async animateVisitedNodes(
    visitedOrder: Coordinate[],
    speed: AnimationSpeed,
    onComplete: () => void
  ): Promise<void> {
    if (visitedOrder.length === 0) {
      onComplete();
      return;
    }
    this.cancelAnimation();
    const token = ++this.activeToken;

    if (speed === "INSTANT") {
      for (const coord of visitedOrder) {
        if (token !== this.activeToken) return;
        const el = this.queryNode(coord) as HTMLElement | null;
        if (!el || this.isStartOrTarget(el)) continue;
        el.classList.add("is-visited");
        el.style.backgroundColor = "#4338ca";
        el.style.backgroundImage = "";
        el.style.borderColor = "#1e1b4b";
        el.style.transform = "scale(1)";
        el.style.borderRadius = "2px";
      }
      onComplete();
      return;
    }

    const delayMs = this.getDelay(speed);
    const targets: HTMLElement[] = [];
    for (const coord of visitedOrder) {
      const el = this.queryNode(coord) as HTMLElement | null;
      if (!el || this.isStartOrTarget(el)) continue;
      targets.push(el);
    }
    if (targets.length === 0) {
      onComplete();
      return;
    }

    return new Promise<void>((resolve) => {
      if (token !== this.activeToken) {
        resolve();
        return;
      }
      const tl = anime.timeline({
        easing: "easeOutElastic(1, .8)",
        autoplay: true,
        complete: () => {
          if (token === this.activeToken) {
            onComplete();
            resolve();
          }
        },
      });
      this.activeTimeline = tl;
      tl.add({
        targets,
        scale: [0.3, 1.15, 1.0],
        backgroundColor: ["#1e1b4b", "#312e81", "#4338ca"],
        borderRadius: ["50%", "30%", "2px"],
        borderColor: ["#312e81", "#4f46e5", "#1e1b4b"],
        duration: 420,
        delay: anime.stagger(delayMs, { start: 0 }),
        easing: "easeOutElastic(1, .8)",
        update: () => {
          if (token !== this.activeToken) tl.pause();
        },
      });
      const fallback = window.setTimeout(() => {
        if (token === this.activeToken) {
          onComplete();
          resolve();
        }
      }, targets.length * delayMs + 600);
      this.pendingTimers.push(fallback);
    });
  }

  async animateShortestPath(
    pathNodes: Coordinate[],
    onComplete: () => void
  ): Promise<void> {
    if (pathNodes.length === 0) {
      onComplete();
      return;
    }
    this.cancelAnimation();
    const token = ++this.activeToken;
    const targets: HTMLElement[] = [];
    for (const coord of pathNodes) {
      const el = this.queryNode(coord) as HTMLElement | null;
      if (!el || this.isStartOrTarget(el)) continue;
      el.style.backgroundColor = "";
      el.style.backgroundImage = "";
      el.style.transform = "";
      targets.push(el);
    }
    if (targets.length === 0) {
      onComplete();
      return;
    }

    return new Promise<void>((resolve) => {
      if (token !== this.activeToken) {
        resolve();
        return;
      }
      const tl = anime.timeline({
        easing: "easeInOutSine",
        autoplay: true,
        complete: () => {
          if (token === this.activeToken) {
            onComplete();
            resolve();
          }
        },
      });
      this.activeTimeline = tl;
      tl.add({
        targets,
        scale: [0.8, 1.25, 1.0],
        backgroundColor: ["#f59e0b", "#fbbf24", "#fef08a"],
        boxShadow: ["0 0 0px #fbbf24", "0 0 15px #fbbf24", "0 0 6px #f59e0b"],
        borderColor: ["#fef08a", "#fef08a", "#fef08a"],
        duration: 350,
        delay: anime.stagger(25),
        easing: "easeInOutSine",
        update: () => {
          if (token !== this.activeToken) tl.pause();
        },
      });
      const fallback = window.setTimeout(() => {
        if (token === this.activeToken) {
          onComplete();
          resolve();
        }
      }, targets.length * 25 + 500);
      this.pendingTimers.push(fallback);
    });
  }

  async animateMazeGeneration(
    carvedWalls: Coordinate[],
    speed: AnimationSpeed
  ): Promise<void> {
    if (carvedWalls.length === 0) return;
    this.cancelAnimation();
    const token = ++this.activeToken;
    if (speed === "INSTANT") {
      for (const coord of carvedWalls) {
        if (token !== this.activeToken) return;
        const el = this.queryNode(coord) as HTMLElement | null;
        if (!el) continue;
        el.style.backgroundColor = "#27272a";
        el.style.backgroundImage = "";
        el.style.transform = "scale(1)";
      }
      return;
    }
    const delayMs = this.getDelay(speed);
    const targets: HTMLElement[] = [];
    for (const coord of carvedWalls) {
      const el = this.queryNode(coord) as HTMLElement | null;
      if (!el) continue;
      el.style.transform = "scale(0)";
      targets.push(el);
    }
    if (targets.length === 0) return;
    return new Promise<void>((resolve) => {
      if (token !== this.activeToken) {
        resolve();
        return;
      }
      const tl = anime.timeline({
        easing: "easeOutQuad",
        autoplay: true,
        complete: () => {
          if (token === this.activeToken) resolve();
        },
      });
      this.activeTimeline = tl;
      tl.add({
        targets,
        scale: [0, 1],
        backgroundColor: ["#18181b", "#27272a"],
        duration: 150,
        delay: anime.stagger(Math.max(1, delayMs)),
        easing: "easeOutQuad",
        update: () => {
          if (token !== this.activeToken) tl.pause();
        },
      });
      const fallback = window.setTimeout(() => {
        if (token === this.activeToken) resolve();
      }, targets.length * Math.max(1, delayMs) + 300);
      this.pendingTimers.push(fallback);
    });
  }
}

export const GridAnimator = new GridAnimatorController();
export type GridAnimatorType = typeof GridAnimator;
