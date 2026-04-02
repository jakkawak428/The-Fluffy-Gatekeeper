import { readFileSync, writeFileSync } from "fs";
import path from "path";

interface PromptData {
  truthOrDare: {
    truth: string[];
    dare: string[];
  };
  wouldYouRather: string[];
  paranoia: string[];
}

const PROMPTS_PATH = path.join(__dirname, "..", "..", "src", "prompts.json");

let promptCache: PromptData | null = null;

function loadPrompts(): PromptData {
  if (promptCache) return promptCache;
  const raw = readFileSync(PROMPTS_PATH, "utf-8");
  promptCache = JSON.parse(raw) as PromptData;
  return promptCache;
}

export function getRandomTruth(): string {
  const prompts = loadPrompts().truthOrDare.truth;
  return prompts[Math.floor(Math.random() * prompts.length)]!;
}

export function getRandomDare(): string {
  const prompts = loadPrompts().truthOrDare.dare;
  return prompts[Math.floor(Math.random() * prompts.length)]!;
}

export function getRandomWyr(): string {
  const prompts = loadPrompts().wouldYouRather;
  return prompts[Math.floor(Math.random() * prompts.length)]!;
}

export function getRandomParanoia(): string {
  const prompts = loadPrompts().paranoia;
  return prompts[Math.floor(Math.random() * prompts.length)]!;
}

export function getRandomTod(): { kind: "Truth" | "Dare"; prompt: string } {
  const isTruth = Math.random() < 0.5;
  return isTruth
    ? { kind: "Truth", prompt: getRandomTruth() }
    : { kind: "Dare", prompt: getRandomDare() };
}

export function getRandomPrompt(): { category: string; prompt: string } {
  const roll = Math.floor(Math.random() * 4);
  if (roll === 0) return { category: "Truth", prompt: getRandomTruth() };
  if (roll === 1) return { category: "Dare", prompt: getRandomDare() };
  if (roll === 2) return { category: "Would You Rather", prompt: getRandomWyr() };
  return { category: "Paranoia", prompt: getRandomParanoia() };
}

export function addPrompt(category: "truth" | "dare" | "wyr" | "paranoia", prompt: string): void {
  const prompts = loadPrompts();

  if (category === "truth") {
    prompts.truthOrDare.truth.push(prompt);
  } else if (category === "dare") {
    prompts.truthOrDare.dare.push(prompt);
  } else if (category === "wyr") {
    prompts.wouldYouRather.push(prompt);
  } else if (category === "paranoia") {
    prompts.paranoia.push(prompt);
  }

  writeFileSync(PROMPTS_PATH, JSON.stringify(prompts, null, 4), "utf-8");
  promptCache = prompts; // Update cache
}
