export interface MockGraphqlClient {
  readonly request: jest.Mock;
}

export const mockGraphqlClient = (): MockGraphqlClient => ({
  request: jest.fn(),
});
