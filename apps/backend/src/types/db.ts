export interface QueryResult<Row> {
  rows: Row[];
  rowCount?: number | null;
}

export interface DbClient {
  query<Row = Record<string, unknown>>(text: string, params?: readonly unknown[]): Promise<QueryResult<Row>>;
  transaction<T>(callback: (client: {
    query<Row = Record<string, unknown>>(text: string, params?: readonly unknown[]): Promise<QueryResult<Row>>;
  }) => Promise<T>): Promise<T>;
  stats(): Promise<Record<string, number>>;
  recentEvents(limit?: number): Promise<unknown[]>;
}

