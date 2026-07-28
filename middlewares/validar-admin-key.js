const crypto = require('crypto');

const safeEquals = (provided, expected) => {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length
    && crypto.timingSafeEqual(providedBuffer, expectedBuffer);
};

const validarAdminKey = (req, res, next) => {
  const expected = process.env.ADMIN_API_KEY;

  if (!expected) {
    return res.status(503).json({
      ok: false,
      message: 'El acceso administrativo no está configurado'
    });
  }

  const provided = req.header('x-admin-key') || '';
  if (!safeEquals(provided, expected)) {
    return res.status(401).json({
      ok: false,
      message: 'Credenciales administrativas inválidas'
    });
  }

  next();
};

module.exports = {
  validarAdminKey
};
