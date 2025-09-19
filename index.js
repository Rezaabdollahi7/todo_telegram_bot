const { Telegraf, Markup } = require("telegraf");
require("dotenv").config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// دیتابیس ساده در حافظه
let todos = {};
let waitingForTask = {}; // برای نگه داشتن حالت "منتظر دریافت تسک جدید"

// وقتی /start زده میشه
bot.start((ctx) => {
  ctx.reply(
    "سلام 👋 به ربات TODO خوش اومدی!\n\nچه کاری می‌خوای انجام بدی؟",
    Markup.inlineKeyboard([
      [Markup.button.callback("➕ افزودن تسک", "add_task")],
      [Markup.button.callback("📋 لیست تسک‌ها", "list_tasks")],
      [Markup.button.callback("⚙️ تنظیمات", "settings")],
    ])
  );
});

// دکمه افزودن تسک
bot.action("add_task", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  waitingForTask[userId] = true; // کاربر در حالت "افزودن تسک" قرار می‌گیره
  ctx.reply("لطفاً تسک جدیدت رو بفرست ✍️");
});

// دریافت پیام کاربر (برای افزودن تسک جدید)
bot.on("text", (ctx) => {
  const userId = ctx.from.id;

  if (waitingForTask[userId]) {
    const task = ctx.message.text;

    if (!todos[userId]) todos[userId] = [];
    todos[userId].push({ text: task, done: false });

    waitingForTask[userId] = false;

    ctx.reply(`✅ تسک "${task}" اضافه شد!`);
  }
});

// دکمه لیست تسک‌ها
bot.action("list_tasks", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!todos[userId] || todos[userId].length === 0) {
    ctx.reply("📭 لیست تسک‌هات خالیه!");
    return;
  }

  todos[userId].forEach((task, index) => {
    ctx.reply(
      `${task.done ? "✅" : "📝"} ${task.text}`,
      Markup.inlineKeyboard([
        [Markup.button.callback("✅ انجام شد", `done_${index}`)],
        [Markup.button.callback("❌ حذف", `delete_${index}`)],
      ])
    );
  });
});

// مارک کردن تسک به‌عنوان انجام‌شده
bot.action(/done_(\d+)/, async (ctx) => {
  await ctx.answerCbQuery("تسک انجام شد!"); // جواب سریع به query
  const userId = ctx.from.id;
  const index = parseInt(ctx.match[1]);

  if (todos[userId] && todos[userId][index]) {
    todos[userId][index].done = true;
    await ctx.editMessageText(`✅ ${todos[userId][index].text}`);
  }
});

// حذف تسک
bot.action(/delete_(\d+)/, async (ctx) => {
  await ctx.answerCbQuery("تسک حذف شد!"); // جواب سریع به query
  const userId = ctx.from.id;
  const index = parseInt(ctx.match[1]);

  if (todos[userId] && todos[userId][index]) {
    const removed = todos[userId].splice(index, 1);
    await ctx.editMessageText(`❌ ${removed[0].text} (حذف شد)`);
  }
});

// دکمه تنظیمات
bot.action("settings", async (ctx) => {
  await ctx.answerCbQuery();
  ctx.reply("بخش تنظیمات (در حال توسعه) ⚙️");
});

// اجرای ربات
bot.launch();
console.log("Bot started...");
