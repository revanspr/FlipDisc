// Camera Flip-Dot Display with Drone Synthesizer
class CameraFlipDotDisplay {
    constructor() {
        this.cols = 120;
        this.rows = 120;
        this.dots = [];
        this.previousState = [];

        // Camera settings
        this.video = document.getElementById('webcam');
        this.canvas = document.getElementById('processingCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = this.cols;
        this.canvas.height = this.rows;
        this.stream = null;
        this.cameraActive = false;
        this.mirrorCamera = true;

        // Image processing settings
        this.threshold = 128;
        this.brightness = 0;
        this.contrast = 100;
        this.updateSpeed = 100;
        this.updateInterval = null;

        // Synthesizer settings
        this.audioContext = null;
        this.soundEnabled = true;
        this.masterGain = null;
        this.volume = 0.3;
        this.activeOscillators = new Map();

        this.init();
    }

    init() {
        const display = document.getElementById('flipDotDisplay');
        display.innerHTML = '';
        this.dots = [];
        this.previousState = [];

        // Create 120x120 grid
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const dot = this.createDot(row, col);
                display.appendChild(dot);
                this.dots.push({
                    element: dot,
                    row: row,
                    col: col,
                    state: false
                });
                this.previousState.push(false);
            }
        }

        // Initialize audio
        this.initAudio();
    }

    createDot(row, col) {
        const dot = document.createElement('div');
        dot.className = 'dot flipped'; // Start with black
        dot.innerHTML = `
            <div class="dot-face dot-front"></div>
            <div class="dot-face dot-back"></div>
        `;
        return dot;
    }

    initAudio() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.volume;
            this.masterGain.connect(this.audioContext.destination);
        }
    }

    // Drone synthesizer - vertical position maps to pitch
    playDroneSound(row, col, duration = 0.3) {
        if (!this.soundEnabled || !this.audioContext) return;

        const key = `${row}-${col}`;

        // If already playing, don't retrigger
        if (this.activeOscillators.has(key)) return;

        // Map row to frequency (inverted: row 0 = high pitch, row 119 = low pitch)
        const minFreq = 60;   // Low C (around C2)
        const maxFreq = 800;  // Higher pitch
        const normalizedRow = 1 - (row / this.rows); // Invert so top = high
        const frequency = minFreq + (maxFreq - minFreq) * normalizedRow;

        // Create oscillator with subtle detuning
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        const filterNode = this.audioContext.createBiquadFilter();

        // Oscillator settings - sine wave for smooth drone
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;

        // Subtle frequency modulation for organic feel
        const detune = (Math.random() - 0.5) * 10;
        oscillator.detune.value = detune;

        // Low-pass filter for warmth
        filterNode.type = 'lowpass';
        filterNode.frequency.value = frequency * 2;
        filterNode.Q.value = 1;

        // Gain envelope - slow attack and release for drone effect
        const now = this.audioContext.currentTime;
        const attackTime = 0.05;
        const releaseTime = 0.2;
        const peakGain = 0.015; // Quiet individual dots

        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(peakGain, now + attackTime);
        gainNode.gain.setValueAtTime(peakGain, now + duration - releaseTime);
        gainNode.gain.linearRampToValueAtTime(0, now + duration);

        // Connect nodes
        oscillator.connect(filterNode);
        filterNode.connect(gainNode);
        gainNode.connect(this.masterGain);

        // Start and stop
        oscillator.start(now);
        oscillator.stop(now + duration);

        // Track active oscillator
        this.activeOscillators.set(key, { oscillator, gainNode });

        // Clean up after it stops
        oscillator.onended = () => {
            this.activeOscillators.delete(key);
        };
    }

    // Update a single dot
    setDot(index, state, animate = true) {
        const dot = this.dots[index];

        // Only update if state changed
        if (this.previousState[index] === state) return;

        this.previousState[index] = state;
        dot.state = state;

        if (animate) {
            dot.element.classList.add('flipping');
            setTimeout(() => {
                dot.element.classList.remove('flipping');
            }, 200);

            // Play sound when flipping to yellow (person detected)
            if (state) {
                this.playDroneSound(dot.row, dot.col);
            }
        }

        if (state) {
            dot.element.classList.remove('flipped'); // Show yellow
        } else {
            dot.element.classList.add('flipped'); // Show black
        }
    }

    // Start camera capture
    async startCamera() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 1280 },
                    facingMode: 'user'
                }
            });

            this.video.srcObject = this.stream;
            this.cameraActive = true;

            document.getElementById('startCamera').disabled = true;

            // Wait for video to be ready
            this.video.onloadedmetadata = () => {
                this.startProcessing();
            };

        } catch (error) {
            console.error('Camera error:', error);
            alert('Could not access camera. Please check permissions.');
        }
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.cameraActive = false;
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        document.getElementById('startCamera').disabled = false;
    }

    startProcessing() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        this.updateInterval = setInterval(() => {
            this.processFrame();
        }, this.updateSpeed);
    }

    processFrame() {
        if (!this.cameraActive || this.video.readyState < 2) {
            return;
        }

        // Draw video frame to canvas
        this.ctx.save();

        // Mirror if enabled
        if (this.mirrorCamera) {
            this.ctx.scale(-1, 1);
            this.ctx.drawImage(this.video, -this.canvas.width, 0, this.canvas.width, this.canvas.height);
        } else {
            this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        }

        this.ctx.restore();

        // Get image data
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;

        // Process each pixel
        for (let i = 0; i < this.dots.length; i++) {
            const pixelIndex = i * 4;

            // Convert to grayscale
            let gray = (data[pixelIndex] + data[pixelIndex + 1] + data[pixelIndex + 2]) / 3;

            // Apply brightness
            gray += this.brightness;

            // Apply contrast
            gray = ((gray - 128) * (this.contrast / 100)) + 128;

            // Clamp
            gray = Math.max(0, Math.min(255, gray));

            // Threshold to binary
            const state = gray > this.threshold;

            this.setDot(i, state, true);
        }
    }

    setThreshold(value) {
        this.threshold = parseInt(value);
    }

    setBrightness(value) {
        this.brightness = parseInt(value);
    }

    setContrast(value) {
        this.contrast = parseInt(value);
    }

    setUpdateSpeed(value) {
        this.updateSpeed = parseInt(value);
        if (this.cameraActive) {
            this.startProcessing();
        }
    }

    setSoundEnabled(enabled) {
        this.soundEnabled = enabled;
        if (enabled) {
            this.initAudio();
        }
    }

    setVolume(value) {
        this.volume = value / 100;
        if (this.masterGain) {
            this.masterGain.gain.value = this.volume;
        }
    }

    setMirror(enabled) {
        this.mirrorCamera = enabled;
        if (enabled) {
            this.video.classList.remove('no-mirror');
        } else {
            this.video.classList.add('no-mirror');
        }
    }
}

// Global instance
let display = new CameraFlipDotDisplay();

// Control functions
async function startCamera() {
    await display.startCamera();
}

function stopCamera() {
    display.stopCamera();
}

function updateThreshold(value) {
    display.setThreshold(value);
    document.getElementById('thresholdValue').textContent = value;
}

function updateBrightness(value) {
    display.setBrightness(value);
    document.getElementById('brightnessValue').textContent = value;
}

function updateContrast(value) {
    display.setContrast(value);
    document.getElementById('contrastValue').textContent = value;
}

function updateSpeed(value) {
    display.setUpdateSpeed(value);
    document.getElementById('updateSpeedValue').textContent = value + 'ms';
}

function toggleSound(enabled) {
    display.setSoundEnabled(enabled);
}

function updateVolume(value) {
    display.setVolume(value);
    document.getElementById('volumeValue').textContent = value + '%';
}

function toggleMirror(enabled) {
    display.setMirror(enabled);
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

// Exit fullscreen
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) {
        document.body.classList.remove('fullscreen');
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
    }
});

// Auto-start camera on load
window.addEventListener('load', () => {
    console.log('Camera Flip-Dot Display Ready');
    console.log('Click "Start Camera" to begin');
});
