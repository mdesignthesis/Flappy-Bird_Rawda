let bird;
let pipes = [];
let score = 0;
let win = false;
let gameOver = false;
let groundX = 0;
let bgX = 0; 

// Image Variables
let imgBird, imgBg, imgGrass, imgTop, imgMid, imgBot, imgLetterPressed;
let imgGameOver, imgWin; 
let imgLetters = {};
let bgScaleWidth; 

// Audio Variables
let sndBubble, sndOops, sndSuccess;
let audioStarted = false; // Mobile audio safety

// Letter Logic
const TARGET_KEY = 'b'; 
let currentDistractorKey = 'a';
let distractorPool = ['a', 'n', 'h', 'th'];

// Dynamic sizing for mobile
let W, H;
const GROUND_H_RATIO = 0.1; // 10% of screen height

function preload() {
  imgBird = loadImage('bird.png');
  imgBg = loadImage('background.png');
  imgGrass = loadImage('grass.png');
  imgTop = loadImage('top.png'); 
  imgMid = loadImage('mid.png');
  imgBot = loadImage('bot.png');
  imgLetterPressed = loadImage('letter pressed.png'); 
  
  imgGameOver = loadImage('game over.png'); 
  imgWin = loadImage('win.png');
  
  imgLetters['b'] = loadImage('b.png');
  imgLetters['a'] = loadImage('a.png');
  imgLetters['n'] = loadImage('n.png');
  imgLetters['h'] = loadImage('h.png');
  imgLetters['th'] = loadImage('th.png');

  sndBubble = loadSound('bubble!.mp3');
  sndOops = loadSound('Oops try again!.mp3');
  sndSuccess = loadSound('Good!.mp3');
}

function setup() {
  // Use window dimensions for true full-screen mobile experience
  W = windowWidth;
  H = windowHeight;
  createCanvas(W, H);
  
  bgScaleWidth = (imgBg.width / imgBg.height) * H;
  resetGame();
}

// Ensure the game resizes if the phone is rotated
function windowResized() {
  W = windowWidth;
  H = windowHeight;
  resizeCanvas(W, H);
  bgScaleWidth = (imgBg.width / imgBg.height) * H;
}

function draw() {
  drawLoopingBackground();

  if (win) {
    showWinScreen();
    return;
  }

  if (gameOver) {
    showGameOverScreen();
    return;
  }

  bird.update();
  bird.show();

  // Adjusted frequency for mobile screen widths
  if (frameCount % 120 == 0) { 
    pipes.push(new Pipe());
  }

  for (let i = pipes.length - 1; i >= 0; i--) {
    pipes[i].update();
    pipes[i].show();
    pipes[i].handleSolidCollision(bird);

    if (pipes[i].isInGapZone(bird)) {
      if (pipes[i].passedCorrectGap(bird)) {
        if (!pipes[i].scored) {
          if(audioStarted) sndSuccess.play();
          score++;
          pipes[i].scored = true; 
          if (score >= 10) win = true;
          else generateDistractor(); 
        }
      } else if (pipes[i].passedWrongGap(bird)) {
        if (!gameOver) {
          if(audioStarted) sndOops.play();
        }
        gameOver = true;
      }
    }

    if (pipes[i].offscreen()) {
      pipes.splice(i, 1);
    }
  }

  drawLoopingFloor();
}

function drawLoopingBackground() {
  imageMode(CORNER);
  bgX -= 0.8; 
  if (bgX <= -bgScaleWidth) bgX = 0;
  image(imgBg, bgX, 0, bgScaleWidth, H);
  image(imgBg, bgX + bgScaleWidth, 0, bgScaleWidth, H);
}

function drawLoopingFloor() {
  let groundH = H * GROUND_H_RATIO;
  imageMode(CORNER);
  groundX -= 2.5; 
  if (groundX <= -W) groundX = 0;
  image(imgGrass, groundX, H - groundH, W, groundH);
  image(imgGrass, groundX + W, H - groundH, W, groundH);
}

function showGameOverScreen() {
  background(0, 150); 
  imageMode(CENTER);
  let aspect = imgGameOver.width / imgGameOver.height;
  let displayW = min(W * 0.8, 320);
  image(imgGameOver, W / 2, H / 2, displayW, displayW / aspect);
}

function showWinScreen() {
  background(0, 150);
  imageMode(CENTER);
  let scaleW = W / imgWin.width;
  let scaleH = H / imgWin.height;
  let maxScale = max(scaleW, scaleH);
  image(imgWin, W / 2, H / 2, imgWin.width * maxScale, imgWin.height * maxScale);
}

// TouchStarted is better for mobile than mousePressed
function touchStarted() {
  // Resume AudioContext for mobile browsers
  if (!audioStarted) {
    userStartAudio();
    audioStarted = true;
  }

  if (win || gameOver) {
    resetGame();
  } else {
    bird.flap();
  }
  // Prevent default browser behavior (scrolling/zooming)
  return false;
}

function resetGame() {
  bird = new Bird();
  pipes = [];
  score = 0;
  win = false;
  gameOver = false;
  generateDistractor();
}

function generateDistractor() {
  currentDistractorKey = random(distractorPool);
}

class Bird {
  constructor() {
    this.y = H / 2;
    this.x = W * 0.2; // Position relative to screen width
    this.gravity = 0.4; 
    this.lift = -8;    
    this.velocity = 0;
    this.displayH = H * 0.06; // Size relative to screen height
    this.displayW = (imgBird.width / imgBird.height) * this.displayH;
  }
  show() {
    imageMode(CENTER);
    image(imgBird, this.x, this.y, this.displayW, this.displayH);
  }
  flap() { 
    this.velocity = this.lift;
    if(audioStarted) sndBubble.play();
  }
  update() {
    let groundH = H * GROUND_H_RATIO;
    this.velocity += this.gravity;
    this.y += this.velocity;
    
    if (this.y > H - groundH - (this.displayH/2)) {
      this.y = H - groundH - (this.displayH/2);
      this.velocity = 0;
    }
    this.y = constrain(this.y, this.displayH/2, H - this.displayH/2);
  }
}

class Pipe {
  constructor() {
    this.x = W;
    this.w = W * 0.2; // Responsive pipe width
    this.speed = W * 0.007; // Speed scales with screen width
    this.scored = false;
    this.gapHeight = H * 0.22; // Larger gap for mobile playability
    this.pipeThickness = H * 0.12; 
    let groundH = H * GROUND_H_RATIO;
    let playableHeight = H - groundH;
    
    this.midPipeY = (playableHeight / 2) - (this.pipeThickness / 2);
    this.gap1Y = this.midPipeY - this.gapHeight;
    this.gap2Y = this.midPipeY + this.pipeThickness;
    this.topPipeHeight = this.gap1Y;
    this.bottomPipeY = this.gap2Y + this.gapHeight;
    this.bottomPipeHeight = playableHeight - this.bottomPipeY;

    this.targetInTopGap = random() > 0.5;
    this.distKey = currentDistractorKey;
  }

  show() {
    imageMode(CORNER);
    image(imgTop, this.x, 0, this.w, this.topPipeHeight);
    image(imgMid, this.x, this.midPipeY, this.w, this.pipeThickness);
    image(imgBot, this.x, this.bottomPipeY, this.w, this.bottomPipeHeight);
    
    imageMode(CENTER);
    let letterSize = this.w * 0.8;
    let correctImg = this.scored ? imgLetterPressed : imgLetters[TARGET_KEY];
    let topImg = this.targetInTopGap ? correctImg : imgLetters[this.distKey];
    let botImg = this.targetInTopGap ? imgLetters[this.distKey] : correctImg;
    
    image(topImg, this.x + this.w / 2, this.gap1Y + this.gapHeight / 2, letterSize, letterSize);
    image(botImg, this.x + this.w / 2, this.gap2Y + this.gapHeight / 2, letterSize, letterSize);
  }

  update() { this.x -= this.speed; }
  offscreen() { return this.x < -this.w; }

  isInGapZone(bird) {
    return (bird.x > this.x && bird.x < this.x + this.w);
  }

  handleSolidCollision(bird) {
    if (bird.x + (bird.displayW/2) > this.x && bird.x - (bird.displayW/2) < this.x + this.w) {
      if (bird.y - (bird.displayH/2) < this.topPipeHeight) {
        bird.y = this.topPipeHeight + (bird.displayH/2);
        bird.velocity = 0;
      }
      if (bird.y + (bird.displayH/2) > this.midPipeY && bird.y - (bird.displayH/2) < this.midPipeY + this.pipeThickness) {
        if (bird.y < this.midPipeY + this.pipeThickness/2) bird.y = this.midPipeY - (bird.displayH/2);
        else bird.y = this.midPipeY + this.pipeThickness + (bird.displayH/2);
        bird.velocity = 0;
      }
      if (bird.y + (bird.displayH/2) > this.bottomPipeY) {
        bird.y = this.bottomPipeY - (bird.displayH/2);
        bird.velocity = 0;
      }
    }
  }

  passedCorrectGap(bird) {
    if (this.targetInTopGap) {
      return (bird.y > this.gap1Y && bird.y < this.gap1Y + this.gapHeight);
    } else {
      return (bird.y > this.gap2Y && bird.y < this.gap2Y + this.gapHeight);
    }
  }

  passedWrongGap(bird) {
    if (this.scored) return false; 
    if (!this.targetInTopGap) {
      return (bird.y > this.gap1Y && bird.y < this.gap1Y + this.gapHeight);
    } else {
      return (bird.y > this.gap2Y && bird.y < this.gap2Y + this.gapHeight);
    }
  }
}