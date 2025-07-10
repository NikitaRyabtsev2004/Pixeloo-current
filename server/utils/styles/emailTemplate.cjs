const generateEmailTemplate = ({ title, description, confirmationCode }) => {
  // Текстовая версия
  const text = `Pixeloo\n${title}\n\n${description}: ${confirmationCode}\n\nКод действителен 10 минут.`;

  // HTML-версия
  const html = `
    <div style="font-family: Arial, sans-serif; background-color: #f8f9fa; color: #333333; padding: 30px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px;">
      <!-- Логотип -->
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="font-size: 28px; color: #2c3e50; margin: 0; font-weight: bold; display: flex; justify-content: center;">
          <span style="color: #34db69;">Pi</span>
          <span style="color: #d834db;">xel</span>
          <span style="color: #e7d33c;">oo</span>
        </h1>
        <div style="height: 2px; width: 80px; background: linear-gradient(to right, #34db69, #d834db, #e7d33c); margin: 10px auto;"></div>
      </div>
      
      <!-- Заголовок -->
      <h2 style="font-size: 20px; color: #2c3e50; text-align: center; margin: 0 0 20px 0; font-weight: bold;">
        ${title}
      </h2>
      
      <!-- Описание -->
      <p style="font-size: 16px; color: #555555; text-align: center; line-height: 1.5; margin: 0 0 25px 0;">
        ${description}
      </p>
      
      <!-- Код подтверждения -->
      <div style="background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 6px; padding: 15px; text-align: center; font-size: 24px; color: #2c3e50; margin: 0 auto 25px auto; width: 80%; font-weight: bold; letter-spacing: 2px;">
        ${confirmationCode}
      </div>
      
      <!-- Инструкция -->
      <div style="background-color: #f1f5f9; border-radius: 6px; padding: 15px; text-align: center; margin-bottom: 25px;">
        <p style="font-size: 14px; color: #555555; margin: 0; line-height: 1.5;">
          Введите этот код в приложении, чтобы продолжить.<br>
          <strong style="color: #e74c3c;">Код действителен в течение 10 минут.</strong>
        </p>
      </div>
      
      <!-- Футер -->
      <div style="border-top: 1px solid #e0e0e0; padding-top: 15px;">
        <p style="font-size: 12px; color: #777777; text-align: center; margin: 0 0 5px 0; line-height: 1.4;">
          Если вы не запрашивали это действие, проигнорируйте это письмо.
        </p>
        <p style="font-size: 12px; color: #999999; text-align: center; margin: 0;">
          &copy; 2025 Pixeloo. Все права защищены.
        </p>
      </div>
    </div>
  `;

  return { text, html };
};

module.exports = { generateEmailTemplate };
