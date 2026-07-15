import { hc } from "hono/client";
import type { AppType } from "../../api";
import { authClient } from "./auth";

const client = hc<AppType>("/", {
  headers: () => {
    const token = authClient.managedAuth.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
});

export const api = client.api;
