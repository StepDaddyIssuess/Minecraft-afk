module.exports = bot => {
    bot.on('resourcePack', url => {
        console.log(`[${bot.username}] Resource pack: ${url}`);
        bot.acceptResourcePack();
    });
};
