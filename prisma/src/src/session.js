const prisma = require('./db');

function getSessionKey(ctx) {
  if (ctx.from && ctx.chat) return `${ctx.from.id}:${ctx.chat.id}`;
  if (ctx.from) return `${ctx.from.id}:${ctx.from.id}`;
  return null;
}

/**
 * Telegraf-compatible session middleware backed by a Postgres table (via Prisma).
 * Works as a drop-in for Stage/Scenes since it only needs ctx.session to be a
 * plain mutable object that persists between updates for the same key.
 */
function pgSession() {
  return async (ctx, next) => {
    const key = getSessionKey(ctx);
    if (!key) {
      ctx.session = {};
      return next();
    }

    let record;
    try {
      record = await prisma.session.findUnique({ where: { key } });
    } catch (err) {
      console.error('Session read error:', err);
    }

    ctx.session = record ? record.data : {};

    await next();

    try {
      await prisma.session.upsert({
        where: { key },
        update: { data: ctx.session || {} },
        create: { key, data: ctx.session || {} },
      });
    } catch (err) {
      console.error('Session write error:', err);
    }
  };
}

module.exports = { pgSession };
