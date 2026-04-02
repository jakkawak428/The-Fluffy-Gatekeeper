import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  Message,
  ButtonInteraction,
} from "discord.js";
import { getRandomTruth, getRandomDare, getRandomTod } from "../utils/promptStore";

export const command = new SlashCommandBuilder()
  .setName("truth")
  .setDescription("Get a random Truth prompt");

function createButtons() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("tod_truth").setLabel("Truth").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("tod_dare").setLabel("Dare").setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId("tod_random").setLabel("Random").setStyle(ButtonStyle.Secondary)
  );
}

function attachCollector(message: Message, originUserId: string) {
  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 15 * 60 * 1000,
  });

  collector.on("collect", async (buttonInteraction: ButtonInteraction) => {
    if (buttonInteraction.user.id !== originUserId) {
      await buttonInteraction.reply({
        content: "Only the command user can use these buttons.",
        ephemeral: true,
      });
      return;
    }

    const row = createButtons();
    let content = "";

    if (buttonInteraction.customId === "tod_truth") {
      content = `🟣 **Truth:** ${getRandomTruth()}`;
    } else if (buttonInteraction.customId === "tod_dare") {
      content = `🔴 **Dare:** ${getRandomDare()}`;
    } else {
      const selected = getRandomTod();
      content = `🎲 **${selected.kind}:** ${selected.prompt}`;
    }

    const newMessage = await buttonInteraction.reply({ content, components: [row], fetchReply: true });
    attachCollector(newMessage, originUserId);
  });
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const row = createButtons();
  const response = await interaction.reply({
    content: `🟣 **Truth:** ${getRandomTruth()}`,
    components: [row],
    fetchReply: true,
  });

  attachCollector(response, interaction.user.id);
}
