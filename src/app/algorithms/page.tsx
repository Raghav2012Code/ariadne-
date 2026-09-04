import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Play } from "lucide-react";

export const metadata: Metadata = {
  title: "Algorithm Guide — Ariadne",
  description:
    "How each pathfinding algorithm in Ariadne works: A*, Dijkstra, BFS, DFS, Greedy, Bidirectional BFS and Bidirectional A*.",
};

type Algo = {
  id: string;
  param: string;
  name: string;
  tag: string;
  badges: { label: string; tone: "green" | "amber" | "zinc" | "cyan" }[];
  steps: string[];
  notes: string[];
  complexity: string;
};

const badgeTone: Record<Algo["badges"][number]["tone"], string> = {
  green: "bg-emerald-400/10 text-emerald-300 border-emerald-400/20",
  amber: "bg-amber-400/10 text-amber-300 border-amber-400/20",
  zinc: "bg-white/[0.04] text-zinc-300 border-white/10",
  cyan: "bg-cyan-400/10 text-cyan-300 border-cyan-400/20",
};

const ALGOS: Algo[] = [
  {
    id: "astar",
    param: "astar",
    name: "A* Search",
    tag: "Best overall",
    badges: [
      { label: "Optimal · weighted", tone: "green" },
      { label: "Cost-aware", tone: "cyan" },
      { label: "Uses heuristic", tone: "zinc" },
    ],
    steps: [
      "Keeps an open list (binary heap) ordered by f = g + h: cost so far plus estimated cost to target.",
      "Always expands the most promising cell, records the path parent, and never re-expands closed cells.",
      "Stops the moment the target is popped — with an admissible heuristic, no cheaper path can exist.",
    ],
    notes: [
      "Default heuristic is Manhattan distance, exact for 4-direction movement. The Euclidean toggle stays admissible too, so optimality holds either way.",
      "Weighted cells (×5) steer it realistically: it will detour around expensive terrain when the detour is cheaper.",
    ],
    complexity: "O((V + E) log V) with a good heuristic",
  },
  {
    id: "dijkstra",
    param: "dijkstra",
    name: "Dijkstra",
    tag: "Weighted optimal",
    badges: [
      { label: "Optimal · weighted", tone: "green" },
      { label: "Cost-aware", tone: "cyan" },
      { label: "No heuristic", tone: "zinc" },
    ],
    steps: [
      "A* with the heuristic set to zero: expands strictly in order of cheapest-known cost from the start.",
      "Relaxes every reachable neighbor and settles each cell once its cheapest cost is proven.",
      "Guarantees the cheapest path on weighted boards — at the price of exploring uniformly in all directions.",
    ],
    notes: [
      "Use it as the ground truth: the test suite checks every other optimal algorithm against Dijkstra.",
      "On open boards expect a near-circular visited region — that is the algorithm proving nothing cheaper exists.",
    ],
    complexity: "O((V + E) log V)",
  },
  {
    id: "bfs",
    param: "bfs",
    name: "Breadth-First Search",
    tag: "Unweighted optimal",
    badges: [
      { label: "Optimal · step count", tone: "green" },
      { label: "Ignores weights", tone: "amber" },
      { label: "No heuristic", tone: "zinc" },
    ],
    steps: [
      "Explores layer by layer with a queue: all cells 1 step away, then 2 steps, then 3.",
      "Marks cells seen on enqueue so each cell enters the queue at most once.",
      "The first time the target is dequeued, its path has the fewest possible steps.",
    ],
    notes: [
      "Counts steps, not cost: on boards with ×5 weight cells the shortest-step path may not be the cheapest.",
      "Perfect when every move costs the same and you want the minimal number of moves.",
    ],
    complexity: "O(V + E) time · O(V) space",
  },
  {
    id: "dfs",
    param: "dfs",
    name: "Depth-First Search",
    tag: "Deep explorer",
    badges: [
      { label: "Not optimal", tone: "amber" },
      { label: "Ignores weights", tone: "amber" },
      { label: "No heuristic", tone: "zinc" },
    ],
    steps: [
      "Dives down one corridor with a stack, backtracking only when it hits a dead end.",
      "Like BFS it marks cells seen on push, keeping the stack linear instead of piling up duplicates.",
      "Returns the first path it stumbles into — fast to find something, with no quality promise.",
    ],
    notes: [
      "Watch it take dramatic scenic routes: great for showing why exploration order matters.",
      "Tiny memory footprint (the frontier is just the current trail), but paths can be far longer than optimal.",
    ],
    complexity: "O(V + E) time · slim frontier",
  },
  {
    id: "greedy",
    param: "greedy",
    name: "Greedy Best-First",
    tag: "Fast & loose",
    badges: [
      { label: "Not optimal", tone: "amber" },
      { label: "Ignores cost so far", tone: "amber" },
      { label: "Uses heuristic", tone: "zinc" },
    ],
    steps: [
      "Orders its heap by h alone — estimated distance to target — ignoring the cost already paid to get there.",
      "Sprints straight at the target and latches onto the first parent that reaches each cell.",
      "Often arrives quickly on open boards, but happily walks through expensive terrain or into traps.",
    ],
    notes: [
      "The classic speed-vs-quality tradeoff demo: race it against A* on a weighted maze.",
      "The Euclidean toggle changes its personality noticeably — try both.",
    ],
    complexity: "O((V + E) log V) · no optimality bound",
  },
  {
    id: "bibfs",
    param: "bibfs",
    name: "Bidirectional BFS",
    tag: "Meet in the middle",
    badges: [
      { label: "Optimal · step count", tone: "green" },
      { label: "Ignores weights", tone: "amber" },
      { label: "Two-sided", tone: "cyan" },
    ],
    steps: [
      "Grows two breadth-first frontiers at once — one from the start, one from the target.",
      "Each side tracks the cells the other has seen; the first cell seen by both joins the two halves.",
      "The final path stitches the forward parent-chain to the backward parent-chain at the meeting cell.",
    ],
    notes: [
      "Two half-depth searches beat one full-depth search: roughly the square root of the explored area.",
      "Like plain BFS it counts steps, so weights can make its path pricier than Dijkstra's.",
    ],
    complexity: "≈ O(b^(d/2)) per side",
  },
  {
    id: "biastar",
    param: "biastar",
    name: "Bidirectional A*",
    tag: "Fast optimal",
    badges: [
      { label: "Optimal · weighted", tone: "green" },
      { label: "Cost-aware", tone: "cyan" },
      { label: "Two-sided + heuristic", tone: "cyan" },
    ],
    steps: [
      "Runs a forward and a backward A* simultaneously, each with its own heap and cost-so-far map.",
      "Records every meeting of the two closed sets, but does not stop at the first one.",
      "Keeps expanding until max(forward best, backward best) ≥ best meeting cost — then no undiscovered path can win.",
    ],
    notes: [
      "Stopping at the first meeting would be subtly wrong on weighted boards; the bound above is what keeps it optimal.",
      "Usually the fastest optimal option here — compare its visited count against plain A*.",
    ],
    complexity: "≈ O(b^(d/2)) per side · optimal",
  },
];

function Badge({ label, tone }: { label: string; tone: keyof typeof badgeTone }) {
  return (
    <span
      className={`inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded-md border tracking-wide ${badgeTone[tone]}`}
    >
      {label}
    </span>
  );
}

export default function AlgorithmsPage() {
  return (
    <div className="h-[100dvh] overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 lg:px-6 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft size={14} /> Back to visualizer
        </Link>

        <h1 className="mt-4 text-[28px] font-bold tracking-tight">Algorithm guide</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-zinc-400 max-w-2xl">
          How each search in Ariadne works, what it guarantees, and when to pick it.
          Everything below runs on the same board model: 4-direction movement, walls that
          block, and weight cells that cost 5× a normal step.
        </p>

        <section className="mt-6 rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
          <span className="label-micro">Reading the visualization</span>
          <ul className="mt-2 grid sm:grid-cols-3 gap-2 text-[13px] text-zinc-300">
            <li className="flex items-center gap-2">
              <i className="w-3.5 h-3.5 rounded-[5px] block bg-[#4338ca]" /> Visited — settled &amp; explored
            </li>
            <li className="flex items-center gap-2">
              <i className="w-3.5 h-3.5 rounded-[5px] block border border-dashed border-cyan-300/70 bg-cyan-400/10" /> Frontier — discovered, queued
            </li>
            <li className="flex items-center gap-2">
              <i className="w-3.5 h-3.5 rounded-[5px] block bg-amber-400" /> Path — final route
            </li>
          </ul>
        </section>

        <div className="mt-6 flex flex-col gap-4">
          {ALGOS.map((a) => (
            <article
              key={a.id}
              className="rounded-lg border border-white/[0.08] bg-[#0A0C10] p-5"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-[17px] font-bold">{a.name}</h2>
                  <p className="text-[12px] text-zinc-500 font-medium mt-0.5">{a.tag}</p>
                </div>
                <Link
                  href={`/?algo=${a.param}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12px] font-semibold text-zinc-100 hover:bg-white/[0.08] transition-colors"
                >
                  <Play size={12} fill="currentColor" /> Try it
                </Link>
              </div>

              <div className="mt-2.5 flex gap-1.5 flex-wrap">
                {a.badges.map((b) => (
                  <Badge key={b.label} label={b.label} tone={b.tone} />
                ))}
              </div>

              <ol className="mt-3 flex flex-col gap-1.5 text-[13.5px] leading-relaxed text-zinc-300 list-decimal list-inside marker:text-zinc-500">
                {a.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>

              <ul className="mt-3 flex flex-col gap-1.5">
                {a.notes.map((n) => (
                  <li
                    key={n}
                    className="text-[13px] leading-relaxed text-zinc-400 border-l-2 border-indigo-400/40 pl-3"
                  >
                    {n}
                  </li>
                ))}
              </ul>

              <p className="mt-3 font-mono text-[11.5px] text-zinc-500">{a.complexity}</p>
            </article>
          ))}
        </div>

        <section className="mt-6 rounded-lg border border-white/[0.08] bg-white/[0.02] p-4 overflow-x-auto">
          <span className="label-micro">At a glance</span>
          <table className="mt-2 w-full text-[13px] min-w-[520px]">
            <thead>
              <tr className="text-left text-zinc-500 text-[11px] uppercase tracking-wider">
                <th className="py-1.5 pr-3 font-bold">Algorithm</th>
                <th className="py-1.5 pr-3 font-bold">Optimal</th>
                <th className="py-1.5 pr-3 font-bold">Weights</th>
                <th className="py-1.5 font-bold">Needs</th>
              </tr>
            </thead>
            <tbody className="text-zinc-300">
              {[
                ["A*", "Yes", "Full cost", "Admissible heuristic"],
                ["Dijkstra", "Yes", "Full cost", "Nothing"],
                ["BFS", "Steps only", "Ignored", "Nothing"],
                ["DFS", "No", "Ignored", "Nothing"],
                ["Greedy", "No", "Ignored", "Heuristic"],
                ["Bidirectional BFS", "Steps only", "Ignored", "Reversible moves"],
                ["Bidirectional A*", "Yes", "Full cost", "Heuristic + bound"],
              ].map((row) => (
                <tr key={row[0]} className="border-t border-white/[0.06]">
                  <td className="py-1.5 pr-3 font-semibold text-zinc-100">{row[0]}</td>
                  <td className="py-1.5 pr-3">{row[1]}</td>
                  <td className="py-1.5 pr-3">{row[2]}</td>
                  <td className="py-1.5">{row[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <p className="mt-6 text-[12px] text-zinc-600 leading-relaxed">
          Under the hood: open lists are binary heaps, neighbors are 4-directional,
          the default heuristic is Manhattan distance with an optional Euclidean mode
          for A* and Greedy. Optimality claims are checked in the test suite against
          Dijkstra over seeded weighted boards.
        </p>
      </div>
    </div>
  );
}
