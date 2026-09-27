for (const key of ['DEEPSEEK_API_KEY', 'YANDEX_WEBMASTER_TOKEN', 'YANDEX_WEBMASTER_USER_ID', 'YANDEX_WEBMASTER_HOST_ID', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']) {
  console.log(`${key}: ${process.env[key] ? 'configured' : 'missing'}`);
}
