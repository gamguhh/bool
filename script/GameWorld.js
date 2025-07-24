"use strict";

function GameWorld() {

    this.whiteBallStartingPosition = new Vector2(413,413);

    this.redBalls = [
    new Ball(new Vector2(1056,433),Color.red),//3
    new Ball(new Vector2(1090,374),Color.red),//4
    new Ball(new Vector2(1126,393),Color.red),//8
    new Ball(new Vector2(1126,472),Color.red),//10;
    new Ball(new Vector2(1162,335),Color.red),//11
    new Ball(new Vector2(1162,374),Color.red),//12
    new Ball(new Vector2(1162,452),Color.red)//14
    ]

    this.yellowBalls = [
    new Ball(new Vector2(1022,413),Color.yellow),//1
    new Ball(new Vector2(1056,393),Color.yellow),//2
    new Ball(new Vector2(1090,452),Color.yellow),//6
    new Ball(new Vector2(1126,354),Color.yellow),//7
    new Ball(new Vector2(1126,433),Color.yellow),//9
    new Ball(new Vector2(1162,413),Color.yellow),//13
    new Ball(new Vector2(1162,491),Color.yellow)//15
    ];

    this.whiteBall = new Ball(new Vector2(413,413),Color.white);
    this.blackBall = new Ball(new Vector2(1090,413),Color.black);

    this.balls = [
    this.yellowBalls[0],
    this.yellowBalls[1],
    this.redBalls[0],
    this.redBalls[1],
    this.blackBall,
    this.yellowBalls[2],
    this.yellowBalls[3],
    this.redBalls[2],
    this.yellowBalls[4],
    this.redBalls[3],
    this.redBalls[4],
    this.redBalls[5],
    this.yellowBalls[5],
    this.redBalls[6],
    this.yellowBalls[6],
    this.whiteBall]

    this.stick = new Stick({ x : 413, y : 413 });

    this.gameOver = false;
}

GameWorld.prototype.getBallsSetByColor = function(color){

    if(color === Color.red){
        return this.redBalls;
    }
    if(color === Color.yellow){
        return this.yellowBalls;
    }
    if(color === Color.white){
        return this.whiteBall;
    }
    if(color === Color.black){
        return this.blackBall;
    }
}

GameWorld.prototype.handleInput = function (delta) {
    this.stick.handleInput(delta);
};

GameWorld.prototype.update = function (delta) {
    this.stick.update(delta);

    for (var i = 0 ; i < this.balls.length; i++){
        for(var j = i + 1 ; j < this.balls.length ; j++){
            this.handleCollision(this.balls[i], this.balls[j], delta);
        }
    }

    for (var i = 0 ; i < this.balls.length; i++) {
        this.balls[i].update(delta);
    }

    if(!this.ballsMoving() && AI.finishedSession){
        Game.policy.updateTurnOutcome();
        if(Game.policy.foul){
            this.ballInHand();
        }
    }

};

GameWorld.prototype.ballInHand = function(){
    if(AI_ON && Game.policy.turn === AI_PLAYER_NUM){
        return;
    }

    KEYBOARD_INPUT_ON = false;
    this.stick.visible = false;
    if(!Mouse.left.down){
        this.whiteBall.position = Mouse.position;
    }
    else{
        let ballsOverlap = this.whiteBallOverlapsBalls();

        if(!Game.policy.isOutsideBorder(Mouse.position,this.whiteBall.origin) &&
            !Game.policy.isInsideHole(Mouse.position) &&
            !ballsOverlap){
            KEYBOARD_INPUT_ON = true;
            Keyboard.reset();
            Mouse.reset();
            this.whiteBall.position = Mouse.position;
            this.whiteBall.inHole = false;
            Game.policy.foul = false;
            this.stick.position = this.whiteBall.position;
            this.stick.visible = true;
        }
    }

}

GameWorld.prototype.whiteBallOverlapsBalls = function(){

    let ballsOverlap = false;
    for (var i = 0 ; i < this.balls.length; i++) {
        if(this.whiteBall !== this.balls[i]){
            if(this.whiteBall.position.distanceFrom(this.balls[i].position)<BALL_SIZE){
                ballsOverlap = true;
            }
        }
    }

    return ballsOverlap;
}

GameWorld.prototype.ballsMoving = function(){

    var ballsMoving = false;

    for (var i = 0 ; i < this.balls.length; i++) {
        if(this.balls[i].moving){
            ballsMoving = true;
        }
    }

    return ballsMoving;
}

GameWorld.prototype.handleCollision = function(ball1, ball2, delta){

    if(ball1.inHole || ball2.inHole)
        return;

    if(!ball1.moving && !ball2.moving)
        return;

    var ball1NewPos = ball1.position.add(ball1.velocity.multiply(delta));
    var ball2NewPos = ball2.position.add(ball2.velocity.multiply(delta));

    var dist = ball1NewPos.distanceFrom(ball2NewPos);

    if(dist < BALL_SIZE){
        Game.policy.checkColisionValidity(ball1, ball2);

        // فيزياء اصطدام أكثر واقعية
        var dx = ball2.position.x - ball1.position.x;
        var dy = ball2.position.y - ball1.position.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        
        // تطبيع متجه الاصطدام
        var normalX = dx / distance;
        var normalY = dy / distance;
        
        // السرعة النسبية
        var relativeVelX = ball1.velocity.x - ball2.velocity.x;
        var relativeVelY = ball1.velocity.y - ball2.velocity.y;
        
        // سرعة الاصطدام على المحور العادي
        var velAlongNormal = relativeVelX * normalX + relativeVelY * normalY;
        
        // إذا كانت الكرات تبتعد عن بعضها، لا حاجة لحل الاصطدام
        if(velAlongNormal > 0) return;
        
        // معامل الارتداد
        var restitution = 0.9;
        
        // قوة الاندفاع
        var impulse = 2 * velAlongNormal / (ball1.mass + ball2.mass);
        
        // تطبيق الاندفاع
        ball1.velocity.x -= impulse * ball2.mass * normalX;
        ball1.velocity.y -= impulse * ball2.mass * normalY;
        ball2.velocity.x += impulse * ball1.mass * normalX;
        ball2.velocity.y += impulse * ball1.mass * normalY;
        
        // تطبيق معامل الارتداد
        ball1.velocity.multiplyWith(restitution);
        ball2.velocity.multiplyWith(restitution);
        
        ball1.moving = true;
        ball2.moving = true;

        // تشغيل صوت الاصطدام
        if(Game.sound && SOUND_ON){
            var ballsCollide = sounds.ballsCollide.cloneNode(true);
            var impactStrength = Math.abs(velAlongNormal) / 50;
            ballsCollide.volume = Math.min(impactStrength, 1);
            ballsCollide.play();
        }
        
        // فصل الكرات إذا كانت متداخلة
        var overlap = BALL_SIZE - distance;
        if(overlap > 0) {
            var separateX = normalX * overlap * 0.5;
            var separateY = normalY * overlap * 0.5;
            ball1.position.x -= separateX;
            ball1.position.y -= separateY;
            ball2.position.x += separateX;
            ball2.position.y += separateY;
        }
    }

}

GameWorld.prototype.draw = function () {
    Canvas2D.drawImage(sprites.background);
    Game.policy.drawScores();

    for (var i = 0; i < this.balls.length; i++) {
        this.balls[i].draw();
    }

    this.stick.draw();
    
    // رسم مؤشرات اللعبة
    this.drawGameIndicators();
};

GameWorld.prototype.drawGameIndicators = function() {
    // رسم مؤشر دور اللاعب
    this.drawPlayerTurnIndicator();
    
    // رسم حالة الكرة البيضاء إذا كانت في اليد
    if(Game.policy.foul) {
        this.drawBallInHandIndicator();
    }
    
    // رسم معلومات القوة والزاوية
    if(this.stick.visible && !Game.policy.turnPlayed) {
        this.drawAimingInfo();
    }
};

GameWorld.prototype.drawPlayerTurnIndicator = function() {
    var indicatorText = "Player " + (Game.policy.turn + 1) + "'s Turn";
    var indicatorColor = Game.policy.turn === 0 ? "yellow" : "red";
    
    Canvas2D.drawText(indicatorText, new Vector2(Game.size.x/2, 30), 
                     new Vector2(0, 0), indicatorColor, "center", "Arial", "24px");
    
    // رسم سهم يشير للاعب الحالي
    var arrowX = Game.policy.turn === 0 ? 100 : Game.size.x - 100;
    var arrowY = 60;
    this.drawArrow(arrowX, arrowY, indicatorColor);
};

GameWorld.prototype.drawArrow = function(x, y, color) {
    // رسم سهم بسيط
    Canvas2D.drawLine(x - 20, y, x + 20, y, color, 3);
    Canvas2D.drawLine(x + 15, y - 10, x + 20, y, color, 3);
    Canvas2D.drawLine(x + 15, y + 10, x + 20, y, color, 3);
};

GameWorld.prototype.drawBallInHandIndicator = function() {
    Canvas2D.drawText("Ball in Hand - Click to place", 
                     new Vector2(Game.size.x/2, Game.size.y - 50), 
                     new Vector2(0, 0), "white", "center", "Arial", "18px");
};

GameWorld.prototype.drawAimingInfo = function() {
    if(!this.stick.trackMouse) return;
    
    // عرض الزاوية
    var angle = this.stick.rotation * (180 / Math.PI);
    if(angle < 0) angle += 360;
    
    var angleText = "Angle: " + Math.round(angle) + "°";
    Canvas2D.drawText(angleText, new Vector2(Game.size.x - 150, Game.size.y - 80), 
                     new Vector2(0, 0), "white", "left", "Arial", "14px");
    
    // عرض المسافة من الماوس للكرة البيضاء
    var distance = Mouse.position.distanceFrom(this.whiteBall.position);
    var distanceText = "Distance: " + Math.round(distance) + "px";
    Canvas2D.drawText(distanceText, new Vector2(Game.size.x - 150, Game.size.y - 60), 
                     new Vector2(0, 0), "white", "left", "Arial", "14px");
};

GameWorld.prototype.reset = function () {
    this.gameOver = false;

    for (var i = 0; i < this.balls.length; i++) {
        this.balls[i].reset();
    }

    this.stick.reset();

    if(AI_ON && AI_PLAYER_NUM === 0){
        AI.startSession();
    }
};

GameWorld.prototype.initiateState = function(balls){
    
    for (var i = 0; i < this.balls.length; i++) {
        this.balls[i].position.x = balls[i].position.x;
        this.balls[i].position.y = balls[i].position.y;
        this.balls[i].visible = balls[i].visible;
        this.balls[i].inHole = balls[i].inHole;
    }

    this.stick.position = this.whiteBall.position;
}

