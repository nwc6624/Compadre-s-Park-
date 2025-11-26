import * as THREE from "three";



// ----------------- ADD THIS -----------------

enum GameState {

  Menu = "MENU",

  Playing = "PLAYING",

  GameOver = "GAME_OVER",

}

let gameState: GameState = GameState.Menu;



let playerMesh: THREE.Mesh | null = null;

let trackSegments: THREE.Mesh[] = [];

let obstacles: THREE.Mesh[] = [];



let currentScore = 0;

let bestScore = 0;

let lastObstacleZ = 0;



const TRACK_SEGMENT_LENGTH = 10;

const TRACK_SPEED = 0.25;  // can adjust later

// --------------------------------------------------



// Three.js core

let scene: THREE.Scene;

let camera: THREE.PerspectiveCamera;

let renderer: THREE.WebGLRenderer;



// DOM elements

const canvas = document.getElementById("game-canvas") as HTMLCanvasElement | null;

const tapOverlay = document.getElementById("tap-to-start-overlay") as HTMLDivElement | null;

const scoreEl = document.getElementById("score") as HTMLDivElement | null;

const highScoreEl = document.getElementById("high-score") as HTMLDivElement | null;



if (!canvas) {

  throw new Error("Canvas #game-canvas not found");

}



// Game values

let score = 0;

let highScore = 0;

let elapsedSinceStart = 0;

const baseForwardSpeed = 10;

let forwardSpeed = baseForwardSpeed;



// Lanes

const LANE_X_POSITIONS = [-1.5, 0, 1.5];

let currentLaneIndex = 1;

let targetLaneX = LANE_X_POSITIONS[currentLaneIndex];



// World objects

let player: THREE.Mesh | null = null;

const slideSegments: THREE.Mesh[] = [];

const obstacles: THREE.Mesh[] = [];



// Config

const SEGMENT_LENGTH = 20;

const SEGMENT_COUNT = 8;

const OBSTACLE_CHANCE_PER_SEGMENT = 0.5;



// Pointer input state

let isDragging = false;

let dragStartX = 0;

let dragCurrentX = 0;



function updateHud() {

  if (scoreEl) scoreEl.textContent = `Score: ${Math.floor(score)}`;

  if (highScoreEl) highScoreEl.textContent = `Best: ${Math.floor(highScore)}`;

}



function updateScoreUI(score: number, best: number) {

  if (scoreEl) scoreEl.textContent = `Score: ${Math.floor(score)}`;

  if (highScoreEl) highScoreEl.textContent = `Best: ${Math.floor(best)}`;

}



function hideMenuOverlay() {

  if (tapOverlay) {

    tapOverlay.style.display = "none";

  }

  // Hide share/edit buttons when gameState === Playing

  const shareBtn = document.getElementById("share-button") as HTMLElement | null;

  const editBtn = document.getElementById("edit-button") as HTMLElement | null;

  if (shareBtn) shareBtn.style.display = "none";

  if (editBtn) editBtn.style.display = "none";

}



function showMenuOverlay() {

  if (tapOverlay) {

    tapOverlay.style.display = "flex";

    const text = tapOverlay.querySelector(".tap-text") as HTMLDivElement | null;

    if (text) {

      text.textContent = "Tap to start";

    }

  }

  // Show share/edit buttons in Menu state

  const shareBtn = document.getElementById("share-button") as HTMLElement | null;

  const editBtn = document.getElementById("edit-button") as HTMLElement | null;

  if (shareBtn) shareBtn.style.display = "block";

  if (editBtn) editBtn.style.display = "block";

}



function showGameOverOverlay() {

  // Show restart button ONLY when gameState === GameOver

  const restartBtn = document.getElementById("restart-button") as HTMLElement | null;

  

  if (gameState === GameState.GameOver) {

    if (tapOverlay) {

      tapOverlay.style.display = "flex";

      const text = tapOverlay.querySelector(".tap-text") as HTMLDivElement | null;

      if (text) {

        text.textContent = "Game Over – Tap to restart";

      }

    }

    if (restartBtn) restartBtn.style.display = "block";

  } else {

    // Hide restart button when not in GameOver state

    if (restartBtn) restartBtn.style.display = "none";

  }

}



// ----- World creation -----



function createScene() {

  scene = new THREE.Scene();

  scene.background = new THREE.Color(0x87cefa);



  const aspect = window.innerWidth / window.innerHeight;

  camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);

  camera.position.set(0, 3, 8);

  camera.lookAt(0, 1, -20);



  renderer = new THREE.WebGLRenderer({

    canvas,

    antialias: true,

  });

  renderer.setSize(window.innerWidth, window.innerHeight);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));



  // Lights

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);

  scene.add(ambient);



  const directional = new THREE.DirectionalLight(0xffffff, 0.8);

  directional.position.set(5, 10, 5);

  scene.add(directional);



  window.addEventListener("resize", onWindowResize);

}



function onWindowResize() {

  const width = window.innerWidth;

  const height = window.innerHeight;

  camera.aspect = width / height;

  camera.updateProjectionMatrix();

  renderer.setSize(width, height);

}



function createPlayer() {

  if (playerMesh) scene.remove(playerMesh);



  const geo = new THREE.SphereGeometry(0.5, 32, 32);

  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff });

  playerMesh = new THREE.Mesh(geo, mat);

  playerMesh.position.set(0, 0.5, 0); // center lane

  scene.add(playerMesh);

}



function createInitialTrack() {

  trackSegments.forEach(s => scene.remove(s));

  trackSegments = [];



  obstacles.forEach(o => scene.remove(o));

  obstacles = [];

  lastObstacleZ = 0;



  const trackWidth = 6; // 3 lanes

  const segmentCount = 20;



  for (let i = 0; i < segmentCount; i++) {

    const geo = new THREE.BoxGeometry(trackWidth, 0.2, TRACK_SEGMENT_LENGTH);

    const mat = new THREE.MeshStandardMaterial({ color: 0x0050a0 }); // blue

    const mesh = new THREE.Mesh(geo, mat);

    mesh.position.set(0, 0, -i * TRACK_SEGMENT_LENGTH);

    trackSegments.push(mesh);

    scene.add(mesh);

  }

}



function spawnObstacleRow(zPos: number) {

  const lanes = [-2, 0, 2];

  const laneIndex = Math.floor(Math.random() * lanes.length);

  const xPos = lanes[laneIndex];



  const geo = new THREE.BoxGeometry(1, 1, 1);

  const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });

  const obstacle = new THREE.Mesh(geo, mat);

  obstacle.position.set(xPos, 0.5, zPos);



  obstacles.push(obstacle);

  scene.add(obstacle);

  lastObstacleZ = zPos;

}



function createSlideSegment(zIndex: number): THREE.Mesh {

  const geom = new THREE.BoxGeometry(5, 0.2, SEGMENT_LENGTH);

  const mat = new THREE.MeshPhongMaterial({ color: 0x1e7be6 });

  const mesh = new THREE.Mesh(geom, mat);

  mesh.position.set(0, 0, -zIndex * SEGMENT_LENGTH);

  mesh.receiveShadow = true;

  scene.add(mesh);

  return mesh;

}



function spawnObstacleOnSegment(segment: THREE.Mesh) {

  if (Math.random() > OBSTACLE_CHANCE_PER_SEGMENT) return;



  const laneIndex = Math.floor(Math.random() * LANE_X_POSITIONS.length);

  const x = LANE_X_POSITIONS[laneIndex];



  const geom = new THREE.BoxGeometry(0.8, 0.8, 0.8);

  const mat = new THREE.MeshPhongMaterial({ color: 0xff4444 });

  const box = new THREE.Mesh(geom, mat);



  const localZ = (Math.random() * SEGMENT_LENGTH) - SEGMENT_LENGTH / 2;

  box.position.set(x, 0.6, segment.position.z + localZ);



  scene.add(box);

  obstacles.push(box);

}



function createWorld() {

  // clear old

  slideSegments.forEach(seg => scene.remove(seg));

  slideSegments.length = 0;

  obstacles.forEach(o => scene.remove(o));

  obstacles.length = 0;



  for (let i = 0; i < SEGMENT_COUNT; i++) {

    const seg = createSlideSegment(i);

    slideSegments.push(seg);

    spawnObstacleOnSegment(seg);

  }



  if (!player) {

    createPlayer();

  } else {

    player.position.set(0, 1, 0);

  }



  currentLaneIndex = 1;

  targetLaneX = LANE_X_POSITIONS[currentLaneIndex];

  if (player) {

    player.position.x = targetLaneX;

  }

}



// ----- Input (lanes) -----



function setLane(index: number) {

  currentLaneIndex = Math.max(0, Math.min(LANE_X_POSITIONS.length - 1, index));

  targetLaneX = LANE_X_POSITIONS[currentLaneIndex];

}



function onPointerDown(clientX: number) {

  isDragging = true;

  dragStartX = clientX;

  dragCurrentX = clientX;

}



function onPointerMove(clientX: number) {

  if (!isDragging) return;

  dragCurrentX = clientX;

}



function onPointerUp() {

  if (!isDragging) return;

  const deltaX = dragCurrentX - dragStartX;

  const SWIPE_THRESHOLD = 40;



  if (deltaX > SWIPE_THRESHOLD) {

    setLane(currentLaneIndex + 1);

  } else if (deltaX < -SWIPE_THRESHOLD) {

    setLane(currentLaneIndex - 1);

  }



  isDragging = false;

}



// ----- Game state helpers -----



function resetGame() {

  score = 0;

  elapsedSinceStart = 0;

  forwardSpeed = baseForwardSpeed;

  currentLaneIndex = 1;

  targetLaneX = LANE_X_POSITIONS[currentLaneIndex];

  createWorld();

  updateHud();

}



function startGame() {

  gameState = GameState.Playing;

  currentScore = 0;



  createPlayer();

  createInitialTrack();

  spawnObstacleRow(-25);



  updateScoreUI(currentScore, bestScore);  // should already exist

  hideMenuOverlay();                       // must hide "tap to start" + share/edit

}



function endGame() {

  gameState = GameState.GameOver;

  if (currentScore > bestScore) bestScore = currentScore;



  updateScoreUI(currentScore, bestScore);

  showGameOverOverlay();  // should display "Game Over – tap to restart"

}



// ----- Game update / collisions -----



function checkCollisions() {

  if (!player) return;



  const playerPos = player.position;

  const playerRadius = 0.5;

  const toRemove: THREE.Mesh[] = [];



  for (const o of obstacles) {

    const dx = o.position.x - playerPos.x;

    const dy = o.position.y - playerPos.y;

    const dz = o.position.z - playerPos.z;

    const distSq = dx * dx + dy * dy + dz * dz;



    const obstacleRadius = 0.6;

    const combined = playerRadius + obstacleRadius;



    if (distSq < combined * combined) {

      endGame();

      return;

    }



    if (o.position.z > camera.position.z + 10) {

      toRemove.push(o);

    }

  }



  if (toRemove.length > 0) {

    for (const o of toRemove) {

      const idx = obstacles.indexOf(o);

      if (idx !== -1) obstacles.splice(idx, 1);

      scene.remove(o);

    }

  }

}



function updateGame(delta: number) {

  elapsedSinceStart += delta;

  forwardSpeed = baseForwardSpeed + elapsedSinceStart * 0.5;



  score += delta * 10;

  updateHud();



  if (player) {

    const LERP_FACTOR = 10;

    player.position.x += (targetLaneX - player.position.x) * Math.min(LERP_FACTOR * delta, 1);

  }



  slideSegments.forEach((seg) => {

    seg.position.z += forwardSpeed * delta;



    if (seg.position.z - SEGMENT_LENGTH / 2 > camera.position.z + 5) {

      seg.position.z -= SEGMENT_LENGTH * SEGMENT_COUNT;



      seg.position.x = (Math.random() - 0.5) * 1.0;



      // clear obstacles near this z

      for (let i = obstacles.length - 1; i >= 0; i--) {

        const o = obstacles[i];

        if (Math.abs(o.position.z - seg.position.z) < SEGMENT_LENGTH * 0.6) {

          scene.remove(o);

          obstacles.splice(i, 1);

        }

      }



      spawnObstacleOnSegment(seg);

    }

  });



  obstacles.forEach((o) => {

    o.position.z += forwardSpeed * delta;

  });



  checkCollisions();

}



// ----- Main loop -----



let lastTime = 0;



function animate() {

  requestAnimationFrame(animate);



  if (gameState === GameState.Playing) {

    // Move track segments

    trackSegments.forEach(seg => seg.position.z += TRACK_SPEED);



    // Recycle segments

    const maxZ = 5;

    trackSegments.forEach(seg => {

      if (seg.position.z > maxZ) {

        const minZ = Math.min(...trackSegments.map(s => s.position.z));

        seg.position.z = minZ - TRACK_SEGMENT_LENGTH;

      }

    });



    // Move obstacles

    obstacles.forEach(o => o.position.z += TRACK_SPEED);



    // Spawn new obstacles

    const neededZ = Math.min(...trackSegments.map(s => s.position.z)) - 15;

    if (lastObstacleZ > neededZ) {

      spawnObstacleRow(lastObstacleZ - 10);

    }



    // Update score

    currentScore += TRACK_SPEED * 0.1;

    updateScoreUI(Math.floor(currentScore), bestScore);



    // Collision detection

    if (playerMesh) {

      const playerBox = new THREE.Box3().setFromObject(playerMesh);

      for (const ob of obstacles) {

        const obBox = new THREE.Box3().setFromObject(ob);

        if (playerBox.intersectsBox(obBox)) {

          endGame();

          break;

        }

      }

    }

  }



  renderer.render(scene, camera);

}



// ----- Overlay tap handler -----



function handleOverlayTap(ev: Event) {

  ev.preventDefault();

  startGame();

}



// ----- Init -----



createScene();

createWorld();

updateHud();

animate();  // <-- make sure this is called ONCE during setup!



// Pointer events for lanes

canvas.addEventListener("mousedown", (e) => {

  e.preventDefault();

  onPointerDown(e.clientX);

});

canvas.addEventListener("mousemove", (e) => {

  e.preventDefault();

  onPointerMove(e.clientX);

});

canvas.addEventListener("mouseup", (e) => {

  e.preventDefault();

  onPointerUp();

});



canvas.addEventListener(

  "touchstart",

  (e) => {

    if (e.touches.length > 0) {

      e.preventDefault();

      onPointerDown(e.touches[0].clientX);

    }

  },

  { passive: false }

);



canvas.addEventListener(

  "touchmove",

  (e) => {

    if (e.touches.length > 0) {

      e.preventDefault();

      onPointerMove(e.touches[0].clientX);

    }

  },

  { passive: false }

);



canvas.addEventListener(

  "touchend",

  (e) => {

    e.preventDefault();

    onPointerUp();

  },

  { passive: false }

);



// Overlay tap to start / restart

if (tapOverlay) {

  tapOverlay.addEventListener("click", handleOverlayTap);

  tapOverlay.addEventListener(

    "touchstart",

    handleOverlayTap,

    { passive: false }

  );

}



// Restart button handler - make sure tap/click on restart calls startGame()

const restartBtn = document.getElementById("restart-button") as HTMLElement | null;

if (restartBtn) {

  restartBtn.addEventListener("click", (ev) => {

    ev.preventDefault();

    startGame();

  });

  restartBtn.addEventListener("touchstart", (ev) => {

    ev.preventDefault();

    startGame();

  }, { passive: false });

}
