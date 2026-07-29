const { Scenes } = require('telegraf');
const prisma = require('../db');
const { t } = require('../i18n');
const { yesNoKeyboard } = require('../keyboards');

const SCENE_ID = 'ADMIN_BROADCAST_SCENE';

const scene = new Scenes.BaseScene(SCENE_ID);

scene.enter(async (ctx) => {
  const lang = ctx.state.lang || 'en';
  ctx.scene.state.stage = 'message';
  await ctx.reply(t(lang, 'admin_broadcast_ask_message'));
});

scene.on('text', async (ctx, next) => {
  if (ctx.message.text.startsWith('/')) {
    await ctx.scene.leave();
    return next();
  }
  const lang = ctx.state.lang || 'en';
  if (ctx.scene.state.stage !== 'message') return;
  ctx.scene.state.message = ctx.message.text;
  ctx.scene.state.stage = 'confirm';
  await ctx.reply(
    t(lang, 'admin_broadcast_confirm', { message: ctx.scene.state.message }),
    yesNoKeyboard(lang, 'BROADCAST_CONFIRM_YES', 'BROADCAST_CONFIRM_NO')
  );
});

scene.action('BROADCAST_CONFIRM_YES', async (ctx) => {
  await ctx.answerCbQuery();
  const lang = ctx.state.lang || 'en';
  const message = ctx.scene.state.message;

  const users = await prisma.user.findMany({ where: { isBlocked: false } });
  let sent = 0;
  for (const user of users) {
    try {
      await ctx.telegram.sendMessage(user.telegramId.toString(), message);
      sent += 1;
    } catch (err) {
      // user may have blocked the bot - skip silently
    }
  }

  await prisma.broadcast.create({
    data: { message, sentBy: BigInt(ctx.from.id), recipientCount: sent },
  });

  await ctx.reply(t(lang, 'admin_broadcast_sent', { count: sent }));
  return ctx.scene.leave();
});

scene.action('BROADCAST_CONFIRM_NO', async (ctx) => {
  await ctx.answerCbQuery();
  const lang = ctx.state.lang || 'en';
  await ctx.reply(t(lang, 'cancelled'));
  return ctx.scene.leave();
});

module.exports = { scene, SCENE_ID };
