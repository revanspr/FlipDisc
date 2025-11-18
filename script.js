// Flip Disc Display Simulator
class FlipDiscDisplay {
    constructor(cols = 28, rows = 13) {
        this.cols = cols;
        this.rows = rows;
        this.discs = [];
        this.animationSpeed = 200;
        this.soundEnabled = true;
        this.audioContext = null;
        this.scrollInterval = null;
        this.init();
    }

    init() {
        const display = document.getElementById('flipDiscDisplay');
        display.style.gridTemplateColumns = `repeat(${this.cols}, 1fr)`;
        display.innerHTML = '';
        this.discs = [];

        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const disc = this.createDisc(row, col);
                display.appendChild(disc);
                this.discs.push({
                    element: disc,
                    row: row,
                    col: col,
                    state: false // false = black, true = yellow
                });
            }
        }

        // Initialize Web Audio API for sound
        if (this.soundEnabled && !this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    createDisc(row, col) {
        const disc = document.createElement('div');
        disc.className = 'disc';
        disc.innerHTML = `
            <div class="disc-face disc-front"></div>
            <div class="disc-face disc-back"></div>
        `;

        // Click to toggle individual disc
        disc.addEventListener('click', () => {
            this.toggleDisc(row * this.cols + col);
        });

        return disc;
    }

    playFlipSound() {
        if (!this.soundEnabled || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.frequency.value = 100 + Math.random() * 50;
        oscillator.type = 'square';

        gainNode.gain.setValueAtTime(0.05, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.05);
    }

    toggleDisc(index, animate = true) {
        const disc = this.discs[index];
        disc.state = !disc.state;

        if (animate) {
            disc.element.classList.add('flipping');
            setTimeout(() => {
                disc.element.classList.remove('flipping');
            }, 300);
        }

        if (disc.state) {
            disc.element.classList.remove('flipped');
        } else {
            disc.element.classList.add('flipped');
        }

        if (animate) {
            this.playFlipSound();
        }
    }

    setDisc(index, state, animate = true) {
        const disc = this.discs[index];
        if (disc.state !== state) {
            this.toggleDisc(index, animate);
        }
    }

    clear(animate = true) {
        this.discs.forEach((disc, index) => {
            if (animate) {
                setTimeout(() => {
                    this.setDisc(index, false, true);
                }, Math.random() * this.animationSpeed);
            } else {
                this.setDisc(index, false, false);
            }
        });
    }

    fill(animate = true) {
        this.discs.forEach((disc, index) => {
            if (animate) {
                setTimeout(() => {
                    this.setDisc(index, true, true);
                }, Math.random() * this.animationSpeed);
            } else {
                this.setDisc(index, true, false);
            }
        });
    }

    random() {
        this.discs.forEach((disc, index) => {
            setTimeout(() => {
                this.setDisc(index, Math.random() > 0.5, true);
            }, Math.random() * this.animationSpeed * 2);
        });
    }

    checkerboard() {
        this.discs.forEach((disc, index) => {
            const state = (disc.row + disc.col) % 2 === 0;
            setTimeout(() => {
                this.setDisc(index, state, true);
            }, (disc.row * this.cols + disc.col) * 10);
        });
    }

    wave() {
        let delay = 0;
        for (let col = 0; col < this.cols; col++) {
            for (let row = 0; row < this.rows; row++) {
                const index = row * this.cols + col;
                setTimeout(() => {
                    this.setDisc(index, true, true);
                    setTimeout(() => {
                        this.setDisc(index, false, true);
                    }, 300);
                }, delay);
            }
            delay += 50;
        }
    }

    displayText(text) {
        if (this.scrollInterval) {
            clearInterval(this.scrollInterval);
            this.scrollInterval = null;
        }

        this.clear(false);
        const bitmap = this.textToBitmap(text);

        bitmap.forEach((row, rowIndex) => {
            row.forEach((pixel, colIndex) => {
                if (rowIndex < this.rows && colIndex < this.cols) {
                    const index = rowIndex * this.cols + colIndex;
                    setTimeout(() => {
                        this.setDisc(index, pixel, true);
                    }, (rowIndex * this.cols + colIndex) * 5);
                }
            });
        });
    }

    scrollTextContinuous(text) {
        if (this.scrollInterval) {
            clearInterval(this.scrollInterval);
        }

        const bitmap = this.textToBitmap(text + '   '); // Add spacing
        let offset = 0;

        this.scrollInterval = setInterval(() => {
            for (let row = 0; row < this.rows; row++) {
                for (let col = 0; col < this.cols; col++) {
                    const bitmapCol = (col + offset) % bitmap[0].length;
                    const index = row * this.cols + col;
                    const state = bitmap[row] && bitmap[row][bitmapCol] ? true : false;
                    this.setDisc(index, state, false);
                }
            }
            offset = (offset + 1) % bitmap[0].length;
        }, 150);
    }

    textToBitmap(text) {
        // Simple 5x7 bitmap font
        const font = {
            'A': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
            'B': [[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0]],
            'C': [[0,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[0,1,1,1,1]],
            'D': [[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0]],
            'E': [[1,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
            'F': [[1,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0]],
            'G': [[0,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[1,0,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
            'H': [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
            'I': [[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[1,1,1,1,1]],
            'J': [[0,0,0,0,1],[0,0,0,0,1],[0,0,0,0,1],[0,0,0,0,1],[0,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
            'K': [[1,0,0,0,1],[1,0,0,1,0],[1,0,1,0,0],[1,1,0,0,0],[1,0,1,0,0],[1,0,0,1,0],[1,0,0,0,1]],
            'L': [[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
            'M': [[1,0,0,0,1],[1,1,0,1,1],[1,0,1,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
            'N': [[1,0,0,0,1],[1,1,0,0,1],[1,0,1,0,1],[1,0,0,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1]],
            'O': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
            'P': [[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,0,0,0,0]],
            'Q': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,1,0,1],[1,0,0,1,0],[0,1,1,0,1]],
            'R': [[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,0],[1,0,1,0,0],[1,0,0,1,0],[1,0,0,0,1]],
            'S': [[0,1,1,1,1],[1,0,0,0,0],[1,0,0,0,0],[0,1,1,1,0],[0,0,0,0,1],[0,0,0,0,1],[1,1,1,1,0]],
            'T': [[1,1,1,1,1],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
            'U': [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
            'V': [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0]],
            'W': [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,1,0,1],[1,1,0,1,1],[1,0,0,0,1]],
            'X': [[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,1,0,1,0],[1,0,0,0,1],[1,0,0,0,1]],
            'Y': [[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0]],
            'Z': [[1,1,1,1,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[1,0,0,0,0],[1,1,1,1,1]],
            '0': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,1,1],[1,0,1,0,1],[1,1,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
            '1': [[0,0,1,0,0],[0,1,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,1,1,1,0]],
            '2': [[0,1,1,1,0],[1,0,0,0,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[1,1,1,1,1]],
            '3': [[1,1,1,1,0],[0,0,0,0,1],[0,0,0,0,1],[0,1,1,1,0],[0,0,0,0,1],[0,0,0,0,1],[1,1,1,1,0]],
            '4': [[0,0,0,1,0],[0,0,1,1,0],[0,1,0,1,0],[1,0,0,1,0],[1,1,1,1,1],[0,0,0,1,0],[0,0,0,1,0]],
            '5': [[1,1,1,1,1],[1,0,0,0,0],[1,1,1,1,0],[0,0,0,0,1],[0,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
            '6': [[0,1,1,1,0],[1,0,0,0,0],[1,0,0,0,0],[1,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
            '7': [[1,1,1,1,1],[0,0,0,0,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[0,1,0,0,0],[0,1,0,0,0]],
            '8': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
            '9': [[0,1,1,1,0],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,1],[0,0,0,0,1],[0,0,0,0,1],[0,1,1,1,0]],
            ' ': [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]],
            '!': [[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,1,0,0],[0,0,0,0,0],[0,0,1,0,0]],
            '.': [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,1,0,0]],
        };

        const upperText = text.toUpperCase();
        const bitmap = Array(7).fill(null).map(() => []);

        for (let char of upperText) {
            const charBitmap = font[char] || font[' '];
            for (let row = 0; row < 7; row++) {
                bitmap[row] = bitmap[row].concat(charBitmap[row], [0]); // Add spacing between chars
            }
        }

        // Pad to fill display height
        while (bitmap.length < this.rows) {
            bitmap.push(Array(bitmap[0].length).fill(0));
        }

        return bitmap;
    }

    setAnimationSpeed(speed) {
        this.animationSpeed = speed;
    }

    setSoundEnabled(enabled) {
        this.soundEnabled = enabled;
        if (enabled && !this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }
}

// Global instance
let display = new FlipDiscDisplay();

// Control functions
function setGridSize(cols, rows) {
    display = new FlipDiscDisplay(cols, rows);
}

function showPattern(pattern) {
    switch(pattern) {
        case 'wave':
            display.wave();
            break;
        case 'random':
            display.random();
            break;
        case 'checkerboard':
            display.checkerboard();
            break;
        case 'clear':
            display.clear(true);
            break;
        case 'fill':
            display.fill(true);
            break;
    }
}

function displayText() {
    const text = document.getElementById('textInput').value || 'HELLO';
    display.displayText(text);
}

function scrollText() {
    const text = document.getElementById('textInput').value || 'FLIP DISC DISPLAY';
    display.scrollTextContinuous(text);
}

function updateSpeed(value) {
    display.setAnimationSpeed(value);
    document.getElementById('speedValue').textContent = value + 'ms';
}

function toggleSound(enabled) {
    display.setSoundEnabled(enabled);
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.body.requestFullscreen().catch(err => {
            console.log('Fullscreen failed:', err);
        });
        document.body.classList.add('fullscreen');
    } else {
        document.exitFullscreen();
        document.body.classList.remove('fullscreen');
    }
}

// Exit fullscreen mode
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
        document.body.classList.remove('fullscreen');
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
    } else if (e.key === 'c' || e.key === 'C') {
        display.clear(true);
    } else if (e.key === 'r' || e.key === 'R') {
        display.random();
    }
});

// Initialize with a welcome animation
window.addEventListener('load', () => {
    setTimeout(() => {
        display.displayText('FLIP DISC');
    }, 500);
});
