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

const SUITS = ["♠", "♥", "♦", "♣"] as const;
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;

interface Card {
  rank: string;
  suit: string;
}

function createShuffledDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j]!, deck[i]!];
  }
  return deck;
}

function handValue(hand: Card[]): number {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    if (card.rank === "A") {
      total += 11;
      aces++;
    } else if (["J", "Q", "K"].includes(card.rank)) {
      total += 10;
    } else {
      total += parseInt(card.rank);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function formatHand(hand: Card[]): string {
  return hand.map(c => `**${c.rank}${c.suit}**`).join("  ");
}

function buildMessage(
  playerHand: Card[],
  dealerHand: Card[],
  hideDealerHole: boolean,
  status?: string
): string {
  const dealerDisplay = hideDealerHole
    ? `${formatHand([dealerHand[0]!])}  🂠  - *${handValue([dealerHand[0]!])}*`
    : `${formatHand(dealerHand)} - *${handValue(dealerHand)}*`;

  let msg = `🃏 **Blackjack**\n\n`;
  msg += `**Dealer:** ${dealerDisplay}\n`;
  msg += `**You:** ${formatHand(playerHand)} - *${handValue(playerHand)}*`;
  if (status) msg += `\n\n${status}`;
  return msg;
}

function buildButtons(showDoubleDown: boolean, disabled = false): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("bj_hit")
      .setLabel("Hit")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId("bj_stand")
      .setLabel("Stand")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled)
  );
  if (showDoubleDown) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId("bj_double")
        .setLabel("Double Down")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(disabled)
    );
  }
  return row;
}

function resolveResult(playerVal: number, dealerVal: number, doubled: boolean): string {
  const suffix = doubled ? " *(Double Down)*" : "";
  if (dealerVal > 21) return `🎉 **Dealer busts - You win!**${suffix}`;
  if (playerVal > dealerVal) return `🎉 **You win!**${suffix}`;
  if (dealerVal > playerVal) return `😔 **Dealer wins.**${suffix}`;
  return "🤝 **Push - it's a tie!**";
}

async function standAndReveal(
  btn: ButtonInteraction,
  playerHand: Card[],
  dealerHand: Card[],
  deck: Card[],
  doubled: boolean
): Promise<void> {
  while (handValue(dealerHand) < 17) {
    dealerHand.push(deck.pop()!);
  }
  const status = resolveResult(handValue(playerHand), handValue(dealerHand), doubled);
  await btn.update({
    content: buildMessage(playerHand, dealerHand, false, status),
    components: [],
  });
}

export const command = new SlashCommandBuilder()
  .setName("blackjack")
  .setDescription("Play a game of Blackjack (against the bot)");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const deck = createShuffledDeck();
  const playerHand: Card[] = [deck.pop()!, deck.pop()!];
  const dealerHand: Card[] = [deck.pop()!, deck.pop()!];

  // Natural blackjack check
  if (handValue(playerHand) === 21) {
    const dealerVal = handValue(dealerHand);
    const status = dealerVal === 21
      ? "🤝 **Both have Blackjack - Push!**"
      : "🎉 **Blackjack! You win!**";
    await interaction.reply({
      content: buildMessage(playerHand, dealerHand, false, status),
      components: [],
    });
    return;
  }

  const response = await interaction.reply({
    content: buildMessage(playerHand, dealerHand, true),
    components: [buildButtons(true)],
    fetchReply: true,
  }) as Message;

  const collector = response.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 5 * 60 * 1000,
  });

  collector.on("collect", async (btn: ButtonInteraction) => {
    if (btn.user.id !== interaction.user.id) {
      await btn.reply({ content: "This isn't your game!", ephemeral: true });
      return;
    }

    if (btn.customId === "bj_hit") {
      playerHand.push(deck.pop()!);
      const pv = handValue(playerHand);

      if (pv > 21) {
        collector.stop("bust");
        await btn.update({
          content: buildMessage(playerHand, dealerHand, false, "💥 **Bust! You lose.**"),
          components: [],
        });
        return;
      }

      if (pv === 21) {
        // Auto-stand at exactly 21
        collector.stop("stand");
        await standAndReveal(btn, playerHand, dealerHand, deck, false);
        return;
      }

      await btn.update({
        content: buildMessage(playerHand, dealerHand, true),
        components: [buildButtons(false)],
      });

    } else if (btn.customId === "bj_stand") {
      collector.stop("stand");
      await standAndReveal(btn, playerHand, dealerHand, deck, false);

    } else if (btn.customId === "bj_double") {
      playerHand.push(deck.pop()!);
      collector.stop("double");

      if (handValue(playerHand) > 21) {
        await btn.update({
          content: buildMessage(playerHand, dealerHand, false, "💥 **Bust on Double Down! You lose.**"),
          components: [],
        });
        return;
      }

      await standAndReveal(btn, playerHand, dealerHand, deck, true);
    }
  });

  collector.on("end", async (_, reason) => {
    if (reason === "time") {
      await response.edit({
        content: buildMessage(playerHand, dealerHand, true, "⏰ **Game timed out.**"),
        components: [],
      });
    }
  });
}
