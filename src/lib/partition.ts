// gpt-5-mini (whole file)
// Minimal TS interval-partitioning implementation
type Interval<T> = { item: T; start: number; end: number };

// Simple binary min-heap for tuples [key, value]
class MinHeap<T> {
  private data: Array<[number, T]> = [];
  private cmp(a: [number, T], b: [number, T]) { return a[0] - b[0]; }
  size() { return this.data.length; }
  peek(): [number, T] | undefined { return this.data[0]; }
  push(item: [number, T]) {
    this.data.push(item); this.siftUp(this.data.length - 1);
  }
  pop(): [number, T] | undefined {
    if (!this.data.length) return undefined;
    const top = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length) { this.data[0] = last; this.siftDown(0); }
    return top;
  }
  private siftUp(i: number) {
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (this.cmp(this.data[i], this.data[p]) >= 0) break;
      [this.data[i], this.data[p]] = [this.data[p], this.data[i]];
      i = p;
    }
  }
  private siftDown(i: number) {
    const n = this.data.length;
    while (true) {
      const l = 2 * i + 1, r = 2 * i + 2;
      let smallest = i;
      if (l < n && this.cmp(this.data[l], this.data[smallest]) < 0) smallest = l;
      if (r < n && this.cmp(this.data[r], this.data[smallest]) < 0) smallest = r;
      if (smallest === i) break;
      [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
      i = smallest;
    }
  }
}

export function partitionIntervals<T>(intervals: Interval<T>[]): Interval<T>[][] {
  // Sort by start time (stable)
  const arr = intervals.slice().sort((a,b) => a.start - b.start || a.end - b.end);

  const heap = new MinHeap<number>(); // stores [endTime, layerIndex]
  const layers: Interval<T>[][] = [];

  for (const it of arr) {
    const top = heap.peek();
    if (top && top[0] <= it.start) {
      // reuse layer
      const [, layerIdx] = heap.pop()!;
      layers[layerIdx].push(it);
      heap.push([it.end, layerIdx]);
    } else {
      // new layer
      const newIdx = layers.length;
      layers.push([it]);
      heap.push([it.end, newIdx]);
    }
  }
  return layers;
}
