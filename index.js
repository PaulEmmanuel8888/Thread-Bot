import "dotenv/config";
import { Telegraf, Markup } from "telegraf";
import OpenAI from "openai";

const bot = new Telegraf(process.env.BOT_TOKEN);

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
});

const niches = [
  "💰 Getting Clients",
  "🧲 Freelancing",
  "📈 Growing Your Business",
  "🛠️ Tools & Resources",
  "🧠 Beginner Lessons",
  "🎲 Surprise Me",
];

async function generateIdeas(niche) {
  const prompt = `
You are a content strategist helping a web developer grow on X.

Generate exactly 5 strong X thread ideas for this niche:

${niche}

The target audience is primarily:
- Beginner/intermediate freelance web developers
- Developers trying to get clients
- People trying to make money from freelancing
- People trying to grow their freelance business

Important:
- Focus on practical freelancing and client-acquisition topics.
- Do NOT generate generic programming tutorials.
- Each idea should have a compelling hook.
- Ideas should work well as a 3–5 post X thread.
- Avoid fake guru language and unrealistic income claims.
- Make the ideas specific rather than vague.
- Return ONLY the 5 ideas, numbered 1–5.
`;

  const response = await openai.chat.completions.create({
    model: "openrouter/free",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return response.choices[0].message.content;
}

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

    await ctx.reply(`💡 Generating ideas for ${niche}...`);

    try {
      const ideas = await generateIdeas(niche);

      await ctx.reply(`🔥 Here are 5 thread ideas for ${niche}:\n\n${ideas}`);
    } catch (error) {
      console.error(error);

      await ctx.reply(
        "❌ Something went wrong while generating the ideas. Try again.",
      );
    }
  }
});

bot.launch();

console.log("🤖 Thread bot is running...");
