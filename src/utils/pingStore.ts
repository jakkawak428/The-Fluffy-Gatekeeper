import { readFileSync } from "fs"
import path from "path"

interface PingData {
    messages: string[]
}

const PING_MESSAGES_PATH = path.join(__dirname, "..", "..", "src", "pingMessages.json")

let pingCache: PingData | null = null

function loadPingMessages(): PingData {
    if (pingCache) return pingCache

    const raw = readFileSync(PING_MESSAGES_PATH, "utf-8")
    pingCache = JSON.parse(raw) as PingData
    return pingCache
}

export function getRandomPingMessage(): string {
    const messages = loadPingMessages().messages

    if (!messages.length) {
        return "Pong! 🏓"
    }

    return messages[Math.floor(Math.random() * messages.length)]!
}
