import dotenv from "dotenv";

import { Telegraf } from "telegraf";

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);

const niches = [
  "💰 Getting Clients",
  "🧲 Freelancing",
  "📈 Growing Your Business",
  "🛠️ Tools & Resources",
  "🧠 Beginner Lessons",
  "🎲 Surprise Me",
];

bot.start((ctx) => {
  ctx.reply(
    "👋 Hey! Let's make some content.\n\nWhat do you want to write about?",
    Markup.inlineKeyboard(
      niches.map((niche) => [Markup.button.callback(niche, `niche:${niche}`)]),
    ),
  );
});

bot.on("callback_query", async (ctx) => {
  const data = ctx.callbackQuery.data;

  if (data.startsWith("niche:")) {
    const niche = data.replace("niche:", "");

    await ctx.answerCbQuery();

    ctx.reply(`You selected: ${niche}`);
  }
});

bot.launch();

console.log("🤖 Thread bot is running...");
