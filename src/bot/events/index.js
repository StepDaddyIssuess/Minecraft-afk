const fs = require('fs');
const path = require('path');

module.exports = (bot, io, ctx) => {
    const files = fs.readdirSync(__dirname).filter(f => f !== 'index.js');

    for (const file of files) {
        const eventPath = path.join(__dirname, file);
        const eventModule = require(eventPath);

        // Check if the module exports a function
        if (typeof eventModule === 'function') {
            try {
                eventModule(bot, io, ctx);
            } catch (err) {
                console.error(`Error loading event file ${file}:`, err);
            }
        } else {
            console.warn(`Skipped ${file}: module does not export a function`);
        }
    }
};
