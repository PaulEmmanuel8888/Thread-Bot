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

Write a thread consisting of exactly 3 to 5 posts.

Writing style:
- Conversational
- Direct
- Practical
- Clear
- Specific
- No emojis
- No generic AI phrases like "It wasn't just {x}. It was that."
- No very short sentences with unnecessary breaks in between
- Useful rather than motivational
- Sound like a real developer sharing useful knowledge, not a marketing guru

Requirements:
- The FIRST post must be a strong hook that makes someone want to keep reading.
- Each post should naturally lead into the next.
- Give actionable advice, examples, or steps where appropriate.
- Keep the content focused on freelancing, clients, selling yourself,
  positioning, outreach, portfolios, pricing, or business.
- Do not invent personal experiences.
- Do not claim to have worked with clients you haven't been given.
- Do not invent income, results, statistics, case studies, or success stories.
- Do not make unrealistic promises.
- Do not repeat the topic title word-for-word as the hook.
- Avoid generic motivational phrases.
- Each post must be short enough for a standard X post.

Format:
1. First post

2. Second post

3. Third post

4. Fourth post (if needed)

5. Fifth post (if needed)

Return ONLY the thread.
Do not include an introduction.
Do not include explanations.
Do not use markdown headings.
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

      await ctx.reply(`🔥 Your thread:\n\n${thread}`);
    } catch (error) {
      console.error(error);

      await ctx.reply(
        "❌ Something went wrong while writing the thread. Please try again.",
      );
    }
  }
});

bot.launch();

console.log("🤖 Thread bot is running...");
