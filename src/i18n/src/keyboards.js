const { Markup } = require('telegraf');
const { t } = require('./i18n');
const { SUPPORTED_LANGUAGES, STATUSES } = require('./config');

function startKeyboard(lang) {
  return Markup.inlineKeyboard([[Markup.button.callback(t(lang, 'start_button'), 'START')]]);
}

function languageKeyboard() {
  const rows = [];
  for (let i = 0; i < SUPPORTED_LANGUAGES.length; i += 2) {
    const row = SUPPORTED_LANGUAGES.slice(i, i + 2).map((l) =>
      Markup.button.callback(l.name, `LANG_${l.code}`)
    );
    rows.push(row);
  }
  return Markup.inlineKeyboard(rows);
}

function projectsKeyboard(projects) {
  const rows = projects.map((p) => [Markup.button.callback(p.title, `PROJECT_${p.id}`)]);
  return Markup.inlineKeyboard(rows);
}

function applyKeyboard(lang, projectId) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(t(lang, 'apply_button'), `APPLY_${projectId}`)],
    [Markup.button.callback(t(lang, 'back_button'), 'BACK_TO_PROJECTS')],
  ]);
}

function choiceKeyboard(options, prefix) {
  const rows = options.map((opt, idx) => [Markup.button.callback(opt, `${prefix}_${idx}`)]);
  return Markup.inlineKeyboard(rows);
}

function doneCancelKeyboard(lang) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(t(lang, 'done_button'), 'UPLOAD_DONE')],
    [Markup.button.callback(t(lang, 'cancel_button'), 'APPLY_CANCEL')],
  ]);
}

function adminMenuKeyboard(lang) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(t(lang, 'admin_create_project'), 'ADMIN_CREATE_PROJECT')],
    [Markup.button.callback(t(lang, 'admin_edit_project'), 'ADMIN_EDIT_PROJECT')],
    [Markup.button.callback(t(lang, 'admin_delete_project'), 'ADMIN_DELETE_PROJECT')],
    [Markup.button.callback(t(lang, 'admin_stats'), 'ADMIN_STATS')],
    [Markup.button.callback(t(lang, 'admin_applicants'), 'ADMIN_APPLICANTS')],
    [Markup.button.callback(t(lang, 'admin_broadcast'), 'ADMIN_BROADCAST')],
    [
      Markup.button.callback(t(lang, 'admin_export_csv'), 'ADMIN_EXPORT_CSV'),
      Markup.button.callback(t(lang, 'admin_export_excel'), 'ADMIN_EXPORT_EXCEL'),
    ],
    [Markup.button.callback(t(lang, 'admin_export_json'), 'ADMIN_EXPORT_JSON')],
  ]);
}

function statusKeyboard(lang, applicationId) {
  return Markup.inlineKeyboard(
    STATUSES.map((s) => [
      Markup.button.callback(t(lang, `status_${s}`), `SETSTATUS_${applicationId}_${s}`),
    ])
  );
}

function backToAdminKeyboard(lang) {
  return Markup.inlineKeyboard([[Markup.button.callback(t(lang, 'admin_back'), 'ADMIN_HOME')]]);
}

function yesNoKeyboard(lang, yesData, noData) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(t(lang, 'yes_button'), yesData)],
    [Markup.button.callback(t(lang, 'no_button'), noData)],
  ]);
}

module.exports = {
  startKeyboard,
  languageKeyboard,
  projectsKeyboard,
  applyKeyboard,
  choiceKeyboard,
  doneCancelKeyboard,
  adminMenuKeyboard,
  statusKeyboard,
  backToAdminKeyboard,
  yesNoKeyboard,
};
