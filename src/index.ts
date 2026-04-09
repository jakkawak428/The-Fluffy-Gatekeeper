import { Client, Collection } from "discord.js"
import * as Discord from "discord.js"
import { config } from "dotenv"
import { loadCommands, registerCommands } from "./handlers/commandHandler"
import * as levelHandler from "./handlers/levelHandler"
import { getRandomWelcomeMessage } from "./utils/welcomeStore"
import { getRandomCasualGoodbyeMessage, getRandomMockingLeaveMessage } from "./utils/leaveStore"
import { getRandomPingMessage } from "./utils/pingStore"
import { sendBirthdayMessages } from "./utils/birthdayStore"
import { FFF_SERVER, PENDING_APPLICATIONS, SJCSD_ROLE, SJCSD_SERVER, NEW_SJCSD_SERVER, VERIFIED_ROLE, WELCOME_CHANNEL, ELIJAHS_USER_ID, ALEX_USER_ID, KARLY_USER_ID, PAINT_USER_ID, LUCA_USER_ID, WAARD_USER_ID, THINGY_USER_ID } from "./config/serverConfig"
import { version } from "./config/serverConfig"

config({ quiet: true })

const djs = Discord as any

const Events = djs.Events ?? {
    ClientReady: "ready",
    InteractionCreate: "interactionCreate",
    MessageCreate: "messageCreate",
    VoiceStateUpdate: "voiceStateUpdate",
    GuildMemberAdd: "guildMemberAdd",
    GuildMemberRemove: "guildMemberRemove",
    Error: "error",
    Warn: "warn",
    ShardError: "shardError",
    ShardDisconnect: "shardDisconnect",
    ShardReconnecting: "shardReconnecting"
}

const intentFlags = djs.GatewayIntentBits ?? djs.Intents?.FLAGS
if (!intentFlags) {
    throw new Error("Discord intent flags are unavailable. Check your discord.js installation.")
}

const getIntent = (camelCase: string, upperCase: string) => intentFlags[camelCase] ?? intentFlags[upperCase]
const ManageRolesFlag = djs.PermissionFlagsBits?.ManageRoles ?? djs.Permissions?.FLAGS?.MANAGE_ROLES
const AuditEvents = djs.AuditLogEvent ?? {
    MemberKick: "MEMBER_KICK",
    MemberBanAdd: "MEMBER_BAN_ADD"
}
const WatchingType = djs.ActivityType?.Watching ?? "WATCHING"

export const client = new Client({
    intents: [
        getIntent("GuildMembers", "GUILD_MEMBERS"),
        getIntent("Guilds", "GUILDS"),
        getIntent("GuildMessages", "GUILD_MESSAGES"),
        getIntent("MessageContent", "GUILD_MESSAGE_CONTENT"),
        getIntent("GuildVoiceStates", "GUILD_VOICE_STATES")
    ]
})

const VERIFY_BUTTON_PREFIX = "verify_application"


// Store commands
let commands: Collection<string, any> = new Collection()

function createDisabledVerificationRow(applicantId: string): any {
    if (djs.ActionRowBuilder && djs.ButtonBuilder && djs.ButtonStyle) {
        return new djs.ActionRowBuilder().addComponents(
            new djs.ButtonBuilder()
                .setCustomId(`${VERIFY_BUTTON_PREFIX}:accept:${applicantId}:done`)
                .setLabel("Accept")
                .setStyle(djs.ButtonStyle.Success)
                .setDisabled(true),
            new djs.ButtonBuilder()
                .setCustomId(`${VERIFY_BUTTON_PREFIX}:reject:${applicantId}:done`)
                .setLabel("Reject")
                .setStyle(djs.ButtonStyle.Danger)
                .setDisabled(true)
        )
    }

    if (djs.MessageActionRow && djs.MessageButton) {
        return new djs.MessageActionRow().addComponents(
            new djs.MessageButton()
                .setCustomId(`${VERIFY_BUTTON_PREFIX}:accept:${applicantId}:done`)
                .setLabel("Accept")
                .setStyle("SUCCESS")
                .setDisabled(true),
            new djs.MessageButton()
                .setCustomId(`${VERIFY_BUTTON_PREFIX}:reject:${applicantId}:done`)
                .setLabel("Reject")
                .setStyle("DANGER")
                .setDisabled(true)
        )
    }

    return null
}

client.once(Events.ClientReady, async () => {
    console.log("Initial startup successful. Registering commands.")

    // Load and register commands
    commands = await loadCommands(client)
    await registerCommands(client, commands)

    // Set custom status
    client.user?.setPresence({
        activities: [{ name: "Watching over FFF", type: WatchingType }],
        status: "online"
    })

    // Schedule birthday message checker to run daily at midnight
    function scheduleBirthdayCheck(): void {
        const now = new Date()
        const tomorrow = new Date(now)
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)

        const timeUntilMidnight = tomorrow.getTime() - now.getTime()

        setTimeout(() => {
            sendBirthdayMessages(client)
            // After first check, run every 24 hours
            setInterval(() => {
                sendBirthdayMessages(client)
            }, 24 * 60 * 60 * 1000)
        }, timeUntilMidnight)
    }

    scheduleBirthdayCheck()
    console.log("Birthday checker scheduled")
    console.log(`Fluffy Gatekeeper is running! (Version ${version})`)
})

client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isButton() && interaction.customId.startsWith(`${VERIFY_BUTTON_PREFIX}:`)) {
        if (!interaction.inCachedGuild()) {
            await interaction.reply({ content: "This action can only be used in a server.", ephemeral: true })
            return
        }

        if (interaction.channelId !== PENDING_APPLICATIONS) {
            await interaction.reply({ content: "This button can only be used in the pending applications channel.", ephemeral: true })
            return
        }

        const moderator = interaction.member
        if (ManageRolesFlag && !moderator.permissions.has(ManageRolesFlag)) {
            await interaction.reply({ content: "Only moderators can process verification applications.", ephemeral: true })
            return
        }

        const [, decision, applicantId] = interaction.customId.split(":")
        if (!decision || !applicantId) {
            await interaction.reply({ content: "This application button is invalid.", ephemeral: true })
            return
        }

        let applicantMember = null
        try {
            applicantMember = await interaction.guild.members.fetch(applicantId)
        } catch {
            applicantMember = null
        }

        if (decision === "accept" && applicantMember) {
            if (!applicantMember.roles.cache.has(VERIFIED_ROLE)) {
                await applicantMember.roles.add(VERIFIED_ROLE)
            }
        }

        const resultText = decision === "accept" ? "Accepted" : "Rejected"
        const dmMessage =
            decision === "accept"
                ? "Your verification request was approved! Thank you for joining FFF, and have fun!"
                : "Sorry, your verification request was denied. Contact a moderator if you have questions."

        if (applicantMember) {
            await applicantMember.send(dmMessage).catch(() => null)
        }

        const disabledRow = createDisabledVerificationRow(applicantId)

        await interaction.update({
            content: `Application ${resultText} by <@${interaction.user.id}> for <@${applicantId}>.`,
            components: disabledRow ? [disabledRow] : []
        })

        return
    }

    if (!interaction.isChatInputCommand()) return
    // Only allow command execution from FFF_SERVER
    if (interaction.guildId !== FFF_SERVER) {
        await interaction.reply({ content: "You can't use commands outside of FFF!", ephemeral: true })
        return
    }

    // Prevent users with the restricted role from executing commands
    if (interaction.member && 'roles' in interaction.member) {
        const hasRole = (interaction.member.roles as any).cache?.has(SJCSD_ROLE) || (Array.isArray(interaction.member.roles) && interaction.member.roles.includes(SJCSD_ROLE))
        if (hasRole && interaction.commandName !== "verify") {
            await interaction.reply({ content: "You can't use commands as an unverified member! Use /verify to apply for verification and we'll take care of you shortly!", ephemeral: true })
            return
        }
    }
    const command = commands.get(interaction.commandName)

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`)
        return
    }

    try {
        await command.execute(interaction)
    } catch (error) {
        console.error(`Error executing command ${interaction.commandName}:`, error)
        await interaction.reply({ content: "There was an error while executing this command!", ephemeral: true })
    }
})

// leveling hooks and ping responses
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return
    if (!message.guild) return
    if (message.guild.id !== FFF_SERVER) return
    if (message.channel.id === WELCOME_CHANNEL) return
    if (message.channel.id === PENDING_APPLICATIONS) return

    // Check if the bot was mentioned
    if (message.mentions.has(client.user?.id || "")) {
        
    if (message.author.id === ALEX_USER_ID) {
        const messages = [
            `Shut up, Alex.`,
            `What do you want, Alex?`,
            `Go back to reading yuri.`,
            `Go clean your room, Alex.`,
            `No, Alex, I don't have yuri stories for you.`
        ]

        const integer = Math.random()
        if (integer > 0.5) { 
            const msg = messages[Math.floor(Math.random() * messages.length)]
            await message.reply(msg)
            return
        }

        if (integer < 0.5) {
            await message.reply(getRandomPingMessage()).catch(() => null)
            return
        }
    }

    if (message.author.id === KARLY_USER_ID) {
        const messages = [
            `Shut up, Karly.`,
            `Shut up, Daph.`,
            `What do you want, Karly?`,
            `What do you want, Daph?`,
            `Go back to simping about Jacob..`,
            `<@${PAINT_USER_ID}> Your girlfriend's annoying me.`,
            `Shut up, local horny grandma.`
        ]

        const integer = Math.random()
        if (integer > 0.5) { 
            const msg = messages[Math.floor(Math.random() * messages.length)]
            await message.reply(msg)
            return
        }

        if (integer < 0.5) {
            await message.reply(getRandomPingMessage()).catch(() => null)
            return
        }
    }
    
    if (message.author.id === PAINT_USER_ID) {
        const messages = [
            `Shut up, paint.`,
            `Don't you have a girlfriend you should be gooning to?`,
            `Name five planes.`,
            `Name five guns.`,
            `Name five dinosaurs.`,
            `Why is this autistic twink bothering me?`,
            `<@${KARLY_USER_ID}> Your boyfriend's annoying me.`
        ]

        const integer = Math.random()
            if (integer > 0.5) {
                const msg = messages[Math.floor(Math.random() * messages.length)]
                await message.reply(msg)
                return
            }

            if (integer < 0.5) {
                await message.reply(getRandomPingMessage()).catch(() => null)
                return
            }
    }

    if (message.author.id === LUCA_USER_ID) {
        const messages = [
            `If it isn't paint eater the horny one.`,
            `Go goon to Jack.`,
            `Why are you of all people pinging me?`,
            `Leave me alone. Go play Adopt Me.`,
            `Shouldn't you be on Adopt Me?`,
        ]

        const integer = Math.random()
            if (integer > 0.5) {
                const msg = messages[Math.floor(Math.random() * messages.length)]
                await message.reply(msg)
                return
            }

            if (integer < 0.5) {
                await message.reply(getRandomPingMessage()).catch(() => null)
                return
            }   
    }

    if (message.author.id === WAARD_USER_ID) {
        const messages = [
            `Shut up, Waard.`,
            `Don't you have buildings you should be exploding?`,
            `Go buy Jack more Monsters.`,
            `What do you want, money boy?`,
        ]

        const integer = Math.random()
            if (integer > 0.5) {
                const msg = messages[Math.floor(Math.random() * messages.length)]
                await message.reply(msg)
                return
            }

            if (integer < 0.5) {
                await message.reply(getRandomPingMessage()).catch(() => null)
                return
            }

    }

    if (message.author.id === THINGY_USER_ID) {
        const messages = [
            `Go bother Alex.`,
            `I don't speak California.`,
            `Go bother Hamfil.`,
            `Don't you have work to do?`,
            `Shut up, "Ballooniplier".`,
            `Hi there, uhh... I forgot your pronouns.`
        ]

        const integer = Math.random()
            if (integer > 0.5) {
                const msg = messages[Math.floor(Math.random() * messages.length)]
                await message.reply(msg)
                return
            }

            if (integer < 0.5) {
                await message.reply(getRandomPingMessage()).catch(() => null)
                return
            }
    }

        // Don't send random message if replying to a Truth/Dare/WYR/Paranoia prompt
        const isReplyToPrompt = message.reference && 
            message.reference.messageId && 
            await message.channel.messages.fetch(message.reference.messageId)
            .then((refMsg: any) => 
                refMsg.author.id === client.user?.id && 
                (/\*\*(Truth|Dare|Would You Rather|Paranoia):\*\*/.test(refMsg.content) ||
                refMsg.embeds.some((embed: any) => embed.title?.includes("Birthday")))
            )
            .catch(() => false);

        if (!isReplyToPrompt) {
            await message.reply(getRandomPingMessage()).catch(() => null)
        }
    }

    levelHandler.recordMessage(client, message)
})

client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    if (newState.guild?.id !== FFF_SERVER) return
    levelHandler.handleVoiceState(client, oldState, newState)
})

client.on(Events.GuildMemberAdd, async (member) => {
    if (member.guild.id !== FFF_SERVER) return
    if (member.user.bot) return

    const server = await client.guilds.fetch(SJCSD_SERVER || NEW_SJCSD_SERVER)
    if (!server) {
        console.error("❌ | SJCSD server not found")
        return
    }

    let isInSJCSD = false
    try {
        await server.members.fetch(member.user.id)
        isInSJCSD = true
    } catch {
        isInSJCSD = false
    }

    if (isInSJCSD) {
        member.roles.add(SJCSD_ROLE)
        console.log(`${member.user.username} is in SJCSD, role has been granted.`)
        return
    }

    const channel = await member.guild.channels.fetch(WELCOME_CHANNEL)
    if (!channel?.isTextBased()) {
        console.error("An error occured sending welcome message: channel not found or not text-based")
        return
    }

    if (member.user.id === ELIJAHS_USER_ID) {
        const messages = [
            `Welcome back, <@${ELIJAHS_USER_ID}>. Enjoy your visit.`,
            `<@${ELIJAHS_USER_ID} is stopping by.`,
            `Welcome back to FFF, <@${ELIJAHS_USER_ID}>. Have fun.`,
            `Welcome back, Eli! Enjoy your visit!`
        ]

        const message = messages[Math.floor(Math.random() * messages.length)]
        await channel.send(message)
        return
    }

    await channel.send(getRandomWelcomeMessage(member.toString()))
})

client.on(Events.GuildMemberRemove, async (member) => {
    if (member.guild.id !== FFF_SERVER) return
    if (member.user.bot) return

    const channel = await member.guild.channels.fetch(WELCOME_CHANNEL)
    if (!channel?.isTextBased()) {
        console.error("An error occured sending leave message: channel not found or not text-based")
        return
    }

    let wasKickedOrBanned = false

    try {
        const [kickLogs, banLogs] = await Promise.all([
            member.guild.fetchAuditLogs({ type: AuditEvents.MemberKick, limit: 10 }),
            member.guild.fetchAuditLogs({ type: AuditEvents.MemberBanAdd, limit: 10 })
        ])

        const now = Date.now()
        const timeWindow = 30_000 // 30 second window

        const recentKick = kickLogs.entries.find((entry: any) => {
            if (entry.target?.id !== member.id) return false
            const timeDiff = now - entry.createdTimestamp
            console.log(`Checking kick for ${member.user.username}: ${timeDiff}ms ago`)
            return timeDiff >= 0 && timeDiff < timeWindow
        })

        const recentBan = banLogs.entries.find((entry: any) => {
            if (entry.target?.id !== member.id) return false
            const timeDiff = now - entry.createdTimestamp
            console.log(`Checking ban for ${member.user.username}: ${timeDiff}ms ago`)
            return timeDiff >= 0 && timeDiff < timeWindow
        })

        wasKickedOrBanned = Boolean(recentKick || recentBan)
        console.log(`${member.user.username} was kicked or banned: ${wasKickedOrBanned}`)
    } catch (error) {
        console.error("Unable to read audit logs for leave event:", error)
    }

    if (wasKickedOrBanned) {
        await channel.send(getRandomMockingLeaveMessage(member.toString()))
        return
    }

    if (member.user.id === ELIJAHS_USER_ID) {
        const messages = [
            `Thanks for stopping by, <@${ELIJAHS_USER_ID}>. We'll see you later.`,
            `Hope you enjoyed your visit, <@${ELIJAHS_USER_ID}>. See you in a few weeks.`,
            `Thanks for another great time, <@${ELIJAHS_USER_ID}>! See you soon!`
        ]

        const message = messages[Math.floor(Math.random() * messages.length)]
        await channel.send(message)
        return
    }

    await channel.send(getRandomCasualGoodbyeMessage(member.toString()))
})

// Add error event handlers before login
client.on(Events.Error, (error) => {
    console.error("Discord client error:", error)
})

client.on(Events.Warn, (warning) => {
    console.warn("Discord client warning:", warning)
})

client.on(Events.ShardError, (error) => {
    console.error("WebSocket connection error:", error)
})

client.on(Events.ShardDisconnect, (event, shardId) => {
    console.warn(`Shard ${shardId} disconnected:`, event)
})

client.on(Events.ShardReconnecting, (shardId) => {
    console.log(`Shard ${shardId} reconnecting...`)
})

// Verify token exists before attempting login
if (!process.env.TOKEN) {
    console.error("❌ | ERROR: Bot token not found in environment variables!")
    console.error("Please check your .env file and ensure TOKEN is set.")
    process.exit(1)
}

console.log("🔌 | Connecting to Discord...")

client.login(process.env.TOKEN).catch((error) => {
    console.error("❌ | Failed to log in:", error)
    console.error("\nPossible solutions:")
    console.error("1. Verify your bot token is correct in the .env file; did you reset it recently? If so, update the .env with the new token.")
    console.error("2. Check if your firewall/antivirus is blocking the connection; if you're on a corporate or school network, they may have restrictions in place.")
    console.error("3. Ensure you have internet connectivity. Run a few tests on the local machine to ensure it can reach Discord's servers (e.g., ping discord.com, try accessing https://discord.com in a browser).")
    console.error("4. Check Discord API status at https://discordstatus.com")
    console.error("5. Check the dependencies and ensure discord.js is properly installed. Try deleting node_modules and reinstalling with npm install.")
    console.error("6. Was the source code recently modified or updated? If so, review recent changes for any potential issues.")
    process.exit(1)
})