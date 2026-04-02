import { Client, TextChannel, GuildMember, VoiceState } from "discord.js";
import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { VENT_CHANNEL } from "../config/serverConfig";

interface LevelRecord {
  xp: number;
  level: number;
}

const DATA_PATH = path.join(__dirname, "..", "..", "levelData.json");
const XP_PER_MESSAGE = 10;
const XP_PER_MINUTE_VOICE = 5;
const LEADERBOARD_ANNOUNCE_TOP_N = 10;
const PASS_ANNOUNCE_COOLDOWN_MS = 30 * 60 * 1000;

// where all level-up notifications should be sent
const ANNOUNCE_CHANNEL_ID = "1390143005318451200";


let levelData: Record<string, LevelRecord> = {};
const voiceTimestamps: Map<string, number> = new Map();
const passAnnouncementCooldowns: Map<string, number> = new Map();

function loadLevelData() {
  if (existsSync(DATA_PATH)) {
    const raw = readFileSync(DATA_PATH, "utf-8");
    try {
      levelData = JSON.parse(raw);
    } catch (e) {
      console.error("Failed to parse level data, starting fresh", e);
      levelData = {};
    }
  } else {
    saveLevelData();
  }
}

function saveLevelData() {
  writeFileSync(DATA_PATH, JSON.stringify(levelData, null, 2));
}

function xpForNextLevel(level: number): number {
  // Arcane formula: quadratic growth with linear component
  return 5 * level * level + 50 * level + 100;
}

function ensureUser(id: string): LevelRecord {
  if (!levelData[id]) {
    levelData[id] = { xp: 0, level: 1 };
    saveLevelData();
  }
  return levelData[id];
}

function getSortedLeaderboard() {
  const arr = Object.entries(levelData).map(([id, rec]) => ({ id, ...rec }));
  arr.sort((a, b) => {
    if (b.level !== a.level) return b.level - a.level;
    return b.xp - a.xp;
  });
  return arr;
}

async function resolveAnnounceChannel(client: Client, fallback?: TextChannel): Promise<TextChannel | null> {
  const cached = client.channels.cache.get(ANNOUNCE_CHANNEL_ID);
  if (cached && cached instanceof TextChannel) {
    return cached;
  }

  try {
    const fetched = await client.channels.fetch(ANNOUNCE_CHANNEL_ID);
    if (fetched && fetched instanceof TextChannel) return fetched;
  } catch {}

  return fallback ?? null;
}

function getPassPairKey(userA: string, userB: string): string {
  return [userA, userB].sort().join(":");
}

export function getUserLevel(id: string): LevelRecord {
  return ensureUser(id);
}

export async function addXP(id: string, amount: number, client: Client, channel?: TextChannel) {
  const rankBefore = getSortedLeaderboard().map((entry) => entry.id);
  const rankBeforeIndex = new Map(rankBefore.map((userId, idx) => [userId, idx]));
  const oldRank = rankBefore.indexOf(id);

  const rec = ensureUser(id);
  rec.xp += amount;

  let leveledUp = false;
  while (rec.xp >= xpForNextLevel(rec.level)) {
    rec.xp -= xpForNextLevel(rec.level);
    rec.level += 1;
    leveledUp = true;
  }

  const rankAfter = getSortedLeaderboard().map((entry) => entry.id);
  const rankAfterIndex = new Map(rankAfter.map((userId, idx) => [userId, idx]));
  const newRank = rankAfter.indexOf(id);
  const passedIds = oldRank !== -1 && newRank !== -1 && newRank < oldRank
    ? rankAfter.slice(newRank + 1, oldRank + 1)
    : [];

  const inTopAfter = newRank !== -1 && newRank < LEADERBOARD_ANNOUNCE_TOP_N;
  const passedInTop = passedIds.filter((passedId) => {
    const oldPassedRank = rankBeforeIndex.get(passedId);
    const newPassedRank = rankAfterIndex.get(passedId);
    return (oldPassedRank !== undefined && oldPassedRank < LEADERBOARD_ANNOUNCE_TOP_N)
      || (newPassedRank !== undefined && newPassedRank < LEADERBOARD_ANNOUNCE_TOP_N);
  });

  const cooldownEligiblePassed = passedInTop.filter((passedId) => {
    const key = getPassPairKey(id, passedId);
    const now = Date.now();
    const lastSent = passAnnouncementCooldowns.get(key);
    if (lastSent !== undefined && now - lastSent < PASS_ANNOUNCE_COOLDOWN_MS) {
      return false;
    }
    passAnnouncementCooldowns.set(key, now);
    return true;
  });

  if (leveledUp || (inTopAfter && cooldownEligiblePassed.length > 0)) {
    const dest = await resolveAnnounceChannel(client, channel);
    if (dest && leveledUp) {
      // Don't ping if the level-up was triggered in the vent channel
      const isVentChannel = channel?.id === VENT_CHANNEL;
      if (isVentChannel) {
        // Fetch user to get their username
        const user = await client.users.fetch(id).catch(() => null);
        const username = user?.username ?? `User ${id}`;
        dest.send(`🎉 **${username}** leveled up to **${rec.level}**!`);
      } else {
        dest.send(`🎉 <@${id}> leveled up to **${rec.level}**!`);
      }
    }
    if (dest && inTopAfter && cooldownEligiblePassed.length > 0) {
      if (cooldownEligiblePassed.length === 1) {
        dest.send(`📈 <@${id}> passed <@${cooldownEligiblePassed[0]}> on the leaderboard!`);
      } else {
        const mentions = cooldownEligiblePassed.map((passedId) => `<@${passedId}>`).join(", ");
        dest.send(`📈 <@${id}> passed ${mentions} on the leaderboard!`);
      }
    }
  }

  saveLevelData();
}

export function recordMessage(client: Client, message: any) {
  if (!message.guild) return;
  // only count in FFF server if desired, can check here
  addXP(message.author.id, XP_PER_MESSAGE, client, (message.channel as TextChannel));
}

export function handleVoiceState(client: Client, oldState: VoiceState, newState: VoiceState) {
  const userId = newState.id;
  // only care about guild voice in same server logic outside
  if (!oldState.channel && newState.channel) {
    // joined
    voiceTimestamps.set(userId, Date.now());
  } else if (oldState.channel && !newState.channel) {
    // left
    const start = voiceTimestamps.get(userId);
    if (start) {
      const minutes = Math.floor((Date.now() - start) / 60000);
      if (minutes > 0) {
        addXP(userId, minutes * XP_PER_MINUTE_VOICE, client);
      }
      voiceTimestamps.delete(userId);
    }
  }
}

export function getLeaderboard(topN: number = 10) {
  return getSortedLeaderboard().slice(0, topN);
}

// initialize on import
loadLevelData();
