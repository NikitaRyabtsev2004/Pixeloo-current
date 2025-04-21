export const API_URL = `${process.env.REACT_APP_SERVER}`;

export const AUTH_MESSAGES = {
  registrationSuccess:
    'Регистрация прошла успешно. Проверьте ваш email для подтверждения.',
  loginSuccess: 'Вы успешно вошли в систему.',
  passwordResetSuccess: 'Пароль успешно изменён.',
  errorGeneric: 'Что-то пошло не так. Попробуйте ещё раз.',
  passwordsDoNotMatch: 'Пароли не совпадают.',
  tooManyRequests: 'Слишком много запросов. Пожалуйста, подождите.',
};

export const RULES_TEXT = [
  'После регистрации или входа вы можете начать играть.',
  'Регистрация нужна для безопасной а также честной игры.',
  'Прошу ознакомиться с правилами и рекомендациями для игры:',
  'Удерживание (ПКМ, ЛКМ, СКМ) - перемещение по полю, + и - для масштаба.',
  'ЛКМ - оставить пиксель, ПКМ - копировать цвет.',
  'Запрещено: рисовать непристойные надписи и выражения (блокировка), читерство (блокировка).',
  'На данный момент обновление счётчика в реальном времени не работает. После размещения пикселя вы увидите актуальное количество.',
  'Во время бета-тестирования КД пикселей составляет 5 секунд вместо 20.',
];

export const colors = [
  '#000000',
  '#FFFFFF',
  '#808080',
  '#FF0000',
  '#00FF00',
  '#0000FF',
  '#FFFF00',
  '#00ccff',
  '#800080',
  '#ff8800',
];

export const achievementFields = [
  'firstAchive',
  'secondAchive',
  'thirdAchive',
  'fourthAchive',
  'fifthAchive',
];

export const achievementDataConfig = (achievements) => [
  {
    id: 1,
    image: '/achievements/1gif.gif',
    text: '1st Pixel',
    value: achievements?.firstAchive,
    background: '#bb9c74',
  },
  {
    id: 2,
    image: '/achievements/101gif.gif',
    text: '101 Pixels',
    value: achievements?.secondAchive,
    background: '#74bb7a',
  },
  {
    id: 3,
    image: '/achievements/1kgif.gif',
    text: '1k',
    value: achievements?.thirdAchive,
    background: '#8a60a7',
  },
  {
    id: 4,
    image: '/achievements/10kgif.gif',
    text: '10k',
    value: achievements?.fourthAchive,
    background: '#77a9c0',
  },
  {
    id: 5,
    image: '/achievements/coloristgif.gif',
    text: 'Colorist',
    value: achievements?.fifthAchive,
    background:
      'linear-gradient(to right, #ff4646 30%, #ffc354, #ffff6a, #53ff53, #5f5fff, #ff72ff)',
  },
];
