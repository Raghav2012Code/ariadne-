import anime from "animejs";
import type { AnimationSpeed, Coordinate } from "@/types/animation";
import { STEP_DELAYS } from "@/types/animation";

type TimelineHandle = ReturnType<typeof anime.timeline>;

class GridAnimatorController {
  private activeTimeline: TimelineHandle | null = null;
  private activeToken = 0;
  private pendingTimers: number[] = [];
  private pendingSettlers: Array<() => void> = [];

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
    const settlers = this.pendingSettlers;
    this.pendingSettlers = [];
    for (const settle of settlers) {
      try {
        settle();
      } catch {
        /* settle must never throw */
      }
    }
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
      el.style.opacity = "";
      el.style.filter = "";
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
        el.style.borderRadius = "3px";
        el.style.boxShadow = "";
        el.style.opacity = "";
      }
      onComplete();
      return;
    }

    const delayMs = this.getDelay(speed);
    const targets: HTMLElement[] = [];
    for (const coord of visitedOrder) {
      const el = this.queryNode(coord) as HTMLElement | null;
      if (!el || this.isStartOrTarget(el)) continue;
      el.classList.add("is-visited");
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
      let fallback = 0;
      const dropSettler = () => {
        this.pendingSettlers = this.pendingSettlers.filter((s) => s !== settle);
        if (fallback) {
          window.clearTimeout(fallback);
          fallback = 0;
        }
      };
      const settle = () => {
        dropSettler();
        resolve();
      };
      this.pendingSettlers.push(settle);
      const tl = anime.timeline({
        easing: "easeOutElastic(1, .8)",
        autoplay: true,
        complete: () => {
          if (token === this.activeToken) {
            dropSettler();
            onComplete();
            resolve();
          }
        },
      });
      this.activeTimeline = tl;
      tl.add({
        targets,
        scale: [0.25, 1.18, 0.96, 1.0],
        backgroundColor: ["#0f0d2e", "#312e81", "#6d28d9", "#4338ca"],
        borderRadius: ["50%", "35%", "6px", "3px"],
        borderColor: ["#312e81", "#818cf8", "#4f46e5", "#1e1b4b"],
        boxShadow: [
          "0 0 0px rgba(129,140,248,0)",
          "0 0 16px rgba(129,140,248,.95)",
          "0 0 5px rgba(129,140,248,.4)",
          "0 0 0px rgba(129,140,248,0)",
        ],
        opacity: [0.35, 1, 1, 1],
        duration: 480,
        delay: anime.stagger(delayMs, { start: 0 }),
        easing: "easeOutElastic(1, .75)",
        update: () => {
          if (token !== this.activeToken) tl.pause();
        },
      });
      fallback = window.setTimeout(() => {
        if (token === this.activeToken) {
          dropSettler();
          onComplete();
          resolve();
        }
      }, targets.length * delayMs + 700);
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
      el.classList.remove("is-visited");
      el.style.backgroundColor = "";
      el.style.backgroundImage = "";
      el.style.transform = "";
      el.style.boxShadow = "";
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
      let fallback = 0;
      const dropSettler = () => {
        this.pendingSettlers = this.pendingSettlers.filter((s) => s !== settle);
        if (fallback) {
          window.clearTimeout(fallback);
          fallback = 0;
        }
      };
      const settle = () => {
        dropSettler();
        resolve();
      };
      this.pendingSettlers.push(settle);
      const done = () => {
        if (token !== this.activeToken) return;
        for (const el of targets) el.classList.add("is-path");
        dropSettler();
        onComplete();
        resolve();
      };
      const tl = anime.timeline({
        easing: "easeInOutSine",
        autoplay: true,
        complete: done,
      });
      this.activeTimeline = tl;
      tl.add({
        targets,
        scale: [0.7, 1.32, 1.0],
        backgroundColor: ["#f59e0b", "#fbbf24", "#fef08a"],
        boxShadow: [
          "0 0 0px rgba(251,191,36,0)",
          "0 0 20px rgba(251,191,36,1)",
          "0 0 8px rgba(251,191,36,.55)",
        ],
        borderColor: ["#b45309", "#fef08a", "#fef08a"],
        borderRadius: ["6px", "6px", "4px"],
        duration: 300,
        delay: anime.stagger(22),
        easing: "easeOutBack(1.4)",
        update: () => {
          if (token !== this.activeToken) tl.pause();
        },
      }).add({
        targets,
        scale: [1.0, 1.07, 1.0],
        boxShadow: [
          "0 0 8px rgba(251,191,36,.55)",
          "0 0 16px rgba(251,191,36,.9)",
          "0 0 7px rgba(251,191,36,.6)",
        ],
        duration: 320,
        delay: anime.stagger(12),
        easing: "easeInOutSine",
        update: () => {
          if (token !== this.activeToken) tl.pause();
        },
      });
      fallback = window.setTimeout(() => {
        if (token === this.activeToken) done();
      }, targets.length * 22 + 900);
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
        el.classList.add("is-wall-anim");
        el.style.backgroundColor = "#27272a";
        el.style.backgroundImage = "";
        el.style.transform = "scale(1)";
        el.style.opacity = "";
      }
      return;
    }
    const delayMs = this.getDelay(speed);
    const targets: HTMLElement[] = [];
    for (const coord of carvedWalls) {
      const el = this.queryNode(coord) as HTMLElement | null;
      if (!el) continue;
      el.classList.add("is-wall-anim");
      el.style.transform = "scale(0)";
      el.style.opacity = "0";
      targets.push(el);
    }
    if (targets.length === 0) return;
    return new Promise<void>((resolve) => {
      if (token !== this.activeToken) {
        resolve();
        return;
      }
      let fallback = 0;
      const dropSettler = () => {
        this.pendingSettlers = this.pendingSettlers.filter((s) => s !== settle);
        if (fallback) {
          window.clearTimeout(fallback);
          fallback = 0;
        }
      };
      const settle = () => {
        dropSettler();
        resolve();
      };
      this.pendingSettlers.push(settle);
      const tl = anime.timeline({
        easing: "easeOutQuad",
        autoplay: true,
        complete: () => {
          if (token === this.activeToken) {
            dropSettler();
            resolve();
          }
        },
      });
      this.activeTimeline = tl;
      tl.add({
        targets,
        scale: [0, 1.12, 1.0],
        opacity: [0, 1, 1],
        backgroundColor: ["#101318", "#2b3242", "#27272a"],
        boxShadow: [
          "0 0 0px rgba(148,163,184,0)",
          "0 0 10px rgba(148,163,184,.5)",
          "0 0 0px rgba(148,163,184,0)",
        ],
        duration: 170,
        delay: anime.stagger(Math.max(1, delayMs)),
        easing: "easeOutBack(1.6)",
        update: () => {
          if (token !== this.activeToken) tl.pause();
        },
      });
      fallback = window.setTimeout(() => {
        if (token === this.activeToken) {
          dropSettler();
          resolve();
        }
      }, targets.length * Math.max(1, delayMs) + 350);
      this.pendingTimers.push(fallback);
    });
  }
}

export const GridAnimator = new GridAnimatorController();
export type GridAnimatorType = typeof GridAnimator;
