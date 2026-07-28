const getDepositInstructions = (quoteId, amount) => {
  const configured = Boolean(
    process.env.DEPOSIT_RECIPIENT
    && process.env.DEPOSIT_EMAIL
  );

  return {
    method: process.env.DEPOSIT_METHOD || 'Virement Interac',
    recipient: process.env.DEPOSIT_RECIPIENT || 'Groupe Double Z - EXEMPLE',
    email: process.env.DEPOSIT_EMAIL || 'depot-doublez@example.com',
    phone: process.env.DEPOSIT_PHONE || '514-555-0199',
    amount: Number(amount || 150),
    currency: 'CAD',
    deadlineHours: Number(process.env.DEPOSIT_DEADLINE_HOURS || 24),
    reference: quoteId,
    note: process.env.DEPOSIT_NOTE || 'Inscrivez le numéro de demande dans le message du virement.',
    isExample: process.env.DEPOSIT_DATA_IS_EXAMPLE === 'true' || !configured
  };
};

module.exports = {
  getDepositInstructions
};
