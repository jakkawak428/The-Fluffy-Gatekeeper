import { Client, Collection, REST, Routes, SlashCommandBuilder } from "discord.js";
import { readdirSync } from "fs";
import path from "path";

interface Command {
    command: SlashCommandBuilder;
    execute: (interaction: any) => Promise<void>;
}

export const loadCommands = async (client: Client): Promise<Collection<string, Command>> => {
    const commands = new Collection<string, Command>();
    const commandsPath = path.join(__dirname, "../commands");

    // only .ts/.js files are loaded as commands; .d.ts files are excluded
    const files = readdirSync(commandsPath).filter(file => 
        (file.endsWith(".ts") || file.endsWith(".js")) && !file.endsWith(".d.ts")
    );

    for (const file of files) {
        try {
            const filePath = path.join(commandsPath, file);
            const commandModule = require(filePath);

            const { command, execute } = commandModule;

            if (command && execute) {
                const commandName = command.name;
                commands.set(commandName, { command, execute });
                console.log(`Loaded command: ${commandName}`);
            }
        } catch (error) {
            console.error(`Failed to load command from file ${file}:`, error);
        }
    }

    return commands;
};

export const registerCommands = async (client: Client, commands: Collection<string, Command>): Promise<void> => {
    const commandData = Array.from(commands.values()).map(cmd => cmd.command.toJSON());

    try {
        const rest = new REST({ version: "10" }).setToken(process.env.TOKEN!);

        await rest.put(Routes.applicationCommands(client.user!.id), { body: commandData });

        console.log(`Successfully registered ${commandData.length} command(s). Fluffy Gatekeeper is now fully operational and ready for use.`);
    } catch (error) {
        console.error("Failed to register commands:", error);
    }
};

export const handleCommandExecution = async (interaction: any, commands: Collection<string, Command>): Promise<void> => {
    const command = commands.get(interaction.commandName);

    if (!command) {
        console.warn(`Command not found: ${interaction.commandName}`);
        return;
    }

    try {
        console.log(`Executing command: ${interaction.commandName}`);
        await command.execute(interaction);
    } catch (error) {
        console.error(`Error executing command ${interaction.commandName}:`, error);
    }
};


