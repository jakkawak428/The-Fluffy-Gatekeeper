import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	ChatInputCommandInteraction,
	EmbedBuilder,
	ModalBuilder,
	SlashCommandBuilder,
	TextInputBuilder,
	TextInputStyle
} from "discord.js";
import { PENDING_APPLICATIONS, VERIFIED_ROLE } from "../config/serverConfig";

const VERIFY_MODAL_ID = "verify_application_modal";
const VERIFY_BUTTON_PREFIX = "verify_application";

function isUsersApplicationMessage(userId: string, title?: string | null, description?: string | null): boolean {
	if (title !== "New Verification Application") {
		return false;
	}

	return Boolean(description?.includes(`(\`${userId}\`)`));
}

async function getLatestApplicationAcceptedState(interaction: ChatInputCommandInteraction): Promise<boolean | null> {
	const pendingChannel = await interaction.guild?.channels.fetch(PENDING_APPLICATIONS);
	if (!pendingChannel?.isTextBased()) {
		return null;
	}

	let before: string | undefined;
	for (let page = 0; page < 5; page++) {
		const messages = before
			? await pendingChannel.messages.fetch({ limit: 100, before })
			: await pendingChannel.messages.fetch({ limit: 100 });
		if (!messages.size) {
			return null;
		}

		for (const message of messages.values()) {
			if (message.author.id !== interaction.client.user?.id) {
				continue;
			}

			const applicationEmbed = message.embeds[0];
			if (!applicationEmbed) {
				continue;
			}

			if (!isUsersApplicationMessage(interaction.user.id, applicationEmbed.title, applicationEmbed.description)) {
				continue;
			}

			return message.content.startsWith("Application Accepted");
		}

		before = messages.last()?.id;
		if (!before) {
			break;
		}
	}

	return null;
}

const APPLICATION_FIELDS = [
	{ id: "application_q1", label: "Restate at least two of the rules.", style: TextInputStyle.Short },
	{ id: "application_q2", label: "Will you respect others?", style: TextInputStyle.Short },
	{ id: "application_q3", label: "How did you find FFF?", style: TextInputStyle.Paragraph },
	{ id: "application_q4", label: "Do you agree to follow all of our rules?", style: TextInputStyle.Paragraph },
	{ id: "application_q5", label: "What are your intentions?", style: TextInputStyle.Paragraph }
] as const;

export const command = new SlashCommandBuilder()
	.setName("verify")
	.setDescription("Submit a verification application");

export async function execute(interaction: ChatInputCommandInteraction) {
	if (!interaction.inCachedGuild()) {
		await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
		return;
	}

	const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
	if (member?.roles.cache.has(VERIFIED_ROLE)) {
		await interaction.reply({ content: "You are already verified!", ephemeral: true });
		return;
	}

	const latestApplicationAccepted = await getLatestApplicationAcceptedState(interaction);
	if (latestApplicationAccepted === false) {
		await interaction.reply({
			content: "You cannot start another application until your most recent one has been reviewed!",
			ephemeral: true
		});
		return;
	}

	const modal = new ModalBuilder()
		.setCustomId(VERIFY_MODAL_ID)
		.setTitle("Verification Application");

	const rows = APPLICATION_FIELDS.map((field) => {
		const input = new TextInputBuilder()
			.setCustomId(field.id)
			.setLabel(field.label)
			.setStyle(field.style)
			.setRequired(true)
			.setMaxLength(1024);

		return new ActionRowBuilder<TextInputBuilder>().addComponents(input);
	});

	modal.addComponents(...rows);
	await interaction.showModal(modal);

	const modalSubmit = await interaction.awaitModalSubmit({
		filter: (submitted) => submitted.customId === VERIFY_MODAL_ID && submitted.user.id === interaction.user.id,
		time: 300_000
	}).catch(() => null);

	if (!modalSubmit) {
		await interaction.followUp({
			content: "Verification form timed out. Run `/verify` again when you're ready.",
			ephemeral: true
		});
		return;
	}

	const answers = APPLICATION_FIELDS.map((field) => ({
		label: field.label,
		value: modalSubmit.fields.getTextInputValue(field.id)
	}));

	const pendingChannel = await interaction.guild.channels.fetch(PENDING_APPLICATIONS);
	if (!pendingChannel?.isTextBased()) {
		await modalSubmit.reply({
			content: "Could not find the pending applications channel. Please contact a moderator.",
			ephemeral: true
		});
		return;
	}

	const summaryEmbed = new EmbedBuilder()
		.setColor(0x2f3136)
		.setTitle("New Verification Application")
		.setDescription(`Applicant: <@${interaction.user.id}> (\`${interaction.user.id}\`)`)
		.addFields(
			answers.map((answer) => ({
				name: answer.label,
				value: answer.value.length > 1024 ? `${answer.value.slice(0, 1021)}...` : answer.value
			}))
		)
		.setTimestamp();

	const acceptButton = new ButtonBuilder()
		.setCustomId(`${VERIFY_BUTTON_PREFIX}:accept:${interaction.user.id}`)
		.setLabel("Accept")
		.setStyle(ButtonStyle.Success);

	const rejectButton = new ButtonBuilder()
		.setCustomId(`${VERIFY_BUTTON_PREFIX}:reject:${interaction.user.id}`)
		.setLabel("Reject")
		.setStyle(ButtonStyle.Danger);

	const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(acceptButton, rejectButton);

	await pendingChannel.send({
		content: "<@&1353092380575924255> A new verification application has been submitted. Please review and take action.",
		embeds: [summaryEmbed],
		components: [actionRow]
	});

	await modalSubmit.reply({
		content: "Your application was submitted and is now pending moderator review.",
		ephemeral: true
	});
}
