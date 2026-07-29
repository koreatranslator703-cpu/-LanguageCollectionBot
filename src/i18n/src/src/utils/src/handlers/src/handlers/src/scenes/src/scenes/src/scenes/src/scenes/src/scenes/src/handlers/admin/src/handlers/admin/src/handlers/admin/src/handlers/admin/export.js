const ExcelJS = require('exceljs');
const { Parser } = require('json2csv');
const prisma = require('../../db');
const { t } = require('../../i18n');
const { backToAdminKeyboard } = require('../../keyboards');
const { requireAdmin } = require('./dashboard');

async function buildRows() {
  const applications = await prisma.application.findMany({
    include: { user: true, project: true, answers: true, files: true },
    orderBy: { createdAt: 'desc' },
  });

  const rows = applications.map((app) => {
    const row = {
      applicationId: app.id,
      project: app.project.title,
      status: app.status,
      telegramId: app.user.telegramId.toString(),
      username: app.user.username || '',
      submittedAt: app.createdAt.toISOString(),
      files: app.files.map((f) => `${f.fileType}:${f.telegramFileId}`).join(' | '),
    };
    for (const answer of app.answers) {
      row[answer.fieldName] = answer.value;
    }
    return row;
  });

  // union of all keys so every row has every column in CSV/Excel
  const allKeys = new Set();
  rows.forEach((r) => Object.keys(r).forEach((k) => allKeys.add(k)));
  const fields = Array.from(allKeys);

  return { rows, fields };
}

async function exportCsv(ctx) {
  await ctx.answerCbQuery();
  if (!(await requireAdmin(ctx))) return;
  const lang = ctx.state.lang || 'en';
  const { rows, fields } = await buildRows();
  if (rows.length === 0) return ctx.reply(t(lang, 'export_no_data'), backToAdminKeyboard(lang));

  const parser = new Parser({ fields });
  const csv = parser.parse(rows);
  await ctx.replyWithDocument({ source: Buffer.from(csv, 'utf8'), filename: `applications_${Date.now()}.csv` });
}

async function exportExcel(ctx) {
  await ctx.answerCbQuery();
  if (!(await requireAdmin(ctx))) return;
  const lang = ctx.state.lang || 'en';
  const { rows, fields } = await buildRows();
  if (rows.length === 0) return ctx.reply(t(lang, 'export_no_data'), backToAdminKeyboard(lang));

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Applications');
  sheet.columns = fields.map((f) => ({ header: f, key: f, width: 20 }));
  rows.forEach((r) => sheet.addRow(r));

  const buffer = await workbook.xlsx.writeBuffer();
  await ctx.replyWithDocument({ source: Buffer.from(buffer), filename: `applications_${Date.now()}.xlsx` });
}

async function exportJson(ctx) {
  await ctx.answerCbQuery();
  if (!(await requireAdmin(ctx))) return;
  const lang = ctx.state.lang || 'en';
  const { rows } = await buildRows();
  if (rows.length === 0) return ctx.reply(t(lang, 'export_no_data'), backToAdminKeyboard(lang));

  const json = JSON.stringify(rows, null, 2);
  await ctx.replyWithDocument({ source: Buffer.from(json, 'utf8'), filename: `applications_${Date.now()}.json` });
}

module.exports = { exportCsv, exportExcel, exportJson };
