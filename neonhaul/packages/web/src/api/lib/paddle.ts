import { Paddle } from "@paddle/paddle-node-sdk";

export function isPaddleConfigured() {
  return Boolean(process.env.PADDLE_API_KEY);
}

export const paddle = new Paddle(process.env.PADDLE_API_KEY ?? "");
