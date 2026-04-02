import { readFileSync } from "fs"
import path from "path"
import { Client } from "discord.js"
import { FFF_SERVER, GENERAL_CHANNEL } from "../config/serverConfig"

interface BirthdayUser {
    id: string
    name: string
    birthday: string // Format: "MM-DD"
}

interface BirthdayData {
    users: BirthdayUser[]
}

const BIRTHDAYS_PATH = path.join(__dirname, "..", "..", "src", "birthdays.json")
let birthdayCache: BirthdayData | null = null

function loadBirthdays(): BirthdayData {
    if (birthdayCache) return birthdayCache

    const raw = readFileSync(BIRTHDAYS_PATH, "utf-8")
    birthdayCache = JSON.parse(raw) as BirthdayData
    return birthdayCache
}

function getTodayDateString(): string {
    const now = new Date()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const day = String(now.getDate()).padStart(2, "0")
    return `${month}-${day}`
}

export function getBirthdaysToday(): BirthdayUser[] {
    const today = getTodayDateString()
    const birthdays = loadBirthdays()

    return birthdays.users.filter((user) => user.birthday === today)
}

export async function sendBirthdayMessages(client: Client): Promise<void> {
    const birthdayUsers = getBirthdaysToday()

    if (birthdayUsers.length === 0) {
        return
    }

    try {
        const guild = await client.guilds.fetch(FFF_SERVER)
        const channel = await guild.channels.fetch(GENERAL_CHANNEL)
        const textChannel = channel && "send" in channel ? channel : null

        if (!textChannel) {
            console.error("❌ | General channel not found or not text-based for birthday wishes")
            return
        }

        for (const user of birthdayUsers) {
            const messages = [
                `🎉 Happy Birthday, <@${user.id}>! 🎂`,
                `🥳 It's <@${user.id}>'s birthday! Have an amazing day! 🎈`,
                `🎊 Wishing the happiest of birthdays to <@${user.id}>! 🎁`,
                `Happy birthday, <@${user.id}>! Hope your day is as special as you! ✨`,
                `🎂 Cheers to you on your birthday, <@${user.id}>! May all your wishes come true! 🎉`,
                `🎈 Happy Birthday, <@${user.id}>! Enjoy your day to the fullest! 🥳`,
                `🎁 Wishing a fantastic birthday to <@${user.id}>! May your year ahead be filled with joy and success! 🎊`,
            ]

            const randomMessage = messages[Math.floor(Math.random() * messages.length)]!
            await textChannel.send(randomMessage).catch((error: unknown) => {
                console.error(`❌ | Failed to send birthday message for ${user.name}:`, error)
            })
        }
    } catch (error) {
        console.error("❌ | Error sending birthday messages:", error)
    }
}
