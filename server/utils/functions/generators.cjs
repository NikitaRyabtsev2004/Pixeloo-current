const generateRandomCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const generateUniqueIdentifier = () => {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let identifier = '';
  for (let i = 0; i < 10; i++) {
    identifier += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return identifier;
};

module.exports = { generateRandomCode, generateUniqueIdentifier };