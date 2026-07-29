const { Markup } = require('telegraf');
const { t } = require('../i18n');

function doneCancelSimpleKeyboard(lang) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(t(lang, 'done_button'), 'ADMIN_DONE_QUESTIONS')],
    [Markup.button.callback(t(lang, 'cancel_button'), 'ADMIN_CANCEL')],
  ]);
}

function skipKeyboard(lang) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(t(lang, 'skip_button'), 'ADMIN_SKIP_DESCRIPTION')],
    [Markup.button.callback(t(lang, 'cancel_button'), 'ADMIN_CANCEL')],
  ]);
}

function questionTypeKeyboard(lang) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(t(lang, 'question_type_text'), 'QTYPE_TEXT')],
    [Markup.button.callback(t(lang, 'question_type_choice'), 'QTYPE_CHOICE')],
    [Markup.button.callback(t(lang, 'cancel_button'), 'ADMIN_CANCEL')],
  ]);
}

module.exports = { doneCancelSimpleKeyboard, skipKeyboard, questionTypeKeyboard };
