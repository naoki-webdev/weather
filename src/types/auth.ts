export type AuthUser = {
  id: number;
  name: string;
  email: string;
  read_only: boolean;
};

export type SessionResponse = {
  user: AuthUser;
  token?: string;
};
