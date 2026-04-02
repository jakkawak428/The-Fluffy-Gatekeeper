import { readFileSync } from "fs"
import path from "path"

interface LeaveData {
    casualGoodbye: string[]
    mockingLeave: string[]
}

const LEAVE_MESSAGES_PATH = path.join(__dirname, "..", "..", "src", "leaveMessages.json")

let leaveCache: LeaveData | null = null

function loadLeaveMessages(): LeaveData {
    if (leaveCache) return leaveCache

    const raw = readFileSync(LEAVE_MESSAGES_PATH, "utf-8")
    leaveCache = JSON.parse(raw) as LeaveData
    return leaveCache
}

export function getRandomCasualGoodbyeMessage(userMention: string): string {
    const messages = loadLeaveMessages().casualGoodbye

    if (!messages.length) {
        return `See you around, ${userMention}.`
    }

    const template = messages[Math.floor(Math.random() * messages.length)]!
    return template.replaceAll("{user}", userMention)
}

export function getRandomMockingLeaveMessage(userMention: string): string {
    const messages = loadLeaveMessages().mockingLeave

    if (!messages.length) {
        return `${userMention} took an L and left.`
    }

    const template = messages[Math.floor(Math.random() * messages.length)]!
    return template.replaceAll("{user}", userMention)
}
