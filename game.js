// ==========================================================================
// GAMEPLAY CONTROLLER & COMMERCIALIZATION (游戏控制核心与商业化系统)
// ==========================================================================

// Game state variables (游戏核心状态账本)
let playerGold = 500;
let playerEnergy = 5;
let currentActiveLevel = 1;
let alchemyCup = null; // Holds the live cup physics body (长着大嘴巴的活体圣杯物理实体)

// Initialize the game when window loads on iPad/PC
// 当电脑 or iPad 浏览器加载网页完毕，自动启动游戏
window.onload = function() {
    // Fire up the Matter.js physics engine from physics.js
    // 启动我们在 physics.js 里写好的物理世界
    initPhysicsWorld();
    
    // Bind UI button listeners (绑定按钮点击事件)
    document.getElementById('btn-clear-lines').addEventListener('click', clearAllDrawnLines);
    document.getElementById('btn-start-reaction').addEventListener('click', triggerChemicalReaction);
};

/**
 * Switches between "Outside" Lobby and "Inside" Levels smooth and fast
 * 丝滑切换“外面的大厅”和“里面的战场”
 * @param {string} sceneId - The ID of the target div layer
 */
function switchToScene(sceneId) {
    // Hide all layers first (先隐藏所有图层)
    document.getElementById('main-lobby').classList.add('hidden');
    document.getElementById('level-selection').classList.add('hidden');
    document.getElementById('gameplay-arena').classList.add('hidden');

    // Reveal the requested layer (单独把要去的层显示出来)
    document.getElementById(sceneId).classList.remove('hidden');
}

/**
 * Enters a specific level and setups alchemist environment
 * 玩家点击关卡，扣除体力，并部署关卡地形、活体圣杯与史莱姆
 */
function startActualLevel(levelNum) {
    if (playerEnergy <= 0) {
        alert("Out of energy! Watch an ad in lobby to recharge");
        return;
    }

    playerEnergy--;
    document.getElementById('energy-amount').innerText = playerEnergy + "/5";
    currentActiveLevel = levelNum;

    // Transition to the inside arena (镜头切入“里面”战场)
    switchToScene('gameplay-arena');

    // Build the Alchemist's live cup at the bottom center of screen
    // 在屏幕底部正中央，建造一个长着大嘴巴的活体圣杯物理实体
    buildAlchemyCupMesh();
}

function buildAlchemyCupMesh() {
    let centerX = window.innerWidth / 2;
    let bottomY = window.innerHeight - 120;

    // Assemble the cup using 3 solid invisible bars to hold liquid balls
    // 用 3 块刚体木板组合拼接成一个开口向上的 U 型药水杯体
    let leftWall  = Bodies.rectangle(centerX - 60, bottomY - 30, 10, 80, { isStatic: true, label: 'cup' });
    let rightWall = Bodies.rectangle(centerX + 60, bottomY - 30, 10, 80, { isStatic: true, label: 'cup' });
    let cupBottom = Bodies.rectangle(centerX, bottomY, 130, 15, { isStatic: true, label: 'cup' });

    alchemyCup = [leftWall, rightWall, cupBottom];
    Composite.add(engine.world, alchemyCup);
}

/**
 * Reanimates the Raven Droppers to pour out Yellow and Blue drops!
 * 点击开始，顶部源头开始像瀑布一样源源不断喷出蓝色和黄色液体粒子
 */
function triggerChemicalReaction() {
    let centerX = window.innerWidth / 2;
    
    // Spawn 25 Blue drops from the Left Dropper (左边吐出25颗蓝色冰元素小球)
    for(let i = 0; i < 25; i++) {
        setTimeout(() => {
            let drop = Bodies.circle(centerX - 100, 80, 7, {
                label: 'element_blue',
                render: { fillStyle: '#1e88e5' }
            });
            liquidParticles.push(drop);
            Composite.add(engine.world, drop);
        }, i * 60); // Streamed dropping interval (时差分流下落)
    }

    // Spawn 25 Yellow drops from the Right Dropper (右边吐出25颗黄色雷元素小球)
    for(let i = 0; i < 25; i++) {
        setTimeout(() => {
            let drop = Bodies.circle(centerX + 100, 80, 7, {
                label: 'element_yellow',
                render: { fillStyle: '#fbc02d' }
            });
            liquidParticles.push(drop);
            Composite.add(engine.world, drop);
        }, i * 60);
    }

    // Trigger score calculation after 6 seconds of physics flow
    // 6秒钟后，当药水流得差不多了，自动启动纯度判定逻辑
    setTimeout(evaluateLevelScore, 6500);
}

/**
 * High水准 core algorithm: Scans what fell inside the cup and determines win/fail
 * 高水准核心算法：扫描到底有多少绿球掉进了圣杯。如果纯度不够，触发广告复活机制
 */
function evaluateLevelScore() {
    let greenCount = 0;
    let foreignCount = 0; // Impurities like raw blue/yellow balls (没相撞成功、流进杯里的杂质蓝黄球)

    liquidParticles.forEach(particle => {
        // If particle is resting at the bottom area (圣杯高度检测)
        if (particle.position.y > window.innerHeight - 170) {
            if (particle.label === 'element_green') greenCount++;
            if (particle.label === 'element_blue' || particle.label === 'element_yellow') foreignCount++;
        }
    });

    let totalInCup = greenCount + foreignCount;
    let purity = totalInCup > 0 ? (greenCount / totalInCup) * 100 : 0;

    if (purity >= 80) {
        // Success: reward player gold (通关成功，赚取金币)
        playerGold += 200;
        document.getElementById('gold-amount').innerText = playerGold;
        alert(`🔮 ALCHEMY SUCCESS! Purity: ${purity.toFixed(0)}%. Earned 200 Gold!`);
        exitCurrentLevel();
    } else {
        // Failure: Pop open the High-end Rewarded Ad glass window
        // 纯度不足通关失败：立刻弹出精心设计的“看广告时间倒流5秒”的复活窗口！
        document.getElementById('revive-modal').classList.remove('hidden');
    }
}

/**
 * COMMERCIAL MARKETING MODULE (广告变现触发中枢 - 负责派发金币和时间沙漏)
 */
function triggerLobbyAd(adRewardType) {
    console.log("Triggering Lobby Ad Platform Alliance SDK...");
    
    // Play artificial ad block (模拟全屏视频广告播放)
    alert("Watching commercial video ad...");
    
    setTimeout(() => {
        if (adRewardType === 'FREE_GOLD') {
            playerGold += 500;
            document.getElementById('gold-amount').innerText = playerGold;
            alert("🪙 Gold rewarded successfully via ad!");
        }
    }, 1500);
}

function triggerGameplayAd(adRewardType) {
    if (adRewardType === 'REVIVE') {
        alert("Rewinding time magic active via ad... ");
        
        setTimeout(() => {
            // Hide failure screen (关闭爆炸失败遮罩)
            document.getElementById('revive-modal').classList.add('hidden');
            
            // Clear all failed mixed particles but keep drawn lines!
            // 机制爽点：清除满地废药水粒子，但保留玩家辛苦画好的线，直接重赛！
            liquidParticles.forEach(p => Composite.remove(engine.world, p));
            liquidParticles = [];
            
            alert("⏳ Time rewound! Lines preserved. You can edit and press START REACTION again! (时空已倒流！画线已保留，请修改并重新点击开始！)");
        }, 1500);
    }
}

function resetLevelEntirely() {
    document.getElementById('revive-modal').classList.add('hidden');
    exitCurrentLevel();
}

function exitCurrentLevel() {
    // Safe memory cleaner (退出关卡时清空物理画布，防止iPad浏览器内存泄漏崩溃)
    clearAllDrawnLines();
    liquidParticles.forEach(p => Composite.remove(engine.world, p));
    if (alchemyCup) alchemyCup.forEach(bar => Composite.remove(engine.world, bar));
    liquidParticles = [];
    
    switchToScene('level-selection');
}
