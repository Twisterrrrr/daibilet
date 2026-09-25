import { sendTelegramAlert } from './lib/telegram-alert.mjs';
try {
  console.log(JSON.stringify(await sendTelegramAlert('Дайбилет: тест доставки 5XX-алертов. Почасовой монитор Googlebot/YandexBot и ReferenceError подключён к этому чату.')));
} catch (error) { console.error(error.message); process.exitCode = 1; }
