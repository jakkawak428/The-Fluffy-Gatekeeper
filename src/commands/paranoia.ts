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
import { getRandomParanoia } from "../utils/promptStore";

export const command = new SlashCommandBuilder()
  .setName("paranoia")
  .setDescription("Get a random Paranoia prompt");

function createButtons() {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("paranoia_random").setLabel("Random").setStyle(ButtonStyle.Secondary)
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
    const content = `🟡 **Paranoia:** ${getRandomParanoia()}`;
    const newMessage = await buttonInteraction.reply({ content, components: [row], fetchReply: true });
    attachCollector(newMessage, originUserId);
  });
}

export async function execute(interaction: ChatInputCommandInteraction) {
  const row = createButtons();
  const response = await interaction.reply({
    content: `🟡 **Paranoia:** ${getRandomParanoia()}`,
    components: [row],
    fetchReply: true,
  });

  attachCollector(response, interaction.user.id);
}
