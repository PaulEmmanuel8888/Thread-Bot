import "dotenv/config";
import { Telegraf, Markup } from "telegraf";
import OpenAI from "openai";
import express from "express";

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

const userIdeas = new Map();

async function generateIdeas(niche) {
  console.log("🤖 Generating ideas for:", niche);

  const prompt = `
You are helping a web developer create content for X.

Generate exactly 5 X thread topic ideas for:

${niche}

Target audience:
- Beginner and intermediate freelance web developers
- Developers trying to get their first clients
- Freelancers trying to get more clients
- People trying to turn web development into income

Content direction:
- Focus heavily on client acquisition, freelancing, sales, positioning,
  outreach, portfolios, pricing, and growing a freelance business.
- Technical programming content should NOT be the focus.
- Make each idea practical and actionable.
- Make the titles interesting and specific.
- Do not invent personal experiences, results, clients, income,
  statistics, or case studies.
- Avoid unrealistic claims and generic motivational content.

Return ONLY the 5 titles.

Use exactly this format:

1. Title
2. Title
3. Title
4. Title
5. Title

No introduction.
No explanations.
No emojis.
No markdown.
`;

  console.log("📡 Sending request to OpenRouter...");

  const response = await openai.chat.completions.create(
    {
      model: "openrouter/free",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    },
    {
      timeout: 60000,
    },
  );
  console.log(" OpenRouter responded");

  return response.choices[0].message.content;
}

async function generateThread(title) {
  const prompt = `
You are helping a web developer write a high-quality thread for X.

Thread topic:
${title}

Target audience:
- Beginner and intermediate freelance web developers
- Developers trying to get their first clients
- Freelancers trying to get more clients
- People trying to turn web development into income

Write a useful, well-developed X thread consisting of 3 to 5 posts.

The thread should feel like a complete piece of advice, not a collection
of short motivational statements.

THREAD STRUCTURE:

Post 1:
Start with a strong hook that creates curiosity or challenges a common
belief. Make the reader want to continue.

Post 2:
Develop the main idea. Explain the problem, mistake, or concept clearly.

Post 3:
Give practical advice, a framework, steps, or examples.

Post 4:
Continue developing the idea with a useful example, clarification,
or practical application.

Post 5:
End with a clear takeaway or specific action the reader can take.
Only include this post if it adds value.

WRITING STYLE:
- Conversational
- Direct
- Practical
- Specific
- Clear
- Insightful
- Slightly opinionated when appropriate
- Sound like a real developer sharing useful knowledge
- Do not sound like an AI, marketing guru, or motivational speaker

IMPORTANT:
- Do NOT make the posts unnecessarily short.
- Develop each idea properly.
- A post can contain multiple sentences.
- Aim for roughly 150–280 characters per post when possible,
  but prioritize useful content over hitting an exact length.
- Use line breaks within a post when they improve readability.
- Avoid filler.
- Avoid repeating the same point across multiple posts.
- Each post should naturally lead into the next.
- Include concrete examples where they make the advice clearer.
- Technical programming content should NOT be the focus.
- Focus on freelancing, getting clients, positioning, outreach,
  portfolios, pricing, sales, and growing a freelance business.

DO NOT:
- Invent personal experiences.
- Claim the writer worked with clients they haven't been given.
- Invent income, results, statistics, case studies, or success stories.
- Make unrealistic promises.
- Use fake authority.
- Use generic motivational phrases.
- Repeat the topic title word-for-word as the hook.
- Use excessive emojis.

OUTPUT FORMAT:

POST 1
[post text]

---POST---

POST 2
[post text]

---POST---

POST 3
[post text]

---POST---

POST 4
[post text]

---POST---

POST 5
[post text]

Only include posts that are actually needed.
Return ONLY the thread.
`;

  const response = await openai.chat.completions.create(
    {
      model: "openrouter/free",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    },
    {
      timeout: 60000,
    },
  );

  return response.choices[0].message.content;
}

function createIdeaButtons(ideas) {
  const lines = ideas
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^\d+\./.test(line));

  return lines.map((line, index) => {
    const title = line.replace(/^\d+\.\s*/, "");
    const shortTitle = title.length > 35 ? title.slice(0, 35) + "..." : title;

    return [
      Markup.button.callback(`${index + 1}. ${shortTitle}`, `idea:${index}`),
    ];
  });
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

      userIdeas.set(ctx.from.id, ideas);

      await ctx.reply(
        `🔥 Choose a thread idea for ${niche}:`,
        Markup.inlineKeyboard(createIdeaButtons(ideas)),
      );
    } catch (error) {
      console.error(error);

      await ctx.reply(
        "❌ Something went wrong while generating the ideas. Try again.",
      );
    }
  }

  if (data.startsWith("idea:")) {
    const index = Number(data.split(":")[1]);

    const ideas = userIdeas.get(ctx.from.id);

    if (!ideas) {
      await ctx.answerCbQuery("Ideas expired. Please start again.");
      return;
    }

    const lines = ideas
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /^\d+\./.test(line));

    const title = lines[index]?.replace(/^\d+\.\s*/, "");

    if (!title) {
      await ctx.answerCbQuery("That idea could not be found.");
      return;
    }

    await ctx.answerCbQuery();

    await ctx.reply(
      `🧵 You selected:\n\n"${title}"\n\n✍️ Writing your thread...`,
    );

    try {
      const thread = await generateThread(title);

      const formattedThread = thread
        .replace(/POST \d+\n/g, "")
        .replace(/\n---POST---\n/g, "\n\n────────────\n\n");

      await ctx.reply(`🔥 Your thread:\n\n${formattedThread}`);
      console.log(formattedThread);
    } catch (error) {
      console.error(error);

      await ctx.reply(
        "❌ Something went wrong while writing the thread. Please try again.",
      );
    }
  }
});

const app = express();

app.use(express.json());

app.use(bot.webhookCallback("/telegram"));

app.get("/", (req, res) => {
  res.send("🤖 Thread Bot is running!");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", async () => {
  console.log(`🤖 Thread bot is running on port ${PORT}`);

  const webhookUrl = `${process.env.WEBHOOK_URL}/telegram`;

  await bot.telegram.setWebhook(webhookUrl);

  console.log(`🔗 Telegram webhook set to: ${webhookUrl}`);
});
