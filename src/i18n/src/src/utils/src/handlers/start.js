const prisma = require('../db');
const { t } = require('../i18n');
const { startKeyboard, languageKeyboard } = require('../keyboards');
const { showProjects } = require('./projects');

async function sendWelcome(ctx) {
  const lang = ctx.state.lang || 'en';
  const text = `${t(lang, 'welcome_title')}\n\n${t(lang, 'welcome_body')}`;
  await ctx.reply(text, startKeyboard(lang));
}

async function handleStartButton(ctx) {
  await ctx.answerCbQuery();
  const lang = ctx.state.lang || 'en';
  await ctx.reply(t(lang, 'choose_language'), languageKeyboard());
}

async function handleLanguageCommand(ctx) {
  const lang = ctx.state.lang || 'en';
  await ctx.reply(t(lang, 'choose_language'), languageKeyboard());
}

async function handleLanguageSelect(ctx) {
  await ctx.answerCbQuery();
  const code = ctx.match[1];
  await prisma.user.update({
    where: { telegramId: BigInt(ctx.from.id) },
    data: { languageCode: code },
  });
  ctx.state.lang = code;
  await ctx.reply(t(code, 'language_saved'));
  await showProjects(ctx);
}

module.exports = { sendWelcome, handleStartButton, handleLanguageCommand, handleLanguageSelect };
