/**
 * In-memory mock database that mirrors the Supabase query interface.
 * Used automatically when NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY
 * are not provided in environment variables, allowing local dev and testing.
 */

interface Row {
  id?: string;
  [key: string]: unknown;
}

// Global in-memory storage across API route invocations in dev server
declare global {
  // eslint-disable-next-line no-var
  var __PIXSORT_MOCK_DB__: Record<string, Row[]> | undefined;
}

function getStore(): Record<string, Row[]> {
  if (!globalThis.__PIXSORT_MOCK_DB__) {
    globalThis.__PIXSORT_MOCK_DB__ = {
      users: [
        {
          id: '00000000-0000-0000-0000-000000000001',
          name: 'Host',
          is_guest: false,
          created_at: new Date().toISOString(),
        },
      ],
      events: [],
      event_members: [],
      moments: [],
      photos: [],
      faces: [],
      face_clusters: [],
      favorites: [],
      hidden_photos: [],
      comments: [],
    };
  }
  return globalThis.__PIXSORT_MOCK_DB__;
}

class MockQueryBuilder {
  private table: string;
  private filters: ((row: Row) => boolean)[] = [];
  private orderCol: string | null = null;
  private orderAsc = true;
  private limitCount: number | null = null;
  private pendingInsert: Row[] | null = null;
  private pendingUpdate: Record<string, unknown> | null = null;
  private isDelete = false;

  constructor(table: string) {
    this.table = table;
  }

  select(_columns = '*') {
    return this;
  }

  insert(data: Row | Row[]) {
    const store = getStore();
    if (!store[this.table]) store[this.table] = [];

    const items = Array.isArray(data) ? data : [data];
    const inserted = items.map((item) => ({
      id: item.id || `mock-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      created_at: item.created_at || new Date().toISOString(),
      ...item,
    }));

    store[this.table].push(...inserted);
    this.pendingInsert = inserted;
    return this;
  }

  update(values: Record<string, unknown>) {
    this.pendingUpdate = values;
    return this;
  }

  delete() {
    this.isDelete = true;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  neq(column: string, value: unknown) {
    this.filters.push((row) => row[column] !== value);
    return this;
  }

  in(column: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }

  order(column: string, { ascending = true }: { ascending?: boolean } = {}) {
    this.orderCol = column;
    this.orderAsc = ascending;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number) {
    this.limitCount = to - from + 1;
    return this;
  }

  async single(): Promise<{ data: Row | null; error: Error | null }> {
    const res = await this.execute();
    if (res.error) return { data: null, error: res.error };
    const first = (res.data as Row[])[0] ?? null;
    return { data: first, error: null };
  }

  async maybeSingle(): Promise<{ data: Row | null; error: Error | null }> {
    return this.single();
  }

  // Promise-like resolution when awaited directly without .single()
  then<TResult1 = { data: Row[] | null; error: Error | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: Row[] | null; error: Error | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<{ data: Row[] | null; error: Error | null }> {
    const store = getStore();
    if (!store[this.table]) store[this.table] = [];

    // If an insert was just made and select() called
    if (this.pendingInsert) {
      return { data: this.pendingInsert, error: null };
    }

    let rows = store[this.table];

    // Apply updates if pending
    if (this.pendingUpdate) {
      for (const row of rows) {
        if (this.filters.every((f) => f(row))) {
          Object.assign(row, this.pendingUpdate);
        }
      }
      return { data: rows.filter((row) => this.filters.every((f) => f(row))), error: null };
    }

    // Apply deletes if pending
    if (this.isDelete) {
      const remaining = rows.filter((row) => !this.filters.every((f) => f(row)));
      store[this.table] = remaining;
      return { data: [], error: null };
    }

    // Apply filters
    if (this.filters.length > 0) {
      rows = rows.filter((row) => this.filters.every((f) => f(row)));
    }

    // Apply sorting
    if (this.orderCol) {
      const col = this.orderCol;
      const asc = this.orderAsc;
      rows = [...rows].sort((a, b) => {
        const valA = a[col] as number | string | undefined;
        const valB = b[col] as number | string | undefined;
        if (valA === valB) return 0;
        if (valA === undefined) return 1;
        if (valB === undefined) return -1;
        return asc ? (valA > valB ? 1 : -1) : valA < valB ? 1 : -1;
      });
    }

    // Apply limit
    if (this.limitCount !== null) {
      rows = rows.slice(0, this.limitCount);
    }

    return { data: rows, error: null };
  }
}

export function createMockClient() {
  return {
    from: (table: string) => new MockQueryBuilder(table),
    storage: {
      from: () => ({
        upload: async (_path: string, _file: unknown) => ({ data: { path: _path }, error: null }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: `/landing/wedding.svg` } }),
      }),
    },
  };
}
