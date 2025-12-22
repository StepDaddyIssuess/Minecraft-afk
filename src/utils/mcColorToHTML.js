// src/utils/mcColorToHTML.js
module.exports = function mcColorToHTML(message) {
    const colors = {
        '0': 'black', '1': 'darkblue', '2': 'darkgreen', '3': 'darkcyan',
        '4': 'darkred', '5': 'purple', '6': 'gold', '7': 'gray',
        '8': 'darkgray', '9': 'blue', 'a': 'green', 'b': 'aqua',
        'c': 'red', 'd': 'pink', 'e': 'yellow', 'f': 'white'
    };

    let html = '';
    let color = 'white'; // default color

    for (let i = 0; i < message.length; i++) {
        if (message[i] === '§') {
            const code = message[++i];
            if (colors[code]) color = colors[code];
            continue;
        }
        // escape HTML to prevent breaking layout
        const char = message[i]
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        html += `<span style="color:${color}">${char}</span>`;
    }

    return html;
};
