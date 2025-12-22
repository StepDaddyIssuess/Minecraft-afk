// src/bot/createBot.js
const mineflayer = require('mineflayer');
const loadEvents = require('./events');

module.exports = ({ username, host, port, io }) => {
  const bot = mineflayer.createBot({
    host,
    port,
    username,
    auth: 'microsoft',
    version: '1.19'
  });

  // THIS is where .on() files attach
  loadEvents(bot, io, { username, host, port });

  return bot;
};
