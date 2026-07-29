const { Scenes } = require('telegraf');
const prisma = require('../db');
const { t } = require('../i18n');

const SCENE_ID = 'ADMIN_MESSAGE_APPLICANT_SCENE';

const scene = new Scenes.BaseScene(SCENE_ID);

scene.enter(async (ctx) => {
  const lang = ctx.state.lang || 'en';
  const { applicantName } = ctx.scene.state;
  await ctx.reply(t(lang, 'admin_message_applicant_prompt', { name: applicantName }));
});

scene.on('text', async (ctx, next) => {
  if (ctx.message.text.startsWith('/')) {
    await ctx.scene.leave();
    return next();
  }
  const lang = ctx.state.lang || 'en';
  const { userId, applicantName } = ctx.scene.state;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user) {
    try {
      await ctx.telegram.sendMessage(user.telegramId.toString(), ctx.message.text);
    } catch (err) {
      // applicant may have blocked the bot
    }
  }

  await ctx.reply(t(lang, 'admin_message_sent', { name: applicantName }));
  return ctx.scene.leave();
});

module.exports = { scene, SCENE_ID };
