module.exports = bot => {
    bot.on('scoreboardTitle', title =>
        console.log('Scoreboard:', title)
    );
};
