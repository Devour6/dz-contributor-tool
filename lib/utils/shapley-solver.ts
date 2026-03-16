import type { ShapleyInput, ShapleyOutput } from "@/lib/types/shapley";

// --- Graph types ---

interface GraphEdge {
  target: string;
  latency: number;
}

type Graph = Map<string, GraphEdge[]>;

// --- Bit manipulation helpers ---

function popcount(n: number): number {
  let count = 0;
  while (n) {
    count += n & 1;
    n >>>= 1;
  }
  return count;
}

function precomputeFactorials(n: number): Float64Array {
  const f = new Float64Array(n + 1);
  f[0] = 1;
  for (let i = 1; i <= n; i++) {
    f[i] = f[i - 1] * i;
  }
  return f;
}

// --- Metro code extraction ---

// --- Graph construction ---

function buildCoalitionGraph(
  input: ShapleyInput,
  operators: string[],
  coalitionMask: number
): Graph {
  const graph: Graph = new Map();
  const activeOps = new Set<string>();
  for (let i = 0; i < operators.length; i++) {
    if (coalitionMask & (1 << i)) {
      activeOps.add(operators[i]);
    }
  }

  const addEdge = (from: string, to: string, latency: number) => {
    let edges = graph.get(from);
    if (!edges) {
      edges = [];
      graph.set(from, edges);
    }
    edges.push({ target: to, latency });
  };

  // Build device→operator map for this input
  const deviceOps = new Map<string, Set<string>>();
  for (const d of input.devices) {
    let ops = deviceOps.get(d.device);
    if (!ops) {
      ops = new Set();
      deviceOps.set(d.device, ops);
    }
    ops.add(d.operator);
  }

  // Private links: both endpoints must have at least one active operator
  for (const link of input.private_links) {
    const ops1 = deviceOps.get(link.device1);
    const ops2 = deviceOps.get(link.device2);
    const hasActive1 = ops1 && [...ops1].some((op) => activeOps.has(op));
    const hasActive2 = ops2 && [...ops2].some((op) => activeOps.has(op));
    if (hasActive1 && hasActive2) {
      addEdge(link.device1, link.device2, link.latency);
      addEdge(link.device2, link.device1, link.latency);
    }
  }

  // Public links: always available (they represent the internet baseline)
  for (const link of input.public_links) {
    addEdge(link.city1, link.city2, link.latency);
    addEdge(link.city2, link.city1, link.latency);
  }

  return graph;
}

// --- Dijkstra shortest path ---

function shortestPath(graph: Graph, start: string, end: string): number {
  if (start === end) return 0;

  const dist = new Map<string, number>();
  dist.set(start, 0);

  // Simple priority queue using sorted array (graph is small, ~30-50 nodes)
  const pq: [number, string][] = [[0, start]];

  while (pq.length > 0) {
    // Find minimum
    let minIdx = 0;
    for (let i = 1; i < pq.length; i++) {
      if (pq[i][0] < pq[minIdx][0]) minIdx = i;
    }
    const [d, node] = pq[minIdx];
    pq[minIdx] = pq[pq.length - 1];
    pq.pop();

    if (node === end) return d;
    if (d > (dist.get(node) ?? Infinity)) continue;

    const edges = graph.get(node);
    if (!edges) continue;
    for (const edge of edges) {
      const newDist = d + edge.latency;
      if (newDist < (dist.get(edge.target) ?? Infinity)) {
        dist.set(edge.target, newDist);
        pq.push([newDist, edge.target]);
      }
    }
  }

  return Infinity;
}

// --- Coalition value function ---

function evaluateCoalition(
  input: ShapleyInput,
  operators: string[],
  coalitionMask: number
): number {
  if (coalitionMask === 0) return 0;

  const graph = buildCoalitionGraph(input, operators, coalitionMask);

  let totalValue = 0;
  for (const demand of input.demands) {
    const pathLatency = shortestPath(graph, demand.start, demand.end);
    if (pathLatency === Infinity) continue;

    // Value inversely proportional to latency
    const demandValue =
      (demand.traffic * demand.priority * demand.receivers) /
      (1 + pathLatency);

    totalValue += demandValue;
  }

  return totalValue * input.demand_multiplier;
}

// --- Uptime adjustment ---

function applyUptime(
  coalitionValues: Float64Array,
  n: number,
  uptime: number
): Float64Array {
  if (uptime >= 0.9999) return coalitionValues;

  const nCoalitions = 1 << n;
  const expected = new Float64Array(nCoalitions);

  for (let S = 0; S < nCoalitions; S++) {
    let ev = 0;
    const sizeS = popcount(S);

    // Iterate over all subsets T of S (including empty set)
    // Using Gosper's trick for subset enumeration
    let T = S;
    while (T > 0) {
      const sizeT = popcount(T);
      const prob =
        Math.pow(uptime, sizeT) * Math.pow(1 - uptime, sizeS - sizeT);
      ev += prob * coalitionValues[T];
      T = (T - 1) & S;
    }
    // Empty subset (T=0)
    ev += Math.pow(1 - uptime, sizeS) * coalitionValues[0];

    expected[S] = ev;
  }

  return expected;
}

// --- Main Shapley computation ---

export function computeShapley(input: ShapleyInput): ShapleyOutput {
  const operatorSet = new Set<string>();
  for (const d of input.devices) {
    operatorSet.add(d.operator);
  }
  const operators = Array.from(operatorSet).sort();
  const n = operators.length;

  if (n === 0) return {};
  if (n > 20) {
    // Safety: 2^20 = 1M coalitions, anything beyond is too expensive
    throw new Error(`Too many operators (${n}) for exact Shapley computation`);
  }

  const nCoalitions = 1 << n;

  // Evaluate all coalitions
  const coalitionValues = new Float64Array(nCoalitions);
  for (let mask = 0; mask < nCoalitions; mask++) {
    coalitionValues[mask] = evaluateCoalition(input, operators, mask);
  }

  // Apply uptime adjustment
  const expectedValues = applyUptime(
    coalitionValues,
    n,
    input.operator_uptime
  );

  // Compute Shapley values
  const factorials = precomputeFactorials(n);
  const shapleyValues = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    let value = 0;
    for (let mask = 0; mask < nCoalitions; mask++) {
      if (!(mask & (1 << i))) continue; // operator i not in coalition
      const withoutOp = mask ^ (1 << i);
      const sizeS = popcount(mask);
      const weight =
        (factorials[sizeS - 1] * factorials[n - sizeS]) / factorials[n];
      value += weight * (expectedValues[mask] - expectedValues[withoutOp]);
    }
    shapleyValues[i] = value;
  }

  // Normalize to shares
  const totalValue = shapleyValues.reduce((a, b) => a + b, 0);
  const output: ShapleyOutput = {};
  for (let i = 0; i < n; i++) {
    output[operators[i]] = {
      value: shapleyValues[i],
      share: totalValue > 0 ? shapleyValues[i] / totalValue : 0,
    };
  }

  return output;
}
