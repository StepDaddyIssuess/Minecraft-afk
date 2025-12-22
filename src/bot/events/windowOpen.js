module.exports = bot => {
    bot.on('windowOpen', async window => {
        try {
            await bot.simpleClick?.leftMouse(12);
        } catch {}
    });
};
