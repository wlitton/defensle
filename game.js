// game.js

const canvas = document.getElementById("gameCanvas");

let selectedTowerType = "single";

const towerButtons = document.createElement("div");
towerButtons.style.position = "absolute";
towerButtons.style.bottom = "10px";
towerButtons.style.left = "50%";
towerButtons.style.transform = "translateX(-50%)";
towerButtons.style.display = "flex";
towerButtons.style.gap = "10px";
towerButtons.style.zIndex = 10;

["single", "aoe", "slow", "dot", "mine"].forEach(type => {
  const btn = document.createElement("button");
  btn.textContent = type;
  btn.style.padding = "10px";
  btn.onclick = () => { selectedTowerType = type; };
  towerButtons.appendChild(btn);
});
document.body.appendChild(towerButtons);
const ctx = canvas.getContext("2d");

let lives = 20;
let money = 100;
let wave = 1;
let score = 0;

const towers = [];
const enemies = [];
const projectiles = [];

const TILE_SIZE = 40;
const MAP_COLS = canvas.width / TILE_SIZE;
const MAP_ROWS = canvas.height / TILE_SIZE;

// Generate seed from today's date
const today = new Date().toISOString().split("T")[0];
const seed = [...today].reduce((a, c) => a + c.charCodeAt(0), 0);

function seededRandom(seed) {
  let x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generatePath(seed) {
  const path = [];
  let col = 0;
  let row = Math.floor(MAP_ROWS / 2);
  for (let i = 0; i < MAP_COLS; i++) {
    path.push({ col, row });
    if (Math.random() < 0.3) {
      row += Math.random() < 0.5 ? -1 : 1;
      row = Math.max(0, Math.min(MAP_ROWS - 1, row));
    }
    col++;
  }
  return path;
}

Math.random = () => seededRandom(seed); // override global Math.random for deterministic results
const path = generatePath(seed);

function drawPath() {
  ctx.fillStyle = "#555";
  path.forEach(tile => {
    ctx.fillRect(tile.col * TILE_SIZE, tile.row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  });
}

function spawnWave() {
  const enemyCount = 5 + wave * 2;
  for (let i = 0; i < enemyCount; i++) {
    setTimeout(() => {
      const rand = Math.random();
      let type = "grunt";
      if (rand < 0.2) type = "tank";
      else if (rand < 0.4) type = "sprinter";
      else if (rand < 0.5) type = "flying";

      let hp = 10 + wave * 2;
      let speed = 1 + wave * 0.05;

      if (type === "tank") {
        hp *= 3;
        speed *= 0.5;
      } else if (type === "sprinter") {
        hp *= 0.5;
        speed *= 2;
      } else if (type === "flying") {
        hp *= 0.8;
        speed *= 1.5;
      }

      enemies.push({
        type,
        pathIndex: 0,
        x: path[0].col * TILE_SIZE,
        y: path[0].row * TILE_SIZE,
        hp,
        speed,
        flying: type === "flying"
      });
    }, i * 400);
  }
  wave++;
}

function updateEnemies() {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    const nextTile = path[enemy.pathIndex + 1];
    if (!nextTile) {
      lives--;
      enemies.splice(i, 1);
      continue;
    }
    const targetX = nextTile.col * TILE_SIZE;
    const targetY = nextTile.row * TILE_SIZE;
    const dx = targetX - enemy.x;
    const dy = targetY - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const moveX = (dx / dist) * enemy.speed;
    const moveY = (dy / dist) * enemy.speed;

    enemy.x += moveX;
    enemy.y += moveY;

    if (Math.abs(enemy.x - targetX) < 1 && Math.abs(enemy.y - targetY) < 1) {
      enemy.pathIndex++;
    }
  }
}

function drawEnemies() {
  enemies.forEach(enemy => {
    ctx.fillStyle = enemy.type === "tank" ? "darkred" :
                    enemy.type === "sprinter" ? "orange" :
                    enemy.type === "flying" ? "skyblue" : "red";
    ctx.beginPath();
    ctx.arc(enemy.x + TILE_SIZE / 2, enemy.y + TILE_SIZE / 2, TILE_SIZE / 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawTowers() {
  towers.forEach(tower => {
    switch (tower.type) {
      case "aoe": ctx.fillStyle = "purple"; break;
      case "slow": ctx.fillStyle = "cyan"; break;
      case "dot": ctx.fillStyle = "lime"; break;
      case "mine": ctx.fillStyle = "gold"; break;
      default: ctx.fillStyle = "blue"; break;
    }
    ctx.beginPath();
    ctx.arc(tower.x + TILE_SIZE / 2, tower.y + TILE_SIZE / 2, TILE_SIZE / 3, 0, Math.PI * 2);
    ctx.fill();
  });
}
  });
}

canvas.addEventListener("click", e => {
    const rect = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - rect.left) / TILE_SIZE) * TILE_SIZE;
  const y = Math.floor((e.clientY - rect.top) / TILE_SIZE) * TILE_SIZE;

  // Don't allow placing on the path
  if (path.some(tile => tile.col * TILE_SIZE === x && tile.row * TILE_SIZE === y)) return;

  if (money >= 50) {
        let tower = { x, y, range: 80, fireRate: 1000, lastShot: 0, type: selectedTowerType };
    if (selectedTowerType === "aoe") tower.damage = 3;
    if (selectedTowerType === "slow") tower.slow = 0.5;
    if (selectedTowerType === "dot") tower.dot = { damage: 1, duration: 3000 };
    if (selectedTowerType === "mine") tower.mine = true;
    towers.push(tower);
    money -= 50;
  }
});

function updateTowers(timestamp) {
  towers.forEach(tower => {
        if (timestamp - tower.lastShot >= tower.fireRate) {
      const target = enemies.find(e => {
        if (e.flying && tower.type === "aoe") return false;
        const dx = e.x - tower.x;
        const dy = e.y - tower.y;
        return Math.sqrt(dx * dx + dy * dy) <= tower.range;
      });
      if (target) {
        if (tower.type === "slow") {
          target.speed *= tower.slow;
          setTimeout(() => target.speed /= tower.slow, 1000);
        } else if (tower.type === "dot") {
          let ticks = 3;
          const interval = setInterval(() => {
            if (ticks-- <= 0 || !enemies.includes(target)) return clearInterval(interval);
            target.hp -= tower.dot.damage;
            if (target.hp <= 0) {
              enemies.splice(enemies.indexOf(target), 1);
              money += 10;
              score += 10;
              clearInterval(interval);
            }
          }, 1000);
        } else if (tower.type === "mine") {
          target.hp -= 20;
          towers.splice(towers.indexOf(tower), 1);
        } else {
          target.hp -= tower.damage || 5;
        }
        tower.lastShot = timestamp;
        if (target.hp <= 0) {
          enemies.splice(enemies.indexOf(target), 1);
          money += 10;
          score += 10;
        }
      }
    });
      if (target) {
        target.hp -= 5;
        tower.lastShot = timestamp;
        if (target.hp <= 0) {
          enemies.splice(enemies.indexOf(target), 1);
          money += 10;
          score += 10;
        }
      }
    }
  });
}

function drawUI() {
  document.getElementById("stats").textContent = `Lives: ${lives} | Money: $${money} | Wave: ${wave}`;
  document.getElementById("score").textContent = `Score: ${score}`;
}

let waveInProgress = false;

function gameLoop(timestamp) {
  if (lives <= 0) {
    cancelAnimationFrame(gameLoop);
    document.getElementById("leaderboardModal").style.display = "block";
    const username = prompt("Game over! Enter your name:") || "Anonymous";
    const date = new Date().toISOString().split("T")[0];
    supabase.from('scores').insert([{ username, score, date }]);

    supabase.from('scores')
      .select('*')
      .eq('date', date)
      .order('score', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        const list = document.getElementById("leaderboard");
        list.innerHTML = '';
        data.forEach(entry => {
          const li = document.createElement('li');
          li.textContent = `${entry.username}: ${entry.score}`;
          list.appendChild(li);
        });
      });
    return;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawPath();

  if (!waveInProgress && enemies.length === 0) {
    waveInProgress = true;
    spawnWave();
    setTimeout(() => { waveInProgress = false; }, (5 + wave * 2) * 400);
  }

  updateEnemies();
  updateTowers(timestamp);
  drawEnemies();
  drawTowers();
  drawUI();

  requestAnimationFrame(gameLoop);
}

// Start game
gameLoop();
