import { readFileSync } from "fs"
import path from "path"

interface WelcomeData {
    messages: string[]
}

const WELCOME_MESSAGES_PATH = path.join(__dirname, "..", "..", "src", "welcomeMessages.json")

let welcomeCache: WelcomeData | null = null

function loadWelcomeMessages(): WelcomeData {
    if (welcomeCache) return welcomeCache

    const raw = readFileSync(WELCOME_MESSAGES_PATH, "utf-8")
    welcomeCache = JSON.parse(raw) as WelcomeData
    return welcomeCache
}

export function getRandomWelcomeMessage(userMention: string): string {
    const messages = loadWelcomeMessages().messages

    if (!messages.length) {
        return `Welcome to FFF, ${userMention}!`
    }

    const template = messages[Math.floor(Math.random() * messages.length)]!
    return template.replaceAll("{user}", userMention)
}
