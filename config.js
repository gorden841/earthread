// ============================================================
// 《元素厚度》游戏配置文件
// ------------------------------------------------------------
// 所有可调整的参数集中在此，修改后刷新页面即可生效。
// 帧数换算参考：60 帧 ≈ 1 秒。
// 注意：画布显示尺寸会自动适配窗口（任意屏幕比例下完整显示
//       地图+摇杆），渲染分辨率随显示尺寸与设备像素比自动调整。
// ============================================================
window.GAME_CONFIG = {

  // ==================== 世界与地形 ====================
  world: {
    cols: 32,        // 地图列数（横向瓦片数）
    rows: 24,        // 地图行数（纵向瓦片数）
    tileSize: 25,    // 单个瓦片边长（像素）
  },
  terrain: {
    baseThickness: 5,  // 初始元素厚度（半边沙 / 半边冰）
    maxThickness: 9,   // 元素厚度上限（堆积不可超过）
  },
  // 地形渲染配色（HSL）
  terrainRender: {
    sandH: 34, sandS: 48, sandL: 58,   // 沙色 HSL
    iceH: 195, iceS: 62, iceL: 70,     // 冰色 HSL
    maxLightFactor: 1.3,               // 厚度为 0 时的亮度倍数（最亮）
    minLightFactor: 0.6,               // 厚度达上限时的亮度倍数（最暗）
  },

  // ==================== 渲染 ====================
  render: {
    maxPixelRatio: 2,  // 渲染分辨率上限（×设备像素比；1=与逻辑分辨率一致，越大越清晰越耗性能）
  },

  // ==================== 帧率（固定逻辑步长） ====================
  // 高刷屏（120/144Hz，微信内置浏览器常见）下 requestAnimationFrame 每秒触发次数更多，
  // 逻辑更新必须按真实时间固定步长推进，否则游戏会成倍加速。
  frame: {
    fps: 60,              // 逻辑帧率：所有按帧推进的数值（速度/前摇/粒子寿命）都以此为准
    maxDeltaMs: 100,      // 单帧时间差上限（毫秒）：切后台/卡顿回来不会快进爆发
    maxCatchupSteps: 4,   // 单次刷新最多补跑的逻辑步数（防止低帧率时的死亡螺旋）
  },

  // ==================== 主角 ====================
  hero: {
    size: 0.95,                // 体型（相对瓦片的比例）
    speed: 2.2,                // 基础移动速度（像素/帧）
    maxHp: 100,                // 最大生命值
    invincibleFrames: 50,      // 受击后无敌帧数（50帧 ≈ 0.83秒）
    blinkInterval: 4,          // 无敌期间闪烁间隔（帧，越小闪越快）
    hurtFlashFrames: 20,       // 受击红屏持续帧数
    hurtKnockbackSpeed: 5,     // 受击击退初速度（像素/帧）
    hurtKnockbackFriction: 0.75, // 受击击退速度每帧衰减系数
    hurtParticles: 10,         // 受击时红色粒子数量
    deathBurstParticles: 30,   // 阵亡时爆发粒子数量
    dashDuration: 48,          // 完美蓄力冲刺总时长（48帧 ≈ 0.8秒）
    dashMulMax: 2.0,           // 冲刺初始速度倍率（线性衰减到 1）
    chargeSlowMul: 0.5,        // 蓄力期间的移动速度倍率
    footParticleChance: 0.15,  // 行走时脚下元素粒子触发概率（0~1）
    speedLineChance: 0.8,      // 冲刺时速度线粒子触发概率（0~1）
    afterimageLife: 10,        // 冲刺残影寿命（帧）
  },

  // ==================== 蓄力（风箭） ====================
  charge: {
    duration: 48,              // 蓄满所需帧数（48帧 ≈ 0.8秒）
    perfectWindowFrames: 12,   // 完美蓄力窗口：蓄满后该帧数内松开算完美（12帧 ≈ 0.2秒）
    absorbRateBase: 0.2,       // 蓄力吸收粒子基础触发概率
    absorbRateGain: 0.5,       // 蓄满时额外增加的触发概率（实际 = base + 进度×gain）
    readyBurstParticles: 25,   // 蓄满瞬间环形爆发粒子数量
    readyShockParticles: 12,   // 蓄满瞬间高速冲击波粒子数量
    minDragDistance: 8,        // 触发瞄准的最小拖动距离（像素，低于此值按主角面向发射）
    aimPreviewLength: 70,      // 蓄力时发射方向预览箭头长度（像素）
  },

  // ==================== 风箭 ====================
  windArrow: {
    damage: 25,                // 普通风箭伤害
    perfectDamage: 50,         // 完美蓄力风箭伤害
    baseSpeed: 9,              // 基础飞行速度（像素/帧）
    perfectSpeedMul: 1.6,      // 完美蓄力：飞行速度倍率
    perfectSpreadMul: 1.4,     // 完美蓄力：地面扩散范围倍率
    perfectKnockbackMul: 1.7,  // 完美蓄力：击退力度倍率
    maxLife: 120,              // 最大存活帧数（超时消失）
    missEdgeSpreadMul: 0.7,    // 未命中时在飞行终点（世界边缘/超时点）的弱化扩散倍率（侵蚀+堆积，总量守恒）
    hitRadiusMul: 0.7,         // 命中判定半径（× 瓦片边长）
    knockbackSpeed: 7.5,       // 命中时基础击退初速度（× 击退倍率）
    hitIntensity: 1.5,         // 普通命中的元素粒子强度系数
    perfectHitIntensity: 3.0,  // 完美蓄力命中的元素粒子强度系数
    launchBurstNormal: 6,      // 发射瞬间粒子数量（普通）
    launchBurstPerfect: 10,    // 发射瞬间粒子数量（完美）
    trailCountNormal: 1,       // 每帧轨迹粒子数（普通）
    trailCountPerfect: 2,      // 每帧轨迹粒子数（完美）
    trailWidthNormal: 5,       // 轨迹粒子横向散布宽度（普通）
    trailWidthPerfect: 8,      // 轨迹粒子横向散布宽度（完美）
  },

  // ==================== 怪物通用 ====================
  monsterShared: {
    knockbackFriction: 0.85,   // 被击退后速度每帧衰减系数（越小停得越快）
    kbInterruptSpeed: 2.2,     // 击退速度高于该值时怪物无法行动并打断攻击前摇
    separationDistFactor: 0.35,// 怪物间防重叠距离（× 双方体型之和 × 瓦片边长）
    separationPush: 0.3,       // 怪物重叠时每帧互相推开的比例
    attackPileRadius: 2.5,     // 怪物攻击释放时，侵蚀的元素堆积在玩家附近的半径（格；被打断则归还在怪物自身周围）
    distanceFalloff: 0.6,      // 距离衰减系数：侵蚀/堆积权重 = 1 - 距中心格距/半径 × 该值（中心 1 → 边缘 0.4，越靠中心越强）
  },

  // ==================== 沙虫（近战：潜沙突袭/沙暴新星） ====================
  sandworm: {
    element: 'sand',           // 元素属性：免疫同元素的地形扩散伤害（沙虫免疫沙元素）
    size: 1.4,                 // 体型（相对瓦片的比例）
    hp: 75,                    // 生命值
    moveSpeed: 0.85,           // 追踪移动速度（像素/帧）
    // 地形攻击机制：前摇期间只从周围瓦片侵蚀自身元素（沙，靠中心侵蚀越快），伤害 = 基础伤害 + 侵蚀量 × 加伤系数
    attackErodeRadius: 3,      // 前摇侵蚀自身周围瓦片的半径（格）
    attackBaseDamage: 7,       // 基础伤害（没吸到元素时也有；散射等同样适用该保底）
    attackErodeTotal: 14,      // 每次前摇的目标侵蚀总量（加伤上限来源）
    attackDamagePerEroded: 0.5,// 侵蚀加伤系数（满侵蚀总伤 = 7 + 14×0.5 ≈ 14，与原固定伤害持平）
    attackRange: 30,           // 触发突袭前摇的距离（像素）
    attackWindupMax: 30,       // 前摇时长（下压蓄力+红光预警，帧；加长便于预判走位）
    firstAttackDelay: 40,      // 开局首次攻击前的准备帧数
    attackCooldownMax: 70,     // 两次攻击之间的间隔帧数
    approachStopGap: 6,        // 距离小于（攻击范围 - 该值）时不再前进
    // 突进：前摇结束时朝「前摇开始时锁定的方向」冲刺，可提前走位躲开
    lungeDistance: 90,         // 突进距离（像素）
    lungeFrames: 12,           // 突进持续帧数（突进速度 = 距离 ÷ 帧数）
    lungeHitRadius: 26,        // 突进途中触碰到主角的判定半径（像素）
    // 沙暴新星：每第 novaEvery 次攻击替换突进，以自身为中心的环形爆发（伤害 = 基础 + 侵蚀加伤）
    novaEvery: 3,              // 攻击轮换：每第 3 次攻击为沙暴新星（其余为突进）
    novaRadius: 68,            // 新星判定半径（像素，预警期间走出即可躲避）
    novaWindupMax: 40,         // 新星前摇时长（帧，大范围沙粒吸入预警）
    novaBurstParticles: 26,    // 新星爆发环形粒子数量
  },

  // ==================== 冰晶蝶（远程：扇形散射/天降冰锥） ====================
  icefly: {
    element: 'ice',            // 元素属性：免疫同元素的地形扩散伤害（冰晶蝶免疫冰元素）
    size: 1.3,                 // 体型（相对瓦片的比例）
    hp: 50,                    // 生命值
    moveSpeed: 1.3,            // 移动速度（像素/帧）
    preferredRange: 150,       // 期望与主角保持的距离（像素）
    approachGap: 20,           // 距离超过 preferredRange + 该值 时接近
    retreatGap: 40,            // 距离小于 preferredRange - 该值 时后撤
    retreatSpeedMul: 0.7,      // 后撤速度倍率
    orbitSpeedMul: 0.5,        // 合适距离时侧向盘旋的速度倍率
    attackDetectExtra: 130,    // 攻击触发距离 = preferredRange + 该值
    // 地形攻击机制：前摇期间只从周围瓦片侵蚀自身元素（冰，靠中心侵蚀越快），伤害 = 基础伤害 + 侵蚀量 × 加伤系数
    attackErodeRadius: 3,      // 前摇侵蚀自身周围瓦片的半径（格）
    attackBaseDamage: 5,       // 基础伤害（没吸到元素时也有；散射/冰锥共用该保底）
    attackErodeTotal: 10,      // 每次前摇的目标侵蚀总量（加伤上限来源）
    attackDamagePerEroded: 0.3,// 侵蚀加伤系数（满侵蚀总伤 = 5 + 10×0.3 ≈ 8，与原固定伤害持平）
    // 扇形齐射：一次发射多枚冰刺；主角受击无敌帧保证单次齐射至多命中一发
    boltCount: 3,              // 每次齐射冰刺数量
    boltSpreadDeg: 24,         // 扇形总展开角度（度）
    boltSpeed: 4.2,            // 冰刺飞行速度（像素/帧）
    attackWindupMax: 26,       // 攻击前摇时长（冰晶环绕凝聚，帧）
    firstAttackDelay: 70,      // 开局首次攻击前的准备帧数
    attackCooldownMax: 95,     // 两次攻击之间的间隔帧数
    floatPhaseSpeed: 0.06,     // 悬浮动画相位增速（越大浮动越快）
    // 天降冰锥：每第 spikeEvery 次攻击替换散射，锁定主角脚下区域落冰锥（伤害 = 基础 + 侵蚀加伤）
    spikeEvery: 2,             // 攻击轮换：每第 2 次攻击为天降冰锥（其余为散射）
    spikeRadius: 45,           // 冰锥落点判定半径（像素，地面红圈警示范围）
    spikeDelay: 45,            // 警示圈停留帧数（之后冰锥才开始落下）
    spikeFallFrames: 18,       // 冰锥下落帧数（越大落地越慢）
  },

  // ==================== 敌方弹道（冰刺） ====================
  enemyBolt: {
    maxLife: 180,              // 最大存活帧数
    missEdgeSpreadMul: 0.6,    // 冰刺未命中主角时在飞行终点的弱化扩散倍率（侵蚀+堆积，总量守恒）
    hitRadius: 15,             // 命中主角的判定半径（像素）
    trailChance: 0.5,          // 每帧拖尾粒子触发概率（0~1）
    launchSparks: 6,           // 发射瞬间微光粒子数量
  },

  // ==================== 风箭对地面的扩散侵蚀 ====================
  erosion: {
    perpRadius: 5,             // 侵蚀椭圆垂直方向半长轴（格，长轴）
    trailRadius: 1.8,          // 侵蚀椭圆轨迹方向半短轴（格，短轴）
    strength: 0.45,            // 侵蚀强度（中心处，向边缘递减）
    pileLayers: 3,             // 侵蚀区外的堆积层数
    burstParticles: 30,        // 侵蚀带喷出的粒子数量
    shockParticles: 15,        // 中心冲击粒子数量
    damageFactor: 1.0,         // 侵蚀伤害系数：场内怪物受到 直伤×侵蚀程度×该系数 的额外伤害（侵蚀程度中心=1、边缘=0.4，最终不超过直伤；0 = 关闭）
    terrainDamageMulMax: 0.5,  // 地形扩散伤害倍率上限（×直伤）：基于怪物所在瓦片被侵蚀/堆积的累计厚度，独立于侵蚀场风伤、可叠加；同元素免疫
    terrainFullDelta: 4,       // 累计厚度变化达到该值时地形伤害倍率封顶（初始厚度5、堆积上限9，中心约3箭侵蚀即满）
  },

  // ==================== 完美蓄力命中爆发 ====================
  perfectHitBurst: {
    ringCount: 22,             // 环形冲击波粒子数量
    sparkCount: 12,            // 顺风白色火花数量
    glowCount: 5,              // 中心大光晕粒子数量
  },

  // ==================== 通用特效 ====================
  effects: {
    sandDustBaseCount: 8,      // 沙尘基础数量（实际 = 基础 × 强度系数）
    iceShardBaseCount: 6,      // 冰屑基础数量（实际 = 基础 × 强度系数）
    monsterDeathIntensity: 3.2,// 怪物死亡时元素粒子强度系数
    monsterDeathGlow: 14,      // 怪物死亡时白色光晕粒子数量
  },

  // ==================== HUD 与血条 ====================
  hud: {
    heroBarWidth: 220,         // 主角血条宽度（像素）
    heroBarHeight: 18,         // 主角血条高度（像素）
    heroBarX: 16,              // 主角血条左上角 X（像素）
    heroBarY: 16,              // 主角血条左上角 Y（像素）
    monsterBarHeight: 5,       // 怪物头顶血条高度（像素）
    monsterBarMinWidth: 34,    // 怪物血条最小宽度（像素）
    monsterBarWidthFactor: 0.95, // 怪物血条宽度（× 体型 × 瓦片边长）
    lowHpThreshold: 0.3,       // 血量低于该比例显示红色
    midHpThreshold: 0.6,       // 血量低于该比例显示黄色
  },

  // ==================== 虚拟摇杆 ====================
  joystick: {
    baseX: 70,                 // 摇杆底盘中心 X（像素）
    baseY: 530,                // 摇杆底盘中心 Y（像素）
    baseRadius: 45,            // 摇杆底盘半径（像素）
    knobRadius: 22,            // 摇杆球头半径（像素）
  },
};
