const { Telegraf, Markup } = require("telegraf");
require("dotenv").config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// دیتابیس ساده در حافظه
let todos = {};
let waitingForTask = {};
let waitingForCategory = {};
let userCategories = {};

// تابع کمکی برای نمایش منوی اصلی
function getMainMenu() {
  return Markup.inlineKeyboard([
    [Markup.button.callback("➕ افزودن تسک جدید", "add_task")],
    [Markup.button.callback("📋 نمایش تسک‌های من", "list_tasks")],
    [
      Markup.button.callback("✅ انجام‌شده‌ها", "completed_tasks"),
      Markup.button.callback("📝 در انتظار", "pending_tasks"),
    ],
    [
      Markup.button.callback("🏷 مدیریت دسته‌ها", "categories_menu"),
      Markup.button.callback("📊 آمار", "stats"),
    ],
    [
      Markup.button.callback("🗑 پاک‌سازی", "clear_menu"),
      Markup.button.callback("⚙️ تنظیمات", "settings"),
    ],
  ]);
}

// تابع کمکی برای دریافت دسته‌های پیش‌فرض
function getDefaultCategories() {
  return [
    { name: "کاری", emoji: "💼" },
    { name: "شخصی", emoji: "🏠" },
    { name: "خرید", emoji: "🛒" },
    { name: "ورزش", emoji: "🏃‍♂️" },
    { name: "مطالعه", emoji: "📚" },
    { name: "سلامت", emoji: "🏥" },
  ];
}

// تابع کمکی برای اولیه‌سازی دسته‌های کاربر
function initUserCategories(userId) {
  if (!userCategories[userId]) {
    userCategories[userId] = getDefaultCategories();
  }
}

// تابع کمکی برای نمایش دسته‌بندی‌ها
function getCategoriesKeyboard(userId, action = "select") {
  initUserCategories(userId);

  const buttons = [];
  const categories = userCategories[userId];

  // نمایش دسته‌ها در ردیف‌های 2 تایی
  for (let i = 0; i < categories.length; i += 2) {
    const row = [];
    row.push(
      Markup.button.callback(
        `${categories[i].emoji} ${categories[i].name}`,
        `${action}_category_${i}`
      )
    );

    if (i + 1 < categories.length) {
      row.push(
        Markup.button.callback(
          `${categories[i + 1].emoji} ${categories[i + 1].name}`,
          `${action}_category_${i + 1}`
        )
      );
    }
    buttons.push(row);
  }

  // دکمه‌های اضافی بر اساس نوع عمل
  if (action === "select") {
    buttons.push([
      Markup.button.callback("📝 بدون دسته", "select_no_category"),
    ]);
  }

  buttons.push([Markup.button.callback("🏠 بازگشت", "main_menu")]);

  return Markup.inlineKeyboard(buttons);
}
function getTaskKeyboard(index, task) {
  const buttons = [];

  if (!task.done) {
    buttons.push([Markup.button.callback("✅ انجام شد", `done_${index}`)]);
  } else {
    buttons.push([Markup.button.callback("↩️ بازگردانی", `undone_${index}`)]);
  }

  buttons.push([
    Markup.button.callback("✏️ ویرایش", `edit_${index}`),
    Markup.button.callback("❌ حذف", `delete_${index}`),
  ]);

  return Markup.inlineKeyboard(buttons);
}

// تابع کمکی برای نمایش آمار
function getUserStats(userId) {
  if (!todos[userId] || todos[userId].length === 0) {
    return "📊 آمار شما:\n\n📭 هیچ تسکی وجود ندارد";
  }

  initUserCategories(userId);

  const total = todos[userId].length;
  const completed = todos[userId].filter((t) => t.done).length;
  const pending = total - completed;
  const completionRate = Math.round((completed / total) * 100);

  // آمار دسته‌بندی
  let categoryStats = "\n📂 آمار دسته‌ها:\n";
  const categories = userCategories[userId];

  categories.forEach((category) => {
    const categoryTasks = todos[userId].filter(
      (t) => t.category === category.name
    );
    if (categoryTasks.length > 0) {
      const categoryCompleted = categoryTasks.filter((t) => t.done).length;
      categoryStats += `${category.emoji} ${category.name}: ${categoryCompleted}/${categoryTasks.length}\n`;
    }
  });

  const noCategoryTasks = todos[userId].filter(
    (t) => !t.category || t.category === "بدون دسته"
  );
  if (noCategoryTasks.length > 0) {
    const noCategoryCompleted = noCategoryTasks.filter((t) => t.done).length;
    categoryStats += `📝 بدون دسته: ${noCategoryCompleted}/${noCategoryTasks.length}\n`;
  }

  return `📊 آمار شما:
  
📝 کل تسک‌ها: ${total}
✅ انجام‌شده: ${completed}
⏳ در انتظار: ${pending}
📈 درصد پیشرفت: ${completionRate}%

${categoryStats}
${
  completionRate >= 80
    ? "🎉 عالی! شما در حال پیشرفت بسیار خوبی هستید!"
    : completionRate >= 50
    ? "👏 خوب است! ادامه دهید!"
    : "💪 شروع خوبی داشته‌اید، ادامه دهید!"
}`;
}

// وقتی /start زده می‌شه
bot.start((ctx) => {
  const firstName = ctx.from.first_name || "کاربر";
  ctx.reply(
    `🎯 سلام ${firstName} عزیز! 👋

به ربات **TODO Pro** خوش آمدید! 🚀

این ربات به شما کمک می‌کند:
• 📝 تسک‌هایتان را مدیریت کنید
• ✅ پیشرفت خود را پیگیری کنید  
• 📊 آمار عملکردتان را مشاهده کنید

برای شروع، یکی از گزینه‌های زیر را انتخاب کنید:`,
    getMainMenu()
  );
});

// دکمه بازگشت به منوی اصلی
bot.action("main_menu", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    "🏠 منوی اصلی\n\nچه کاری می‌خواهید انجام دهید؟",
    getMainMenu()
  );
});

// دکمه افزودن تسک
bot.action("add_task", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  await ctx.editMessageText(
    "🏷 ابتدا دسته‌بندی تسک جدید را انتخاب کنید:",
    getCategoriesKeyboard(userId, "select")
  );
});

// انتخاب دسته برای تسک جدید
bot.action(/select_category_(\d+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  const categoryIndex = parseInt(ctx.match[1]);

  initUserCategories(userId);
  const selectedCategory = userCategories[userId][categoryIndex];

  waitingForTask[userId] = {
    category: selectedCategory.name,
    categoryEmoji: selectedCategory.emoji,
  };

  await ctx.editMessageText(
    `✍️ تسک جدید برای دسته **${selectedCategory.emoji} ${selectedCategory.name}**:\n\nلطفاً متن تسک خود را بنویسید:\n\n💡 نکته: سعی کنید تسک را واضح و مشخص بنویسید`,
    Markup.inlineKeyboard([[Markup.button.callback("🚫 انصراف", "main_menu")]])
  );
});

// انتخاب "بدون دسته"
bot.action("select_no_category", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  waitingForTask[userId] = { category: "بدون دسته", categoryEmoji: "📝" };

  await ctx.editMessageText(
    "✍️ تسک جدید **بدون دسته‌بندی**:\n\nلطفاً متن تسک خود را بنویسید:\n\n💡 نکته: سعی کنید تسک را واضح و مشخص بنویسید",
    Markup.inlineKeyboard([[Markup.button.callback("🚫 انصراف", "main_menu")]])
  );
});
bot.on("text", (ctx) => {
  const userId = ctx.from.id;

  if (waitingForTask[userId]) {
    const task = ctx.message.text.trim();

    if (task.length < 3) {
      ctx.reply("❌ تسک باید حداقل ۳ کاراکتر باشد!");
      return;
    }

    if (task.length > 200) {
      ctx.reply("❌ تسک نمی‌تواند بیش از ۲۰۰ کاراکتر باشد!");
      return;
    }

    if (!todos[userId]) todos[userId] = [];

    todos[userId].push({
      text: task,
      done: false,
      createdAt: new Date().toLocaleString("fa-IR"),
      priority: "normal",
    });

    waitingForTask[userId] = false;

    ctx.reply(
      `✅ تسک جدید با موفقیت اضافه شد!\n\n📝 "${task}"\n🕐 ${new Date().toLocaleString(
        "fa-IR"
      )}`,
      getMainMenu()
    );
  }
});

// نمایش همه تسک‌ها
bot.action("list_tasks", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!todos[userId] || todos[userId].length === 0) {
    await ctx.editMessageText(
      "📭 لیست تسک‌های شما خالی است!\n\nبرای شروع، یک تسک جدید اضافه کنید.",
      getMainMenu()
    );
    return;
  }

  await ctx.editMessageText(
    `📋 لیست تسک‌های شما (${todos[userId].length} مورد):`,
    Markup.inlineKeyboard([
      [Markup.button.callback("🔄 بروزرسانی", "list_tasks")],
      [Markup.button.callback("🏠 منوی اصلی", "main_menu")],
    ])
  );

  todos[userId].forEach((task, index) => {
    const status = task.done ? "✅" : "📝";
    const categoryInfo = task.category
      ? `${task.categoryEmoji || "📁"} ${task.category}`
      : "📝 بدون دسته";

    ctx.reply(
      `${status} **تسک ${index + 1}:**\n${
        task.text
      }\n\n🏷 دسته: ${categoryInfo}\n🕐 ایجاد شده: ${task.createdAt}`,
      getTaskKeyboard(index, task)
    );
  });
});

// نمایش تسک‌های تکمیل شده
bot.action("completed_tasks", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!todos[userId]) {
    await ctx.editMessageText(
      "📭 هیچ تسک تکمیل‌شده‌ای وجود ندارد!",
      getMainMenu()
    );
    return;
  }

  const completedTasks = todos[userId].filter((task) => task.done);

  if (completedTasks.length === 0) {
    await ctx.editMessageText(
      "📝 هیچ تسک تکمیل‌شده‌ای وجود ندارد!\n\nوقت آن رسیده که به کارهایتان برسید! 💪",
      getMainMenu()
    );
    return;
  }

  let message = `✅ تسک‌های تکمیل شده (${completedTasks.length} مورد):\n\n`;
  completedTasks.forEach((task, i) => {
    const categoryInfo = task.category
      ? `${task.categoryEmoji || "📁"} ${task.category}`
      : "📝";
    message += `${i + 1}. ${categoryInfo} ${task.text}\n`;
  });

  await ctx.editMessageText(message, getMainMenu());
});

// نمایش تسک‌های در انتظار
bot.action("pending_tasks", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!todos[userId]) {
    await ctx.editMessageText(
      "📭 هیچ تسک در انتظاری وجود ندارد!",
      getMainMenu()
    );
    return;
  }

  const pendingTasks = todos[userId].filter((task) => !task.done);

  if (pendingTasks.length === 0) {
    await ctx.editMessageText(
      "🎉 تبریک! همه تسک‌های شما تکمیل شده است!\n\nوقت اضافه کردن تسک‌های جدید است! ✨",
      getMainMenu()
    );
    return;
  }

  let message = `📝 تسک‌های در انتظار (${pendingTasks.length} مورد):\n\n`;
  pendingTasks.forEach((task, i) => {
    const categoryInfo = task.category
      ? `${task.categoryEmoji || "📁"} ${task.category}`
      : "📝";
    message += `${i + 1}. ${categoryInfo} ${task.text}\n`;
  });

  message += "\n💪 بیایید این‌ها را تمام کنیم!";

  await ctx.editMessageText(message, getMainMenu());
});

// آمار
bot.action("stats", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  await ctx.editMessageText(getUserStats(userId), getMainMenu());
});

// مارک کردن تسک به‌عنوان انجام‌شده
bot.action(/done_(\d+)/, async (ctx) => {
  await ctx.answerCbQuery("✅ تسک انجام شد!");
  const userId = ctx.from.id;
  const index = parseInt(ctx.match[1]);

  if (todos[userId] && todos[userId][index]) {
    todos[userId][index].done = true;
    todos[userId][index].completedAt = new Date().toLocaleString("fa-IR");

    await ctx.editMessageText(
      `✅ **تسک ${index + 1} تکمیل شد:**\n${
        todos[userId][index].text
      }\n\n🏷 دسته: ${
        todos[userId][index].category
          ? `${todos[userId][index].categoryEmoji || "📁"} ${
              todos[userId][index].category
            }`
          : "📝 بدون دسته"
      }\n🕐 ایجاد شده: ${todos[userId][index].createdAt}\n✅ تکمیل شده: ${
        todos[userId][index].completedAt
      }`,
      getTaskKeyboard(index, todos[userId][index])
    );
  }
});

// بازگردانی تسک
bot.action(/undone_(\d+)/, async (ctx) => {
  await ctx.answerCbQuery("↩️ تسک بازگردانی شد!");
  const userId = ctx.from.id;
  const index = parseInt(ctx.match[1]);

  if (todos[userId] && todos[userId][index]) {
    todos[userId][index].done = false;
    delete todos[userId][index].completedAt;

    await ctx.editMessageText(
      `📝 **تسک ${index + 1} (بازگردانی شده):**\n${
        todos[userId][index].text
      }\n\n🏷 دسته: ${
        todos[userId][index].category
          ? `${todos[userId][index].categoryEmoji || "📁"} ${
              todos[userId][index].category
            }`
          : "📝 بدون دسته"
      }\n🕐 ایجاد شده: ${todos[userId][index].createdAt}`,
      getTaskKeyboard(index, todos[userId][index])
    );
  }
});

// حذف تسک
bot.action(/delete_(\d+)/, async (ctx) => {
  const userId = ctx.from.id;
  const index = parseInt(ctx.match[1]);

  if (todos[userId] && todos[userId][index]) {
    await ctx.editMessageText(
      `⚠️ آیا مطمئن هستید که می‌خواهید این تسک را حذف کنید؟\n\n"${todos[userId][index].text}"`,
      Markup.inlineKeyboard([
        [Markup.button.callback("✅ بله، حذف کن", `confirm_delete_${index}`)],
        [Markup.button.callback("❌ خیر، انصراف", `cancel_delete_${index}`)],
      ])
    );
  }
});

// تایید حذف تسک
bot.action(/confirm_delete_(\d+)/, async (ctx) => {
  await ctx.answerCbQuery("🗑 تسک حذف شد!");
  const userId = ctx.from.id;
  const index = parseInt(ctx.match[1]);

  if (todos[userId] && todos[userId][index]) {
    const removed = todos[userId].splice(index, 1);
    await ctx.editMessageText(
      `🗑 تسک حذف شد:\n\n"${removed[0].text}"\n\n✨ حالا فضای بیشتری برای تسک‌های جدید دارید!`,
      getMainMenu()
    );
  }
});

// منوی مدیریت دسته‌ها
bot.action("categories_menu", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  initUserCategories(userId);

  let message = `🏷 **مدیریت دسته‌ها**\n\nدسته‌های فعلی شما:\n\n`;

  userCategories[userId].forEach((category, index) => {
    const taskCount = todos[userId]
      ? todos[userId].filter((t) => t.category === category.name).length
      : 0;
    message += `${category.emoji} **${category.name}** (${taskCount} تسک)\n`;
  });

  await ctx.editMessageText(
    message,
    Markup.inlineKeyboard([
      [Markup.button.callback("➕ افزودن دسته جدید", "add_category")],
      [Markup.button.callback("📂 نمایش تسک‌های هر دسته", "view_by_category")],
      [Markup.button.callback("✏️ ویرایش دسته‌ها", "edit_categories")],
      [Markup.button.callback("🏠 بازگشت", "main_menu")],
    ])
  );
});

// افزودن دسته جدید
bot.action("add_category", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  waitingForCategory[userId] = true;

  await ctx.editMessageText(
    "📝 نام دسته جدید را وارد کنید:\n\n💡 نکته: نام دسته باید بین ۲ تا ۲۰ کاراکتر باشد",
    Markup.inlineKeyboard([
      [Markup.button.callback("🚫 انصراف", "categories_menu")],
    ])
  );
});

// نمایش تسک‌ها بر اساس دسته
bot.action("view_by_category", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!todos[userId] || todos[userId].length === 0) {
    await ctx.editMessageText("📭 هیچ تسکی وجود ندارد!", getMainMenu());
    return;
  }

  await ctx.editMessageText(
    "🏷 کدام دسته را می‌خواهید مشاهده کنید؟",
    getCategoriesKeyboard(userId, "view")
  );
});

// نمایش تسک‌های یک دسته خاص
bot.action(/view_category_(\d+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  const categoryIndex = parseInt(ctx.match[1]);

  initUserCategories(userId);
  const selectedCategory = userCategories[userId][categoryIndex];

  if (!todos[userId]) {
    await ctx.editMessageText("📭 هیچ تسکی وجود ندارد!", getMainMenu());
    return;
  }

  const categoryTasks = todos[userId].filter(
    (t) => t.category === selectedCategory.name
  );

  if (categoryTasks.length === 0) {
    await ctx.editMessageText(
      `📭 هیچ تسکی در دسته **${selectedCategory.emoji} ${selectedCategory.name}** وجود ندارد!`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback(
            "➕ افزودن تسک به این دسته",
            `select_category_${categoryIndex}`
          ),
        ],
        [Markup.button.callback("🏠 بازگشت", "main_menu")],
      ])
    );
    return;
  }

  const completedCount = categoryTasks.filter((t) => t.done).length;

  let message = `${selectedCategory.emoji} **دسته: ${selectedCategory.name}**\n\n📊 آمار: ${completedCount}/${categoryTasks.length} تکمیل شده\n\n`;

  categoryTasks.forEach((task, i) => {
    const status = task.done ? "✅" : "📝";
    message += `${status} ${i + 1}. ${task.text}\n`;
  });

  await ctx.editMessageText(
    message,
    Markup.inlineKeyboard([
      [
        Markup.button.callback(
          "🔄 بروزرسانی",
          `view_category_${categoryIndex}`
        ),
      ],
      [Markup.button.callback("🏷 سایر دسته‌ها", "view_by_category")],
      [Markup.button.callback("🏠 بازگشت", "main_menu")],
    ])
  );
});

// تغییر دسته تسک
bot.action(/change_category_(\d+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  const taskIndex = parseInt(ctx.match[1]);

  if (!todos[userId] || !todos[userId][taskIndex]) {
    await ctx.editMessageText("❌ تسک یافت نشد!", getMainMenu());
    return;
  }

  // ذخیره ایندکس تسک برای استفاده بعدی
  ctx.session = { changingTaskIndex: taskIndex };

  await ctx.editMessageText(
    `🏷 دسته جدید برای تسک زیر را انتخاب کنید:\n\n"${todos[userId][taskIndex].text}"`,
    getCategoriesKeyboard(userId, "change")
  );
});

// اعمال تغییر دسته
bot.action(/change_category_(\d+)/, async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;
  const categoryIndex = parseInt(ctx.match[1]);

  // پیدا کردن تسک از طریق callback data
  const callbackParts = ctx.callbackQuery.data.split("_");
  const taskIndex = parseInt(callbackParts[2]);

  if (!todos[userId] || !todos[userId][taskIndex]) {
    await ctx.editMessageText("❌ تسک یافت نشد!", getMainMenu());
    return;
  }

  initUserCategories(userId);
  const selectedCategory = userCategories[userId][categoryIndex];

  todos[userId][taskIndex].category = selectedCategory.name;
  todos[userId][taskIndex].categoryEmoji = selectedCategory.emoji;

  await ctx.editMessageText(
    `✅ دسته تسک تغییر کرد!\n\n📝 **تسک:** ${todos[userId][taskIndex].text}\n🏷 **دسته جدید:** ${selectedCategory.emoji} ${selectedCategory.name}`,
    getMainMenu()
  );
});

// تغییر دسته به "بدون دسته"
bot.action(/change_no_category/, async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  // استخراج ایندکس تسک از callback data
  const taskIndex = ctx.session?.changingTaskIndex;

  if (!todos[userId] || !todos[userId][taskIndex]) {
    await ctx.editMessageText("❌ تسک یافت نشد!", getMainMenu());
    return;
  }

  todos[userId][taskIndex].category = "بدون دسته";
  todos[userId][taskIndex].categoryEmoji = "📝";

  await ctx.editMessageText(
    `✅ تسک به حالت بدون دسته تغییر کرد!\n\n📝 **تسک:** ${todos[userId][taskIndex].text}`,
    getMainMenu()
  );
});
bot.action(/cancel_delete_(\d+)/, async (ctx) => {
  await ctx.answerCbQuery("❌ عملیات لغو شد");
  const userId = ctx.from.id;
  const index = parseInt(ctx.match[1]);

  if (todos[userId] && todos[userId][index]) {
    await ctx.editMessageText(
      `📝 **تسک ${index + 1}:**\n${
        todos[userId][index].text
      }\n\n🕐 ایجاد شده: ${todos[userId][index].createdAt}`,
      getTaskKeyboard(index, todos[userId][index])
    );
  }
});

// منوی پاک‌سازی
bot.action("clear_menu", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!todos[userId] || todos[userId].length === 0) {
    await ctx.editMessageText("📭 لیست شما خالی است!", getMainMenu());
    return;
  }

  const total = todos[userId].length;
  const completed = todos[userId].filter((t) => t.done).length;

  await ctx.editMessageText(
    `🗑 پاک‌سازی لیست تسک‌ها\n\n📊 وضعیت فعلی:\n• کل: ${total}\n• تکمیل شده: ${completed}\n• در انتظار: ${
      total - completed
    }`,
    Markup.inlineKeyboard([
      [Markup.button.callback("🗑 حذف تسک‌های تکمیل شده", "clear_completed")],
      [Markup.button.callback("⚠️ حذف همه تسک‌ها", "clear_all_confirm")],
      [Markup.button.callback("🏠 بازگشت", "main_menu")],
    ])
  );
});

// حذف تسک‌های تکمیل شده
bot.action("clear_completed", async (ctx) => {
  await ctx.answerCbQuery();
  const userId = ctx.from.id;

  if (!todos[userId]) {
    await ctx.editMessageText("📭 لیست شما خالی است!", getMainMenu());
    return;
  }

  const beforeCount = todos[userId].length;
  todos[userId] = todos[userId].filter((task) => !task.done);
  const removedCount = beforeCount - todos[userId].length;

  if (removedCount === 0) {
    await ctx.editMessageText(
      "ℹ️ هیچ تسک تکمیل‌شده‌ای برای حذف وجود ندارد!",
      getMainMenu()
    );
  } else {
    await ctx.editMessageText(
      `✅ ${removedCount} تسک تکمیل شده حذف شد!\n\n🎯 ${todos[userId].length} تسک باقی‌مانده در لیست شما`,
      getMainMenu()
    );
  }
});

// تایید حذف همه تسک‌ها
bot.action("clear_all_confirm", async (ctx) => {
  await ctx.editMessageText(
    "⚠️ **هشدار!**\n\nآیا مطمئن هستید که می‌خواهید **همه** تسک‌های خود را حذف کنید؟\n\n🚨 این عمل غیرقابل بازگشت است!",
    Markup.inlineKeyboard([
      [Markup.button.callback("✅ بله، همه را حذف کن", "clear_all")],
      [Markup.button.callback("❌ خیر، انصراف", "clear_menu")],
    ])
  );
});

// حذف همه تسک‌ها
bot.action("clear_all", async (ctx) => {
  await ctx.answerCbQuery("🗑 همه تسک‌ها حذف شد!");
  const userId = ctx.from.id;

  const count = todos[userId] ? todos[userId].length : 0;
  todos[userId] = [];

  await ctx.editMessageText(
    `🗑 ${count} تسک حذف شد!\n\n✨ حالا می‌توانید از نو شروع کنید!\n\n🎯 آماده برای تسک‌های جدید؟`,
    getMainMenu()
  );
});

// دکمه تنظیمات
bot.action("settings", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText(
    "⚙️ **تنظیمات**\n\nقابلیت‌های فعلی:\n✅ مدیریت تسک‌ها\n✅ دسته‌بندی\n✅ آمار و گزارش‌گیری\n✅ نمایش پیشرفت\n\nقابلیت‌های آینده:\n• 🔔 یادآوری‌ها\n• ⭐ اولویت‌بندی\n• 📅 تاریخ سررسید\n• 📈 گزارش‌های تفصیلی\n• 🎯 اهداف و milestone ها",
    Markup.inlineKeyboard([
      [Markup.button.callback("🏠 بازگشت به منوی اصلی", "main_menu")],
    ])
  );
});

// مدیریت خطاها
bot.catch((err, ctx) => {
  console.error("خطا در ربات:", err);
  ctx.reply("❌ خطایی رخ داد! لطفاً دوباره تلاش کنید.");
});

// اجرای ربات
bot
  .launch()
  .then(() => console.log("🤖 ربات TODO Pro شروع به کار کرد..."))
  .catch((err) => console.error("خطا در راه‌اندازی ربات:", err));

// مدیریت پایان فرآیند
process.once("SIGINT", () => {
  console.log("🛑 ربات در حال خاموش شدن...");
  bot.stop("SIGINT");
});
process.once("SIGTERM", () => {
  console.log("🛑 ربات در حال خاموش شدن...");
  bot.stop("SIGTERM");
});
