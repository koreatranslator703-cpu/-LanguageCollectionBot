const prisma = require('../../db');
const { t } = require('../../i18n');
const { backToAdminKeyboard } = require('../../keyboards');
const { requireAdmin } = require('./dashboard');

async function showStats(ctx) {
  await ctx.answerCbQuery();
  if (!(await requireAdmin(ctx))) return;
  const lang = ctx.state.lang || 'en';

  const [users, projects, applications, pending, underReview, approved, rejected, needMoreInfo] = await Promise.all([
    prisma.user.count(),
    prisma.project.count(),
    prisma.application.count(),
    prisma.application.count({ where: { status: 'PENDING' } }),
    prisma.application.count({ where: { status: 'UNDER_REVIEW' } }),
    prisma.application.count({ where: { status: 'APPROVED' } }),
    prisma.application.count({ where: { status: 'REJECTED' } }),
    prisma.application.count({ where: { status: 'NEED_MORE_INFO' } }),
  ]);

  await ctx.reply(
    t(lang, 'admin_stats_summary', {
      users,
      projects,
      applications,
      pending,
      underReview,
      approved,
      rejected,
      needMoreInfo,
    }),
    backToAdminKeyboard(lang)
  );
}

module.exports = { showStats };
