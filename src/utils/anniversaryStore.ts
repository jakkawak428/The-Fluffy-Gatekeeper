// gets anniversary dates for specific user pairs and congratulates them monthly and yearly

import { readFileSync } from "fs"
import path from "path"
import { Client } from "discord.js"
import { FFF_SERVER, GENERAL_CHANNEL } from "../config/serverConfig"

interface Anniversary {
    name1: string
    name2: string
    user1: string
    user2: string
    date: string // Format: "YYYY-MM-DD"
}

interface AnniversariesData {
    anniversaries: Anniversary[]
}

const ANNIVERSARIES_PATH = path.join(__dirname, "..", "anniversaries.json")

let anniversaryCache: AnniversariesData | null = null

function loadAnniversaries(): AnniversariesData {
    if (anniversaryCache) return anniversaryCache

    const raw = readFileSync(ANNIVERSARIES_PATH, "utf-8")
    anniversaryCache = JSON.parse(raw) as AnniversariesData
    return anniversaryCache
}

function getMonthsDifference(startDate: Date, endDate: Date): number {
    let months = (endDate.getFullYear() - startDate.getFullYear()) * 12
    months += endDate.getMonth() - startDate.getMonth()
    return months
}

export async function sendAnniversaryMessages(client: Client): Promise<void> {
    const today = new Date()
    const todayMonth = today.getMonth()
    const todayDate = today.getDate()

    const anniversaries = loadAnniversaries()

    const todaysAnniversaries = anniversaries.anniversaries.filter((ann) => {
        const anniversaryDate = new Date(ann.date)
        return anniversaryDate.getDate() === todayDate && anniversaryDate.getMonth() === todayMonth
    })

    if (todaysAnniversaries.length === 0) {
        return
    }

    try {
        const guild = await client.guilds.fetch(FFF_SERVER)
        const channel = await guild.channels.fetch(GENERAL_CHANNEL)
        const textChannel = channel && "send" in channel ? channel : null

        if (!textChannel) {
            console.error("❌ | General channel not found or not text-based for anniversary wishes")
            return
        }

        for (const anniversary of todaysAnniversaries) {
            const anniversaryDate = new Date(anniversary.date)
            const monthsPassed = getMonthsDifference(anniversaryDate, today)
            const isYearlyAnniversary = monthsPassed > 0 && monthsPassed % 12 === 0

            let message: string

            if (isYearlyAnniversary) {
                const yearsPassed = monthsPassed / 12
                const yearlyMessages = [
                    `🎉 Happy ${yearsPassed}-year anniversary to <@${anniversary.user1}> and <@${anniversary.user2}>! 🎉 ${yearsPassed} years of pure love!`,
                    `✨ It's been ${yearsPassed} amazing years for <@${anniversary.user1}> and <@${anniversary.user2}>! Happy anniversary! ✨`,
                    `💕 Congrats to <@${anniversary.user1}> and <@${anniversary.user2}> on ${yearsPassed} years together! What an incredible journey! 💕`,
                    `🥳 ${yearsPassed} years and still going strong! Happy anniversary to <@${anniversary.user1}> and <@${anniversary.user2}>! 🥳`,
                    `🌟 <@${anniversary.user1}> and <@${anniversary.user2}>, here's to ${yearsPassed} beautiful years! Happy anniversary! 🌟`,
                ]
                message = yearlyMessages[Math.floor(Math.random() * yearlyMessages.length)]!
            } else {
                const monthlyMessages = [
                    `💕 Happy ${monthsPassed}-month anniversary to <@${anniversary.user1}> and <@${anniversary.user2}>! 💕`,
                    `🎊 Congrats on ${monthsPassed} months, <@${anniversary.user1}> and <@${anniversary.user2}>! 🎊`,
                    `✨ <@${anniversary.user1}> and <@${anniversary.user2}>, it's been ${monthsPassed} months of happiness! Keep it up! ✨`,
                    `🥳 ${monthsPassed} months together and they just keep getting better! Happy anniversary, <@${anniversary.user1}> and <@${anniversary.user2}>! 🥳`,
                    `💖 Another month down! Here's to <@${anniversary.user1}> and <@${anniversary.user2}> on their ${monthsPassed}-month anniversary! 💖`,
                    `🎉 <@${anniversary.user1}> and <@${anniversary.user2}>, celebrating ${monthsPassed} wonderful months! 🎉`,
                    `🌹 To the happy couple: it's been ${monthsPassed} months and counting! Happy anniversary, <@${anniversary.user1}> and <@${anniversary.user2}>! 🌹`,
                ]
                message = monthlyMessages[Math.floor(Math.random() * monthlyMessages.length)]!
            }

            await textChannel.send(message).catch((error: unknown) => {
                console.error(`❌ | Failed to send anniversary message for ${anniversary.name1} and ${anniversary.name2}:`, error)
            })
        }
    } catch (error) {
        console.error("❌ | Error sending anniversary messages:", error)
    }
}    