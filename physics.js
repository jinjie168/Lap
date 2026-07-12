// ==========================================================================
// CORE PHYSICS ENGINE - MATTER.JS IMPLEMENTATION (核心物理引擎 - Matter.js 实现)
// ==========================================================================

// Global physics module aliases from Matter.js
// 从 Matter.js 引擎中提取全局物理模块别名
const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
      Bodies = Matter.Bodies,
      Composite = Matter.Composite,
      Events = Matter.Events,
      Vector = Matter.Vector;

let engine, render, runner;
let canvas, ctx;
let currentLevelData = null;

// Arrays to track game elements (用于追踪和管理游戏元素的数组)
let playerLines = [];      // Stores custom terrain lines drawn by the player (存储玩家画的魔法线条)
let liquidParticles = [];  // Stores all active flowing liquid balls (存储所有落下的药水粒子球)
let staticObstacles = [];  // Boundaries, static pegs, shelves (存储关卡自带的固定挡板、钉子)

let isDrawing = false;
let lastPointerPos = null;
let currentLinePoints = [];

/**
 * Initializes the full physics world on the Canvas
 * 在画布上初始化整个 Matter.js 物理世界，兼容电脑鼠标与 iPad 触控
 */
function initPhysicsWorld() {
    canvas = document.getElementById('physics-canvas');
    ctx = canvas.getContext('2d');
    
    // Auto-fit canvas size to current screen window (自动适配电脑或iPad屏幕尺寸)
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create the physics engine instance (创建物理引擎实例)
    engine = Engine.create({
        gravity: { y: 1.0, x: 0 } // Standard down-ward gravity (标准向下重力)
    });

    // Create custom renderer to handle glowing fluid graphics and glassmorphism UI
    // 创建自定义渲染器，用于后续绘制高水准的发光流体粒子
    render = Render.create({
        canvas: canvas,
        engine: engine,
        options: {
            width: canvas.width,
            height: canvas.height,
            wireframes: false, // Turn off wireframes for PVZ style visual (关闭线框模式，呈现真实美术视觉)
            background: 'transparent' // Background controlled by advanced CSS gradients
        }
    });

    Render.run(render);
    runner = Runner.create();
    Runner.run(runner, engine);

    // Setup user interaction listeners (同时监听电脑鼠标与iPad触控，实现双端兼容玩游戏)
    setupInteractionListeners();

    // Hook into engine collision active events for real-time color blending
    // 监听引擎的实时碰撞事件，用于处理双色水滴在半空中相撞变绿的蓝海核心机制
    Events.on(engine, 'collisionStart', handleColorBlending);
}

/**
 * Handles pointer press to start magical line drawing
 * 玩家点击或触摸屏幕，开始绘制具有“重量和重力塌陷”的魔法线条
 */
function startDrawingLine(x, y) {
    isDrawing = true;
    lastPointerPos = { x: x, y: y };
    currentLinePoints = [{ x: x, y: y }];
}

/**
 * Adds segment nodes while dragging mouse or finger
 * 在拖动鼠标或手指移动时，连续生成线段点
 */
function continueDrawingLine(x, y) {
    if (!isDrawing || !lastPointerPos) return;

    let dist = Vector.magnitude(Vector.sub({x: x, y: y}, lastPointerPos));
    
    // Only spawn a segment if pointer moved significantly (防止生成过多点导致iPad卡顿)
    if (dist > 12) {
        let currentPos = { x: x, y: y };
        
        // Create a small rigid physics rectangle segment (创建一个具有真实碰撞和摩擦力的物理长方体线段)
        let midPoint = Vector.div(Vector.add(lastPointerPos, currentPos), 2);
        let angle = Math.atan2(currentPos.y - lastPointerPos.y, currentPos.x - lastPointerPos.x);
        
        let lineSegment = Bodies.rectangle(midPoint.x, midPoint.y, dist + 2, 6, {
            isStatic: false,       // Hardcore feature: Lines are NOT frozen! They can collapse under fluid weight!
                                   // 硬核机制：线条具有实体重量，药水太重时会往下压塌塌陷！
            density: 0.05,
            friction: 0.1,
            label: 'player_line',
            render: { fillStyle: '#ebd59b', strokeStyle: '#ffdf7a', lineWidth: 1 } // Antique gold vine aesthetic (复古金色藤蔓视觉)
        });

        playerLines.push(lineSegment);
        Composite.add(engine.world, lineSegment);

        lastPointerPos = currentPos;
    }
}

function stopDrawingLine() {
    isDrawing = false;
    lastPointerPos = null;
}

/**
 * Core Blue Ocean Feature: Mixes Ice (Blue) and Lightning (Yellow) into Emerald Potion (Green)
 * 蓝海核心玩法：当蓝色冰元素球碰到黄色雷元素球，瞬间消除旧球并在碰撞点融合成全新的绿色药水球！
 */
function handleColorBlending(event) {
    let pairs = event.pairs;
    
    for (let i = 0; i < pairs.length; i++) {
        let bodyA = pairs[i].bodyA;
        let bodyB = pairs[i].bodyB;

        // Check if Body A and Body B are opposite elements (检查是否为蓝黄两色异元素相撞)
        if ((bodyA.label === 'element_blue' && bodyB.label === 'element_yellow') || 
            (bodyA.label === 'element_yellow' && bodyB.label === 'element_blue')) {
            
            // Calculate mid-point coordinates of the clash (计算相撞的空中中心点坐标)
            let clashX = (bodyA.position.x + bodyB.position.x) / 2;
            let clashY = (bodyA.position.y + bodyB.position.y) / 2;

            // Remove the raw ingredient elements safely from world (安全地从物理世界中移除原料小球)
            removeParticle(bodyA);
            removeParticle(bodyB);

            // Spawn the refined high-value emerald green ball (在相撞原位孵化出精致发光的绿色完美药水)
            spawnGreenPotion(clashX, clashY);
        }
    }
}

function spawnGreenPotion(x, y) {
    let greenBall = Bodies.circle(x, y, 7, {
        friction: 0.02,
        restitution: 0.4, // Slight bounce bounce feeling (轻微的Q弹果冻手感)
        label: 'element_green',
        render: {
            fillStyle: '#52d69b',
            shadowBlur: 10,       // Advanced CSS Glow (高级发光滤镜，绝不黑不青)
            shadowColor: '#52d69b'
        }
    });
    liquidParticles.push(greenBall);
    Composite.add(engine.world, greenBall);
}

function removeParticle(body) {
    Composite.remove(engine.world, body);
    let idx = liquidParticles.indexOf(body);
    if (idx > -1) liquidParticles.splice(idx, 1);
}

/**
 * Event bindings translating both iPad Safari touch and Desktop mouse into unified actions
 * 统一双端事件绑定：将 iPad 的 Touch 事件与电脑的 Mouse 事件无缝转化为游戏内部行为
 */
function setupInteractionListeners() {
    // Desktop Mouse events (电脑鼠标事件)
    canvas.addEventListener('mousedown', (e) => startDrawingLine(e.clientX, e.clientY));
    canvas.addEventListener('mousemove', (e) => continueDrawingLine(e.clientX, e.clientY));
    canvas.addEventListener('mouseup', () => stopDrawingLine());

    // iPad / Mobile Touch events (iPad/手机触控事件)
    canvas.addEventListener('touchstart', (e) => {
        let touch = e.touches[0];
        startDrawingLine(touch.clientX, touch.clientY);
    });
    canvas.addEventListener('touchmove', (e) => {
        let touch = e.touches[0];
        continueDrawingLine(touch.clientX, touch.clientY);
    });
    canvas.addEventListener('touchend', () => stopDrawingLine());
}

/**
 * Wipes out all drawn lines when player clicks "Clear Lines" button
 * 当玩家点击“清除画线”按钮时，瞬间清空所有历史物理笔迹，允许重画
 */
function clearAllDrawnLines() {
    playerLines.forEach(line => Composite.remove(engine.world, line));
    playerLines = [];
}
