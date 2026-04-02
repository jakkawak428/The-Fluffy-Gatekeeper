import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export const command = new SlashCommandBuilder()
  .setName('rng')
  .setDescription('Generate a random number')
  .addIntegerOption(option =>
    option
      .setName('min')
      .setDescription('Minimum value (default: 0)')
      .setRequired(false)
  )
  .addIntegerOption(option =>
    option
      .setName('max')
      .setDescription('Maximum value (default: 100)')
      .setRequired(false)
  );

export async function execute(interaction: any) {
  const min = interaction.options.getInteger('min') ?? 0;
  const max = interaction.options.getInteger('max') ?? 100;

  if (min > max) {
    return interaction.reply({
      content: '❌ Minimum value must be less than or equal to maximum value.',
      ephemeral: true,
    });
  }

  const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;

  return interaction.reply({
    content: `🎲 Random number between ${min} and ${max}: **${randomNumber}**`,
  });
}
