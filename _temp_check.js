
  (function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // ------------------- 配置参数 --------------------
    const COLS = 32;
    const ROWS = 24;
    const TILE_SIZE = 25;

    const BASE_THICKNESS = 5;  // 初始元素厚度
    const MAX_THICKNESS = 9;   // 元素厚度上限

    // 瓦片数据
    let tiles = [];
    // 怪物数据
    let monsters = [];
    // 主角
    let hero = null;
    // 粒子系统
    let particles = [];
    // 风箭
    let windArrows = [];
    // 蓄力状态
    const charge = {
      active: false,      // 是否正在蓄力
      progress: 0,        // 蓄力进度 0~1
      duration: 48,       // 蓄力总帧数（60帧 ≈ 1秒，60fps）
      ready: false,       // 是否已蓄满
      readyBursted: false,// 蓄力完成的爆发特效是否已播放
      readyFrames: 0,     // 蓄满后经过的帧数（用于完美蓄力窗口判断）
    };
    // 动画帧
    let animationFrame = null;

    // 虚拟摇杆状态
    const joystick = {
      baseX: 70,
      baseY: 530,
      baseRadius: 45,
      knobRadius: 22,
      knobX: 70,
      knobY: 530,
      active: false,
      pointerId: null,
      // 输出方向 (-1 ~ 1)
      dx: 0,
      dy: 0,
    };

    // 键盘状态
    const keys = {};

    // ------------------- 初始化地形 --------------------
    function initTiles() {
      tiles = [];
      for (let r = 0; r < ROWS; r++) {
        let row = [];
        for (let c = 0; c < COLS; c++) {
          const isSand = (c < COLS / 2);
          row.push({
            sand: isSand ? BASE_THICKNESS : 0,
            ice: isSand ? 0 : BASE_THICKNESS,
            seed: Math.random() * 100,
          });
        }
        tiles.push(row);
      }
      updateTotalInfo();
    }

    // ------------------- 全局元素总量 --------------------
    function getTotalThickness() {
      let totalSand = 0, totalIce = 0;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          totalSand += tiles[r][c].sand;
          totalIce += tiles[r][c].ice;
        }
      }
      return { totalSand, totalIce };
    }

    function updateTotalInfo() {
      const { totalSand, totalIce } = getTotalThickness();
      document.getElementById('totalSand').textContent = totalSand.toFixed(1);
      document.getElementById('totalIce').textContent = totalIce.toFixed(1);
    }

    function updateHeroInfo() {
      if (!hero) return;
      const col = Math.floor(hero.x / TILE_SIZE);
      const row = Math.floor(hero.y / TILE_SIZE);
      document.getElementById('heroPos').textContent = `(${col}, ${row})`;
      if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
        const tile = tiles[row][col];
        document.getElementById('tileSand').textContent = tile.sand.toFixed(1);
        document.getElementById('tileIce').textContent = tile.ice.toFixed(1);
      }
    }

    // ------------------- 初始化怪物 --------------------
    function initMonsters() {
      monsters = [
        {
          id: 'sandworm',
          name: '沙虫',
          x: 7 * TILE_SIZE + TILE_SIZE / 2,
          y: 15 * TILE_SIZE + TILE_SIZE / 2,
          type: 'sandworm',
          size: 1.4,
          // 击退速度
          vx: 0,
          vy: 0,
          knockbackFriction: 0.85, // 每帧速度衰减系数
        },
        {
          id: 'icefly',
          name: '冰晶蝶',
          x: 24 * TILE_SIZE + TILE_SIZE / 2,
          y: 8 * TILE_SIZE + TILE_SIZE / 2,
          type: 'icefly',
          size: 1.3,
          // 悬浮动画
          floatPhase: Math.random() * Math.PI * 2,
          // 击退速度
          vx: 0,
          vy: 0,
          knockbackFriction: 0.85,
        },
      ];
    }

    // ------------------- 更新怪物（击退动画等） --------------------
    function updateMonsters() {
      monsters.forEach(mon => {
        // 击退速度衰减
        if (Math.abs(mon.vx) > 0.01 || Math.abs(mon.vy) > 0.01) {
          mon.x += mon.vx;
          mon.y += mon.vy;
          mon.vx *= mon.knockbackFriction;
          mon.vy *= mon.knockbackFriction;

          // 速度足够小时停止
          if (Math.abs(mon.vx) < 0.02 && Math.abs(mon.vy) < 0.02) {
            mon.vx = 0;
            mon.vy = 0;
          }

          // 边界限制
          const halfSize = TILE_SIZE * mon.size * 0.4;
          mon.x = Math.max(halfSize, Math.min(COLS * TILE_SIZE - halfSize, mon.x));
          mon.y = Math.max(halfSize, Math.min(ROWS * TILE_SIZE - halfSize, mon.y));
        }
      });
    }

    // ------------------- 初始化主角 --------------------
    function initHero() {
      hero = {
        x: 10 * TILE_SIZE + TILE_SIZE / 2,  // 像素坐标
        y: 12 * TILE_SIZE + TILE_SIZE / 2,
        size: 0.95,  // 瓦片大小比例
        speed: 2.2,  // 每帧移动像素（基础速度）
        // 动画
        walkFrame: 0,
        facing: 1,   // 1右 -1左
        // 冲刺加速
        dashFrames: 0,      // 冲刺剩余帧数
        dashDuration: 40,   // 冲刺总时长（40帧 ≈ 0.67秒，60fps）
        dashMulMax: 2.0,    // 冲刺最大速度倍率（自由移动速度的2倍）
        // 残影拖尾
        afterimages: [],    // 残影列表
        dashTrailFrame: 0,  // 残影生成计数
      };
    }

    // ------------------- 重置整个场景 --------------------
    function resetScene() {
      initTiles();
      initMonsters();
      initHero();
      particles = [];
      updateHeroInfo();
    }

    // ------------------- 粒子生成 --------------------
    function spawnSandDust(x, y, intensity = 1) {
      const count = Math.floor(8 * intensity);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = 0.8 + Math.random() * 1.8;
        const vx = Math.cos(angle) * spd;
        const vy = Math.sin(angle) * spd - 0.5;
        particles.push({
          x: x + (Math.random() - 0.5) * 15,
          y: y + (Math.random() - 0.5) * 15,
          vx: vx,
          vy: vy,
          size: 1.5 + Math.random() * 3.5,
          color: `rgba(210, 170, 110, ${0.7 + Math.random() * 0.3})`,
          life: 40 + Math.random() * 30,
          maxLife: 70,
          gravity: 0.01,
          fade: true,
          alpha: 1.0,
        });
      }
    }

    function spawnIceShards(x, y, intensity = 1) {
      const count = Math.floor(6 * intensity);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = 0.5 + Math.random() * 1.5;
        const vx = Math.cos(angle) * spd;
        const vy = Math.sin(angle) * spd - 0.3;
        particles.push({
          x: x + (Math.random() - 0.5) * 15,
          y: y + (Math.random() - 0.5) * 15,
          vx: vx,
          vy: vy,
          size: 1.2 + Math.random() * 3,
          color: `rgba(180, 230, 255, ${0.8 + Math.random() * 0.2})`,
          life: 30 + Math.random() * 30,
          maxLife: 60,
          gravity: 0.0,
          fade: true,
          alpha: 1.0,
        });
      }
    }

    // ------------------- 工具：转移元素厚度（守恒+上限） --------------------
    function transferThickness(tileFrom, tileTo, element, amount) {
      if (amount <= 0) return 0;
      // 不能超过来源的厚度
      amount = Math.min(amount, tileFrom[element]);
      // 不能让目标超过上限
      const maxCanReceive = MAX_THICKNESS - tileTo[element];
      amount = Math.min(amount, maxCanReceive);
      if (amount <= 0) return 0;
      tileFrom[element] -= amount;
      tileTo[element] += amount;
      return amount;
    }

    // ------------------- 风箭技能 --------------------
    function castWindArrow(perfect = false) {
      if (!hero || monsters.length === 0) return;

      // 找最近的怪物
      let nearestMon = null;
      let nearestDist = Infinity;
      monsters.forEach(mon => {
        const dist = Math.hypot(mon.x - hero.x, mon.y - hero.y);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestMon = mon;
        }
      });

      if (!nearestMon) return;

      // 发射风箭
      const dx = nearestMon.x - hero.x;
      const dy = nearestMon.y - hero.y;
      const dist = Math.hypot(dx, dy);
      const baseSpeed = 6;
      const speed = perfect ? baseSpeed * 1.6 : baseSpeed; // 完美蓄力：速度1.6倍
      const spreadMul = perfect ? 1.4 : 1.0; // 完美蓄力：扩散范围1.4倍
      const knockbackMul = perfect ? 1.7 : 1.0; // 完美蓄力：击退1.7倍

      windArrows.push({
        x: hero.x,
        y: hero.y,
        vx: (dx / dist) * speed,
        vy: (dy / dist) * speed,
        targetId: nearestMon.id,
        life: 120, // 最大存活帧
        hit: false,
        // 轨迹方向（用于击中后的扩散方向计算）
        dirX: dx / dist,
        dirY: dy / dist,
        spreadMul: spreadMul,
        knockbackMul: knockbackMul,
        perfect: perfect,
      });

      // 发射瞬间的风元素粒子爆发（主要朝飞行前方，不在反方向）
      const burstCount = perfect ? 10 : 6; // 进一步减少
      const spreadAngle = perfect ? 0.45 : 0.55; // 更集中
      for (let i = 0; i < burstCount; i++) {
        const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * spreadAngle;
        const spd = 2 + Math.random() * 3;
        particles.push({
          x: hero.x,
          y: hero.y,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          size: 2 + Math.random() * 2.5,
          color: perfect
            ? `rgba(200, 240, 255, ${0.7 + Math.random() * 0.3})`
            : `rgba(136, 216, 255, ${0.6 + Math.random() * 0.3})`,
          life: 12 + Math.random() * 12,
          maxLife: 24,
          gravity: 0,
          fade: true,
          alpha: 1.0,
        });
      }
    }

    // 风箭击中后的扩散效果（厚度变化）
    function applyWindArrowDiffusion(hitX, hitY, dirX, dirY, spreadMul = 1.0) {
      // 垂直于轨迹的方向
      const perpX = -dirY;
      const perpY = dirX;

      // 侵蚀区：细纺锤形（椭圆），长轴沿垂直方向，短轴沿轨迹方向
      const erodePerp = 5 * spreadMul;   // 垂直方向半长轴（格）—— 长轴
      const erodeTrail = 1.8 * spreadMul; // 轨迹方向半短轴（格）—— 短轴（细）
      const erodeStrength = 0.45; // 侵蚀强度（中心）

      // 堆积区范围：纺锤形外几圈
      const pileLayers = Math.round(3 * spreadMul);  // 堆积层数

      const hitCol = Math.floor(hitX / TILE_SIZE);
      const hitRow = Math.floor(hitY / TILE_SIZE);
      const searchRange = erodePerp + pileLayers + 2;

      // 第一步：遍历范围内所有瓦片，分类为侵蚀区和堆积区
      const erodeTiles = [];
      const pileTiles = [];
      let totalSandToReduce = 0;
      let totalIceToReduce = 0;

      for (let dr = -searchRange; dr <= searchRange; dr++) {
        for (let dc = -searchRange; dc <= searchRange; dc++) {
          const col = hitCol + dc;
          const row = hitRow + dr;
          if (row < 0 || row >= ROWS || col < 0 || col >= COLS) continue;

          // 计算瓦片中心到击中位置的向量
          const tileCenterX = col * TILE_SIZE + TILE_SIZE / 2 - hitX;
          const tileCenterY = row * TILE_SIZE + TILE_SIZE / 2 - hitY;

          // 投影到轨迹方向和垂直方向（单位：格）
          const projTrail = (tileCenterX * dirX + tileCenterY * dirY) / TILE_SIZE;
          const projPerp = (tileCenterX * perpX + tileCenterY * perpY) / TILE_SIZE;

          const absTrail = Math.abs(projTrail);
          const absPerp = Math.abs(projPerp);

          // 椭圆方程：(t/a)² + (p/b)² = 1
          // t <= 1 时在椭圆内（侵蚀区），t > 1 时在外部
          const ellipseT = (projTrail / erodeTrail) ** 2 + (projPerp / erodePerp) ** 2;

          if (ellipseT <= 1.0) {
            // 在纺锤形侵蚀区内
            // 侵蚀强度：中心强，向边缘逐渐减弱
            const distFromCenter = Math.sqrt(ellipseT); // 0 = 中心, 1 = 边缘
            const strength = erodeStrength * (1 - distFromCenter * 0.6);
            const tile = tiles[row][col];
            const sandReduce = tile.sand * strength;
            const iceReduce = tile.ice * strength;
            erodeTiles.push({ tile, col, row, sandReduce, iceReduce });
            totalSandToReduce += sandReduce;
            totalIceToReduce += iceReduce;
          } else {
            // 计算到椭圆边缘的近似距离（格）
            // 用椭圆径向近似：sqrt(ellipseT) 是相对距离，乘以平均半径得到近似绝对距离
            const avgRadius = (erodeTrail + erodePerp) * 0.5;
            const distFromEdge = (Math.sqrt(ellipseT) - 1) * avgRadius;

            if (distFromEdge > 0 && distFromEdge <= pileLayers + 0.5) {
              const tile = tiles[row][col];
              // 权重：距离越近权重越大
              const weight = 1 / (distFromEdge + 0.5);
              pileTiles.push({ tile, col, row, dist: distFromEdge, weight });
            }
          }
        }
      }

      // 第二步：从侵蚀区瓦片扣除厚度
      let actualSandReduced = 0;
      let actualIceReduced = 0;
      erodeTiles.forEach(({ tile, sandReduce, iceReduce }) => {
        const actualSand = Math.min(sandReduce, tile.sand);
        const actualIce = Math.min(iceReduce, tile.ice);
        tile.sand -= actualSand;
        tile.ice -= actualIce;
        actualSandReduced += actualSand;
        actualIceReduced += actualIce;
      });

      // 第三步：按权重分配到堆积区
      let totalWeight = 0;
      pileTiles.forEach(t => { totalWeight += t.weight; });

      function distribute(element, totalAmount) {
        if (totalWeight <= 0 || totalAmount <= 0) return 0;
        let distributed = 0;
        pileTiles.forEach(t => {
          const ratio = t.weight / totalWeight;
          const gain = totalAmount * ratio;
          const maxGain = MAX_THICKNESS - t.tile[element];
          const actualGain = Math.min(gain, maxGain);
          t.tile[element] += actualGain;
          distributed += actualGain;
        });
        // 处理因上限导致的余量
        let remaining = totalAmount - distributed;
        if (remaining > 0.01) {
          const canReceive = pileTiles.filter(t => t.tile[element] < MAX_THICKNESS);
          let canWeight = canReceive.reduce((s, t) => s + t.weight, 0);
          if (canWeight > 0) {
            canReceive.forEach(t => {
              const ratio = t.weight / canWeight;
              const gain = remaining * ratio;
              const maxGain = MAX_THICKNESS - t.tile[element];
              const actualGain = Math.min(gain, maxGain);
              t.tile[element] += actualGain;
            });
          }
        }
        return distributed;
      }

      distribute('sand', actualSandReduced);
      distribute('ice', actualIceReduced);

      // 第四步：粒子效果
      // 侵蚀带内的粒子向四周喷出
      const particleCount = 30;
      for (let i = 0; i < particleCount; i++) {
        // 从侵蚀带内随机位置出发
        const randTrail = (Math.random() - 0.5) * 2 * erodeTrail;
        const randPerp = (Math.random() - 0.5) * 2 * erodePerp;
        const startX = hitX + dirX * randTrail * TILE_SIZE + perpX * randPerp * TILE_SIZE;
        const startY = hitY + dirY * randTrail * TILE_SIZE + perpY * randPerp * TILE_SIZE;

        // 向四周随机方向喷出（偏向垂直方向）
        const angleBias = (Math.random() - 0.5) * 0.6; // 偏向垂直方向
        const baseAngle = Math.atan2(perpY, perpX) + (Math.random() < 0.5 ? 0 : Math.PI);
        const angle = baseAngle + angleBias + (Math.random() - 0.5) * 0.8;
        const spd = 1.5 + Math.random() * 3;

        const col = Math.floor(startX / TILE_SIZE);
        const row = Math.floor(startY / TILE_SIZE);
        let color = 'rgba(136, 216, 255, 0.8)';
        if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
          const tile = tiles[row][col];
          if (tile.sand > tile.ice) {
            color = `rgba(210, 170, 110, ${0.6 + Math.random() * 0.3})`;
          } else if (tile.ice > 0) {
            color = `rgba(180, 230, 255, ${0.7 + Math.random() * 0.3})`;
          }
        }

        particles.push({
          x: startX,
          y: startY,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          size: 1.5 + Math.random() * 3,
          color: color,
          life: 25 + Math.random() * 20,
          maxLife: 45,
          gravity: 0,
          fade: true,
          alpha: 1.0,
        });
      }

      // 中心冲击粒子
      for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = 1 + Math.random() * 3;
        particles.push({
          x: hitX + (Math.random() - 0.5) * 12,
          y: hitY + (Math.random() - 0.5) * 12,
          vx: Math.cos(angle) * spd,
          vy: Math.sin(angle) * spd,
          size: 2 + Math.random() * 4,
          color: `rgba(136, 216, 255, ${0.6 + Math.random() * 0.4})`,
          life: 20 + Math.random() * 15,
          maxLife: 35,
          gravity: 0,
          fade: true,
          alpha: 1.0,
        });
      }

      updateTotalInfo();
    }

    // 更新风箭
    function updateWindArrows() {
      for (let i = windArrows.length - 1; i >= 0; i--) {
        const arrow = windArrows[i];
        if (arrow.hit) {
          windArrows.splice(i, 1);
          continue;
        }

        arrow.x += arrow.vx;
        arrow.y += arrow.vy;
        arrow.life -= 1;

        // 轨迹粒子（完美蓄力时拖尾更长更明显）
        // 粒子生成位置：只在箭的后方（反方向），不会出现在前方
        const trailCount = arrow.perfect ? 2 : 1;
        const trailWidth = arrow.perfect ? 8 : 5; // 进一步收窄
        const trailBackMin = arrow.perfect ? 5 : 3;
        const trailBackMax = arrow.perfect ? 18 : 10; // 缩短拖尾
        for (let ti = 0; ti < trailCount; ti++) {
          // 沿箭飞行反方向的偏移量（后方）
          const backDist = trailBackMin + Math.random() * (trailBackMax - trailBackMin);
          const backX = -arrow.dirX * backDist;
          const backY = -arrow.dirY * backDist;
          // 垂直于箭方向的随机偏移（宽度）
          const perpOffset = (Math.random() - 0.5) * trailWidth * 2;
          const perpX = -arrow.dirY * perpOffset;
          const perpY = arrow.dirX * perpOffset;

          particles.push({
            x: arrow.x + backX + perpX,
            y: arrow.y + backY + perpY,
            vx: -arrow.vx * (arrow.perfect ? 0.35 : 0.15) + (Math.random() - 0.5) * 0.4,
            vy: -arrow.vy * (arrow.perfect ? 0.35 : 0.15) + (Math.random() - 0.5) * 0.4,
            size: (arrow.perfect ? 2.5 : 2) + Math.random() * (arrow.perfect ? 2.5 : 2),
            color: arrow.perfect
              ? `rgba(200, 240, 255, ${0.6 + Math.random() * 0.25})`
              : `rgba(136, 216, 255, ${0.55 + Math.random() * 0.3})`,
            life: (arrow.perfect ? 22 : 12) + Math.random() * (arrow.perfect ? 12 : 8),
            maxLife: arrow.perfect ? 34 : 20,
            gravity: 0,
            fade: true,
            alpha: 1.0,
          });
        }
        // 完美蓄力额外外层拖尾（大而淡的光晕，同样只在后方）
        if (arrow.perfect && Math.random() < 0.3) { // 进一步降低概率
          const backDist = 6 + Math.random() * 16;
          const backX = -arrow.dirX * backDist;
          const backY = -arrow.dirY * backDist;
          const perpOffset = (Math.random() - 0.5) * 12;
          const perpX = -arrow.dirY * perpOffset;
          const perpY = arrow.dirX * perpOffset;
          particles.push({
            x: arrow.x + backX + perpX,
            y: arrow.y + backY + perpY,
            vx: -arrow.vx * 0.25 + (Math.random() - 0.5) * 0.5,
            vy: -arrow.vy * 0.25 + (Math.random() - 0.5) * 0.5,
            size: 3 + Math.random() * 3,
            color: `rgba(255, 255, 255, ${0.2 + Math.random() * 0.15})`,
            life: 18 + Math.random() * 10,
            maxLife: 28,
            gravity: 0,
            fade: true,
            alpha: 1.0,
          });
        }

        // 检测是否击中目标怪物
        const target = monsters.find(m => m.id === arrow.targetId);
        if (target) {
          const dist = Math.hypot(target.x - arrow.x, target.y - arrow.y);
          if (dist < TILE_SIZE * 0.7) {
            // 击中！
            arrow.hit = true;
            // 击退怪物（完美蓄力时击退更强）
            const baseKbSpeed = 7.5;
            const knockbackSpeed = baseKbSpeed * (arrow.knockbackMul || 1);
            target.vx = arrow.dirX * knockbackSpeed;
            target.vy = arrow.dirY * knockbackSpeed;

            // 击中特效粒子（根据怪物类型，完美蓄力更强烈）
            const intensity = arrow.perfect ? 2.2 : 1.5;
            if (target.type === 'sandworm') {
              spawnSandDust(target.x, target.y, intensity);
            } else {
              spawnIceShards(target.x, target.y, intensity);
            }

            // 触发扩散厚度变化（完美蓄力范围更大）
            applyWindArrowDiffusion(target.x, target.y, arrow.dirX, arrow.dirY, arrow.spreadMul || 1);
            continue;
          }
        }

        // 超出边界或超时
        if (arrow.x < -20 || arrow.x > 820 || arrow.y < -20 || arrow.y > 620 || arrow.life <= 0) {
          windArrows.splice(i, 1);
        }
      }
    }

    // 绘制风箭
    function drawWindArrows() {
      windArrows.forEach(arrow => {
        const angle = Math.atan2(arrow.vy, arrow.vx);
        const perf = arrow.perfect || false;

        ctx.save();
        ctx.translate(arrow.x, arrow.y);
        ctx.rotate(angle);

        // 箭身光晕（完美蓄力更亮更大）
        ctx.shadowColor = perf ? 'rgba(200, 240, 255, 1)' : 'rgba(136, 216, 255, 0.9)';
        ctx.shadowBlur = perf ? 22 : 12;

        const scale = perf ? 1.4 : 1.0;

        // 箭身
        const grad = ctx.createLinearGradient(-18 * scale, 0, 8 * scale, 0);
        grad.addColorStop(0, perf ? 'rgba(200, 240, 255, 0)' : 'rgba(136, 216, 255, 0)');
        grad.addColorStop(0.4, perf ? 'rgba(220, 245, 255, 0.9)' : 'rgba(180, 235, 255, 0.8)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 1)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(-18 * scale, 0);
        ctx.lineTo(6 * scale, -3 * scale);
        ctx.lineTo(10 * scale, 0);
        ctx.lineTo(6 * scale, 3 * scale);
        ctx.closePath();
        ctx.fill();

        // 完美蓄力额外的外层光晕箭身
        if (perf) {
          ctx.globalAlpha = 0.5;
          ctx.shadowBlur = 30;
          const grad2 = ctx.createLinearGradient(-22 * scale, 0, 10 * scale, 0);
          grad2.addColorStop(0, 'rgba(180, 230, 255, 0)');
          grad2.addColorStop(0.5, 'rgba(200, 240, 255, 0.6)');
          grad2.addColorStop(1, 'rgba(255, 255, 255, 0.8)');
          ctx.fillStyle = grad2;
          ctx.beginPath();
          ctx.moveTo(-22 * scale, 0);
          ctx.lineTo(8 * scale, -5 * scale);
          ctx.lineTo(12 * scale, 0);
          ctx.lineTo(8 * scale, 5 * scale);
          ctx.closePath();
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }

        // 箭头
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(10 * scale, 0);
        ctx.lineTo(2 * scale, -5 * scale);
        ctx.lineTo(4 * scale, 0);
        ctx.lineTo(2 * scale, 5 * scale);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.restore();
      });
    }

    // ------------------- 蓄力更新 --------------------
    function updateCharge() {
      if (!charge.active) return;

      if (!charge.ready) {
        charge.progress += 1 / charge.duration;
        if (charge.progress >= 1) {
          charge.progress = 1;
          charge.ready = true;
          charge.readyBursted = false;
          charge.readyFrames = 0; // 完美蓄力窗口计时
        }
      } else {
        charge.readyFrames++;
      }

      // 蓄力中吸收风粒子特效（从周围向中心汇聚）
      if (hero) {
        // 粒子生成速率随进度增加
        const rate = 0.2 + charge.progress * 0.5;
        if (Math.random() < rate) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 25 + Math.random() * 20;
          const spd = 1.2 + Math.random() * 1.8 + charge.progress * 1.5;
          particles.push({
            x: hero.x + Math.cos(angle) * dist,
            y: hero.y + Math.sin(angle) * dist,
            vx: -Math.cos(angle) * spd + (Math.random() - 0.5) * 0.6,
            vy: -Math.sin(angle) * spd + (Math.random() - 0.5) * 0.6,
            size: 2 + Math.random() * 3,
            color: `rgba(136, 216, 255, ${0.5 + charge.progress * 0.3})`,
            life: 12 + Math.random() * 10,
            maxLife: 22,
            gravity: 0,
            fade: true,
            alpha: 1.0,
          });
        }
      }

      // 蓄力完成瞬间的爆发特效
      if (charge.ready && !charge.readyBursted && hero) {
        charge.readyBursted = true;
        for (let i = 0; i < 25; i++) {
          const angle = (i / 25) * Math.PI * 2 + Math.random() * 0.2;
          const spd = 3 + Math.random() * 3;
          particles.push({
            x: hero.x,
            y: hero.y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            size: 2.5 + Math.random() * 4,
            color: `rgba(200, 240, 255, ${0.7 + Math.random() * 0.3})`,
            life: 25 + Math.random() * 15,
            maxLife: 40,
            gravity: 0,
            fade: true,
            alpha: 1.0,
          });
        }
        // 额外的冲击波粒子
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          const spd = 5 + Math.random() * 2;
          particles.push({
            x: hero.x,
            y: hero.y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            size: 2 + Math.random() * 2,
            color: `rgba(255, 255, 255, 0.9)`,
            life: 15 + Math.random() * 8,
            maxLife: 23,
            gravity: 0,
            fade: true,
            alpha: 1.0,
          });
        }
      }
    }

    // 判断是否在完美蓄力窗口内（蓄满后0.2s = 12帧）
    function isPerfectCharge() {
      return charge.ready && charge.readyFrames <= 12;
    }

    // 开始蓄力
    function startCharge() {
      if (charge.active) return;
      charge.active = true;
      charge.progress = 0;
      charge.ready = false;
      charge.readyBursted = false;
      charge.readyFrames = 0;
    }

    // 松开：蓄满了才发射，否则取消；完美窗口内发射有加成
    function releaseCharge() {
      if (!charge.active) return;
      if (charge.ready) {
        const perfect = isPerfectCharge();
        castWindArrow(perfect);
        // 完美蓄力触发瞬间加速冲刺
        if (perfect && hero) {
          hero.dashFrames = hero.dashDuration;
        }
      }
      charge.active = false;
      charge.progress = 0;
      charge.ready = false;
      charge.readyBursted = false;
    }

    // ------------------- 主角移动 --------------------
    function updateHero() {
      if (!hero) return;

      // 计算速度倍率
      let speedMul = 1.0;

      // 冲刺加速（完美蓄力后的瞬间加速，从2倍逐渐降到1倍）
      // 冲刺优先级高于蓄力减速：冲刺期间不受蓄力减速影响
      if (hero.dashFrames > 0) {
        const progress = 1 - hero.dashFrames / hero.dashDuration; // 0→1
        // 从2倍线性递减到1倍
        const dashMul = hero.dashMulMax - (hero.dashMulMax - 1) * progress;
        speedMul *= dashMul;
        hero.dashFrames--;
      } else {
        // 蓄力减速（仅在没有冲刺时生效）
        if (charge.active) {
          speedMul *= 0.5;
        }
      }

      // 冲刺期间的特效（残影 + 速度线）
      if (hero.dashFrames > 0) {
        // 冲刺残影拖尾（每帧生成一个）
        hero.afterimages.push({
          x: hero.x,
          y: hero.y,
          facing: hero.facing,
          walkFrame: hero.walkFrame,
          life: 10,    // 残影寿命（帧）
          maxLife: 10,
        });

        // 冲刺速度线粒子
        if (Math.random() < 0.8) {
          const angle = Math.atan2(joystick.dy, joystick.dx) + Math.PI; // 反向
          if (Math.abs(joystick.dx) > 0.01 || Math.abs(joystick.dy) > 0.01) {
            for (let i = 0; i < 2; i++) {
              const spread = (Math.random() - 0.5) * 0.5;
              const lineAngle = angle + spread;
              const dist = 15 + Math.random() * 25;
              particles.push({
                x: hero.x + Math.cos(lineAngle) * dist,
                y: hero.y + Math.sin(lineAngle) * dist,
                vx: Math.cos(lineAngle) * (2 + Math.random() * 2),
                vy: Math.sin(lineAngle) * (2 + Math.random() * 2),
                size: 1 + Math.random() * 2,
                color: `rgba(200, 240, 255, ${0.4 + Math.random() * 0.3})`,
                life: 6 + Math.random() * 5,
                maxLife: 11,
                gravity: 0,
                fade: true,
                alpha: 1.0,
                isSpeedLine: true,
              });
            }
          }
        }
      }

      // 更新残影
      for (let i = hero.afterimages.length - 1; i >= 0; i--) {
        hero.afterimages[i].life--;
        if (hero.afterimages[i].life <= 0) {
          hero.afterimages.splice(i, 1);
        }
      }

      const moveX = joystick.dx * hero.speed * speedMul;
      const moveY = joystick.dy * hero.speed * speedMul;

      if (Math.abs(moveX) > 0.01 || Math.abs(moveY) > 0.01) {
        hero.x += moveX;
        hero.y += moveY;

        // 边界限制
        const halfSize = TILE_SIZE * hero.size * 0.4;
        hero.x = Math.max(halfSize, Math.min(COLS * TILE_SIZE - halfSize, hero.x));
        hero.y = Math.max(halfSize, Math.min(ROWS * TILE_SIZE - halfSize, hero.y));

        // 朝向
        if (moveX > 0.1) hero.facing = 1;
        else if (moveX < -0.1) hero.facing = -1;

        // 行走动画帧
        hero.walkFrame += 0.15;

        // 脚步粒子（根据脚下元素）
        if (Math.random() < 0.15) {
          const col = Math.floor(hero.x / TILE_SIZE);
          const row = Math.floor(hero.y / TILE_SIZE);
          if (row >= 0 && row < ROWS && col >= 0 && col < COLS) {
            const tile = tiles[row][col];
            if (tile.sand > 1) {
              particles.push({
                x: hero.x + (Math.random() - 0.5) * 8,
                y: hero.y + TILE_SIZE * 0.3,
                vx: -moveX * 0.3 + (Math.random() - 0.5) * 1,
                vy: -Math.abs(moveY) * 0.2 - 0.3,
                size: 1.5 + Math.random() * 2,
                color: `rgba(210, 170, 110, 0.6)`,
                life: 15 + Math.random() * 10,
                maxLife: 25,
                gravity: 0.03,
                fade: true,
                alpha: 1.0,
              });
            }
            if (tile.ice > 1) {
              particles.push({
                x: hero.x + (Math.random() - 0.5) * 8,
                y: hero.y + TILE_SIZE * 0.3,
                vx: -moveX * 0.2 + (Math.random() - 0.5) * 0.8,
                vy: -Math.abs(moveY) * 0.15 - 0.2,
                size: 1 + Math.random() * 2,
                color: `rgba(200, 235, 255, 0.7)`,
                life: 12 + Math.random() * 8,
                maxLife: 20,
                gravity: 0.01,
                fade: true,
                alpha: 1.0,
              });
            }
          }
        }

        updateHeroInfo();
      }
    }

    // ------------------- 粒子更新 --------------------
    function updateParticles() {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity || 0;
        p.vx *= 0.99;
        p.vy *= 0.99;
        p.life -= 1;
        if (p.fade) {
          p.alpha = Math.max(0, p.life / p.maxLife);
        }
        if (p.life <= 0) {
          particles.splice(i, 1);
        }
      }
    }

    // ------------------- HSL 颜色混合 --------------------
    function mixColors(h1, s1, l1, h2, s2, l2, ratio) {
      let hDiff = h2 - h1;
      if (hDiff > 180) hDiff -= 360;
      if (hDiff < -180) hDiff += 360;
      const h = h1 + hDiff * ratio;
      const s = s1 + (s2 - s1) * ratio;
      const l = l1 + (l2 - l1) * ratio;
      return { h, s, l };
    }

    // ------------------- 绘制场景 --------------------
    function draw() {
      ctx.clearRect(0, 0, 800, 600);

      const SAND_H = 34;
      const SAND_S = 48;
      const SAND_L = 58;
      const ICE_H = 195;
      const ICE_S = 62;
      const ICE_L = 70;
      const REF_THICKNESS = BASE_THICKNESS;
      // 亮度范围：厚度0时最亮(1.3倍)，厚度5时基准，厚度9时最暗(0.6倍)
      const MAX_LIGHT_FACTOR = 1.3;  // 厚度为0时的亮度倍数（不要太亮）
      const MIN_LIGHT_FACTOR = 0.6;  // 厚度为MAX时的亮度倍数

      // 1. 绘制地形瓦片
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const tile = tiles[r][c];
          const x = c * TILE_SIZE;
          const y = r * TILE_SIZE;

          const sand = tile.sand;
          const ice = tile.ice;
          const total = sand + ice;

          const iceRatio = total > 0 ? ice / total : 0;
          const mixed = mixColors(SAND_H, SAND_S, SAND_L, ICE_H, ICE_S, ICE_L, iceRatio);

          // 亮度映射：厚度 0 → MAX_LIGHT_FACTOR，厚度 REF → 1.0，厚度 MAX → MIN_LIGHT_FACTOR
          // 使用分段线性：0~REF 段从 MAX 降到 1.0，REF~MAX 段从 1.0 降到 MIN
          let lightFactor;
          if (total <= REF_THICKNESS) {
            const t = total / REF_THICKNESS; // 0~1
            lightFactor = MAX_LIGHT_FACTOR + (1.0 - MAX_LIGHT_FACTOR) * t;
          } else {
            const t = (total - REF_THICKNESS) / (MAX_THICKNESS - REF_THICKNESS); // 0~1
            lightFactor = 1.0 + (MIN_LIGHT_FACTOR - 1.0) * t;
          }
          const lightness = mixed.l * lightFactor;

          // 饱和度也随厚度略微变化（薄时饱和度稍低，厚时稍高）
          const satFactor = 0.8 + 0.4 * Math.min(1, total / MAX_THICKNESS);
          const saturation = mixed.s * satFactor;

          ctx.fillStyle = `hsl(${mixed.h}, ${saturation}%, ${lightness}%)`;
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

          // 纹理
          const seed = tile.seed;
          if (sand > 0.5) {
            const sandAlpha = Math.min(0.12, sand / REF_THICKNESS * 0.1);
            ctx.fillStyle = `rgba(80, 50, 20, ${sandAlpha})`;
            const sx1 = (seed * 1.7) % (TILE_SIZE - 6);
            const sy1 = (seed * 2.3) % (TILE_SIZE - 4);
            ctx.fillRect(x + sx1, y + sy1, 4, 2);
            const sx2 = (seed * 3.1 + 10) % (TILE_SIZE - 8);
            const sy2 = (seed * 1.9 + 8) % (TILE_SIZE - 4);
            ctx.fillRect(x + sx2, y + sy2, 5, 2);
          }
          if (ice > 0.5) {
            const iceAlpha = Math.min(0.2, ice / REF_THICKNESS * 0.15);
            ctx.fillStyle = `rgba(255, 255, 255, ${iceAlpha})`;
            const ix1 = (seed * 2.1 + 3) % (TILE_SIZE - 10);
            const iy1 = (seed * 1.5 + 2) % (TILE_SIZE - 4);
            ctx.fillRect(x + ix1, y + iy1, 8, 2);
            const ix2 = (seed * 2.7 + 12) % (TILE_SIZE - 8);
            const iy2 = (seed * 3.3 + 10) % (TILE_SIZE - 3);
            ctx.fillRect(x + ix2, y + iy2, 5, 2);
          }

          // 网格线
          ctx.strokeStyle = `rgba(0, 0, 0, 0.08)`;
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
        }
      }

      // 2. 绘制怪物
      monsters.forEach(mon => {
        const x = mon.x;
        const y = mon.y;
        const size = TILE_SIZE * mon.size;

        if (mon.type === 'sandworm') {
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 12;
          ctx.fillStyle = '#4a3723';
          ctx.beginPath();
          ctx.roundRect(x - size/2, y - size/2, size, size, 6);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#6b4f30';
          ctx.beginPath();
          ctx.roundRect(x - size/2 + 3, y - size/2 + 4, size - 6, 4, 3);
          ctx.fill();
          ctx.fillStyle = '#8f6b3e';
          ctx.beginPath();
          ctx.roundRect(x - size/2 + 5, y + 2, size - 10, 4, 3);
          ctx.fill();
          ctx.fillStyle = '#d9b382';
          ctx.beginPath();
          ctx.arc(x - 4, y - 5, 2.5, 0, Math.PI * 2);
          ctx.arc(x + 4, y - 5, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(x - 4.5, y - 6, 1, 0, Math.PI * 2);
          ctx.arc(x + 3.5, y - 6, 1, 0, Math.PI * 2);
          ctx.fill();
        } else if (mon.type === 'icefly') {
          // 冰晶蝶
          const floatY = Math.sin(mon.floatPhase + performance.now() * 0.002) * 3;
          const wingFlap = Math.sin(performance.now() * 0.01) * 0.3 + 0.7;

          ctx.shadowColor = 'rgba(160, 220, 255, 0.8)';
          ctx.shadowBlur = 16;

          // 翅膀（左）
          ctx.fillStyle = 'rgba(180, 230, 255, 0.7)';
          ctx.beginPath();
          ctx.ellipse(x - size*0.35, y + floatY - size*0.1, size*0.4 * wingFlap, size*0.35, -0.4, 0, Math.PI * 2);
          ctx.fill();

          // 翅膀（右）
          ctx.beginPath();
          ctx.ellipse(x + size*0.35, y + floatY - size*0.1, size*0.4 * wingFlap, size*0.35, 0.4, 0, Math.PI * 2);
          ctx.fill();

          // 身体
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#a8dcf0';
          ctx.beginPath();
          ctx.roundRect(x - size*0.15, y + floatY - size*0.3, size*0.3, size*0.6, 6);
          ctx.fill();

          // 冰晶棱角（头顶）
          ctx.fillStyle = '#d4f0ff';
          ctx.beginPath();
          ctx.moveTo(x - size*0.1, y + floatY - size*0.25);
          ctx.lineTo(x, y + floatY - size*0.45);
          ctx.lineTo(x + size*0.1, y + floatY - size*0.25);
          ctx.fill();

          // 眼睛
          ctx.fillStyle = '#1a3b4b';
          ctx.beginPath();
          ctx.arc(x - size*0.06, y + floatY - size*0.05, size*0.06, 0, Math.PI * 2);
          ctx.arc(x + size*0.06, y + floatY - size*0.05, size*0.06, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(x - size*0.05, y + floatY - size*0.08, size*0.025, 0, Math.PI * 2);
          ctx.arc(x + size*0.07, y + floatY - size*0.08, size*0.025, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
      });

      // 3. 绘制主角残影（在主角之前绘制，在身后）
      if (hero && hero.afterimages.length > 0) {
        hero.afterimages.forEach(img => {
          drawHeroAfterimage(img);
        });
      }

      // 4. 绘制主角
      if (hero) {
        drawHero();
      }

      // 5. 绘制粒子
      particles.forEach(p => {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();
        if (p.size > 2.5) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = p.color;
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });
      ctx.globalAlpha = 1.0;

      // 5. 绘制风箭
      drawWindArrows();

      // 6. 绘制虚拟摇杆
      drawJoystick();
    }

    // 绘制冲刺残影（半透明蓝白色调，淡出+缩小）
    function drawHeroAfterimage(img) {
      const x = img.x;
      const y = img.y;
      const alphaRatio = img.life / img.maxLife; // 1→0
      const scale = 0.7 + 0.1 * alphaRatio; // 从0.8缩小到0.7（更小）
      const alpha = alphaRatio * 0.4; // 最大不透明度0.4（更淡）

      const size = TILE_SIZE * hero.size * scale;
      const bobOffset = Math.sin(img.walkFrame) * 1;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(x, y + bobOffset);
      ctx.scale(img.facing, 1);

      // 残影发光
      ctx.shadowColor = 'rgba(136, 216, 255, 0.7)';
      ctx.shadowBlur = 8 * alphaRatio;

      // 身体（统一青蓝色调）
      const bodyGrad = ctx.createLinearGradient(0, -size * 0.3, 0, size * 0.2);
      bodyGrad.addColorStop(0, 'rgba(180, 235, 255, 0.8)');
      bodyGrad.addColorStop(1, 'rgba(100, 180, 230, 0.75)');
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.2, size * 0.26, 0, 0, Math.PI * 2);
      ctx.fill();

      // 头（亮白蓝色）
      ctx.fillStyle = 'rgba(220, 245, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(0, -size * 0.3, size * 0.14, 0, Math.PI * 2);
      ctx.fill();

      // 风元素宝石（发光）
      ctx.shadowBlur = 5 * alphaRatio;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(0, -size * 0.05, size * 0.04, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    function drawHero() {
      const x = hero.x;
      const y = hero.y;
      const size = TILE_SIZE * hero.size;
      const bob = Math.sin(hero.walkFrame) * 1.5; // 行走上下浮动

      ctx.save();
      ctx.translate(x, y + bob);
      if (hero.facing < 0) ctx.scale(-1, 1);

      // 影子
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;

      // 身体（金色披风战士风格）
      // 身体主体
      ctx.fillStyle = '#5a4a7a';  // 深紫色外衣
      ctx.beginPath();
      ctx.roundRect(-size*0.35, -size*0.15, size*0.7, size*0.55, 5);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // 腰带
      ctx.fillStyle = '#e0c878';
      ctx.fillRect(-size*0.35, size*0.18, size*0.7, size*0.08);

      // 头部
      ctx.fillStyle = '#f0d8b0';  // 肤色
      ctx.beginPath();
      ctx.roundRect(-size*0.28, -size*0.45, size*0.56, size*0.38, 6);
      ctx.fill();

      // 头发（金色）
      ctx.fillStyle = '#e0c878';
      ctx.beginPath();
      ctx.roundRect(-size*0.32, -size*0.5, size*0.64, size*0.18, 5);
      ctx.fill();
      // 刘海
      ctx.fillStyle = '#d4b860';
      ctx.beginPath();
      ctx.moveTo(-size*0.28, -size*0.38);
      ctx.lineTo(-size*0.1, -size*0.3);
      ctx.lineTo(size*0.05, -size*0.35);
      ctx.lineTo(size*0.2, -size*0.28);
      ctx.lineTo(size*0.24, -size*0.4);
      ctx.lineTo(-size*0.28, -size*0.45);
      ctx.fill();

      // 眼睛
      ctx.fillStyle = '#2a2040';
      ctx.beginPath();
      ctx.arc(-size*0.1, -size*0.25, 1.8, 0, Math.PI * 2);
      ctx.arc(size*0.1, -size*0.25, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-size*0.08, -size*0.27, 0.7, 0, Math.PI * 2);
      ctx.arc(size*0.12, -size*0.27, 0.7, 0, Math.PI * 2);
      ctx.fill();

      // 披风（飘动）
      const capeSway = Math.sin(hero.walkFrame * 0.7) * 3;
      ctx.fillStyle = '#7a5a9a';
      ctx.beginPath();
      ctx.moveTo(-size*0.35, -size*0.15);
      ctx.lineTo(-size*0.5 - capeSway*0.5, size*0.35);
      ctx.lineTo(-size*0.2, size*0.4);
      ctx.lineTo(-size*0.2, -size*0.1);
      ctx.closePath();
      ctx.fill();

      // 胸口宝石（风元素标志）
      ctx.fillStyle = '#88d8ff';
      ctx.shadowColor = 'rgba(136, 216, 255, 0.8)';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(0, -size*0.05);
      ctx.lineTo(size*0.08, size*0.05);
      ctx.lineTo(0, size*0.15);
      ctx.lineTo(-size*0.08, size*0.05);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.restore();
    }

    function drawJoystick() {
      // 底座
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.arc(joystick.baseX, joystick.baseY, joystick.baseRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 方向指示线
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(joystick.baseX - joystick.baseRadius * 0.6, joystick.baseY);
      ctx.lineTo(joystick.baseX + joystick.baseRadius * 0.6, joystick.baseY);
      ctx.moveTo(joystick.baseX, joystick.baseY - joystick.baseRadius * 0.6);
      ctx.lineTo(joystick.baseX, joystick.baseY + joystick.baseRadius * 0.6);
      ctx.stroke();

      // 摇杆头
      ctx.globalAlpha = joystick.active ? 0.9 : 0.7;
      const grad = ctx.createRadialGradient(
        joystick.knobX - 5, joystick.knobY - 5, 2,
        joystick.knobX, joystick.knobY, joystick.knobRadius
      );
      grad.addColorStop(0, 'rgba(224, 200, 120, 0.9)');
      grad.addColorStop(1, 'rgba(150, 120, 60, 0.9)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(joystick.knobX, joystick.knobY, joystick.knobRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore();
    }

    // ------------------- 虚拟摇杆事件 --------------------
    function getTouchFromEvent(e) {
      // 优先用 changedTouches（触发当前事件的手指），支持多点触控
      if (e.changedTouches && e.changedTouches.length > 0) {
        return e.changedTouches[0];
      }
      if (e.touches && e.touches.length > 0) {
        return e.touches[0];
      }
      return e; // 鼠标/指针事件
    }

    function getCanvasPos(e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const touch = getTouchFromEvent(e);
      const clientX = touch.clientX;
      const clientY = touch.clientY;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    }

    function getPointerId(e) {
      const touch = getTouchFromEvent(e);
      return touch.identifier !== undefined ? touch.identifier : (e.pointerId ?? 0);
    }

    function handleJoystickStart(e) {
      const pos = getCanvasPos(e);
      const dist = Math.hypot(pos.x - joystick.baseX, pos.y - joystick.baseY);
      if (dist < joystick.baseRadius * 1.5) {
        joystick.active = true;
        joystick.pointerId = getPointerId(e);
        handleJoystickMove(e);
        e.preventDefault();
      }
    }

    function handleJoystickMove(e) {
      if (!joystick.active) return;
      // 多点触控时，只处理属于摇杆的那根手指
      const pid = getPointerId(e);
      if (pid !== joystick.pointerId) return;
      const pos = getCanvasPos(e);
      let dx = pos.x - joystick.baseX;
      let dy = pos.y - joystick.baseY;
      const dist = Math.hypot(dx, dy);
      const maxDist = joystick.baseRadius - joystick.knobRadius * 0.3;

      if (dist > maxDist) {
        dx = (dx / dist) * maxDist;
        dy = (dy / dist) * maxDist;
      }

      joystick.knobX = joystick.baseX + dx;
      joystick.knobY = joystick.baseY + dy;
      joystick.dx = dx / maxDist;
      joystick.dy = dy / maxDist;
      e.preventDefault();
    }

    function handleJoystickEnd(e) {
      if (!joystick.active) return;
      // 多点触控时，只有摇杆对应的手指抬起才结束
      const pid = getPointerId(e);
      if (pid !== joystick.pointerId) return;
      joystick.active = false;
      joystick.pointerId = null;
      joystick.knobX = joystick.baseX;
      joystick.knobY = joystick.baseY;
      joystick.dx = 0;
      joystick.dy = 0;
    }

    // 工具: Canvas roundRect
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
      if (w < 2 * r) r = w / 2;
      if (h < 2 * r) r = h / 2;
      this.moveTo(x + r, y);
      this.lineTo(x + w - r, y);
      this.quadraticCurveTo(x + w, y, x + w, y + r);
      this.lineTo(x + w, y + h - r);
      this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      this.lineTo(x + r, y + h);
      this.quadraticCurveTo(x, y + h, x, y + h - r);
      this.lineTo(x, y + r);
      this.quadraticCurveTo(x, y, x + r, y);
      return this;
    };

    // ------------------- 动画循环 --------------------
    function tick() {
      updateHero();
      updateParticles();
      draw();
      animationFrame = requestAnimationFrame(tick);
    }

    // 把键盘更新加入动画循环
    const originalTick = tick;
    function gameLoop() {
      updateKeyboardInput();
      updateCharge();
      updateHero();
      updateMonsters();
      updateWindArrows();
      updateParticles();
      draw();
      animationFrame = requestAnimationFrame(gameLoop);
    }

    // 启动
    resetScene();
    if (animationFrame) cancelAnimationFrame(animationFrame);
    gameLoop();

    // ------------------- 事件绑定 --------------------
    document.getElementById('btnReset').addEventListener('click', () => {
      resetScene();
    });

    document.getElementById('btnWindArrow').addEventListener('mousedown', (e) => {
      e.preventDefault();
      startCharge();
    });
    document.getElementById('btnWindArrow').addEventListener('mouseup', (e) => {
      e.preventDefault();
      releaseCharge();
    });
    document.getElementById('btnWindArrow').addEventListener('mouseleave', () => {
      // 鼠标移出按钮时也算松开
      if (charge.active) releaseCharge();
    });
    // 触摸支持
    document.getElementById('btnWindArrow').addEventListener('touchstart', (e) => {
      e.preventDefault();
      startCharge();
    }, { passive: false });
    document.getElementById('btnWindArrow').addEventListener('touchend', (e) => {
      e.preventDefault();
      releaseCharge();
    });
    document.getElementById('btnWindArrow').addEventListener('touchcancel', () => {
      releaseCharge();
    });

    // 虚拟摇杆事件（鼠标+触摸）
    canvas.addEventListener('mousedown', handleJoystickStart);
    window.addEventListener('mousemove', handleJoystickMove);
    window.addEventListener('mouseup', handleJoystickEnd);

    canvas.addEventListener('touchstart', handleJoystickStart, { passive: false });
    canvas.addEventListener('touchmove', handleJoystickMove, { passive: false });
    canvas.addEventListener('touchend', handleJoystickEnd);
    canvas.addEventListener('touchcancel', handleJoystickEnd);

    // 键盘控制（WASD / 方向键）作为备选
    window.addEventListener('keydown', (e) => {
      keys[e.key.toLowerCase()] = true;
      // 空格蓄力
      if (e.key === ' ') {
        e.preventDefault();
        if (!e.repeat) { // 防止长按重复触发
          startCharge();
        }
      }
    });
    window.addEventListener('keyup', (e) => {
      keys[e.key.toLowerCase()] = false;
      // 松开发射
      if (e.key === ' ') {
        e.preventDefault();
        releaseCharge();
      }
    });

    // 每帧更新键盘方向到摇杆（如果摇杆未激活）
    function updateKeyboardInput() {
      if (joystick.active) return;
      let dx = 0, dy = 0;
      if (keys['w'] || keys['arrowup']) dy -= 1;
      if (keys['s'] || keys['arrowdown']) dy += 1;
      if (keys['a'] || keys['arrowleft']) dx -= 1;
      if (keys['d'] || keys['arrowright']) dx += 1;
      const mag = Math.hypot(dx, dy);
      if (mag > 0) {
        dx /= mag;
        dy /= mag;
      }
      joystick.dx = dx;
      joystick.dy = dy;
      // 同步摇杆头位置（视觉反馈）
      const maxDist = joystick.baseRadius - joystick.knobRadius * 0.3;
      joystick.knobX = joystick.baseX + dx * maxDist;
      joystick.knobY = joystick.baseY + dy * maxDist;
    }

    window.addEventListener('beforeunload', () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
    });

  })();

