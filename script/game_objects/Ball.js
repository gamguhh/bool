"use strict";

function Ball(initPos,color){
	this.initPos = initPos;
    this.position = initPos.copy();
    this.origin = new Vector2(25,25);
    this.velocity = Vector2.zero;
    this.color = color; 
    this.moving = false;
    this.visible = true;
    this.inHole = false;
    this.friction = 0.98;
    this.minVelocity = 0.5;
    this.mass = 1.0;
    this.restitution = 0.85; // معامل الارتداد
}

Object.defineProperty(Ball.prototype, "color",
    {
    	get: function(){
    		if(this.sprite == sprites.redBall){
    			return Color.red;
    		}
    		else if(this.sprite == sprites.yellowBall){
    			return Color.yellow;
    		}
			else if(this.sprite == sprites.blackBall){
    			return Color.black;
    		}
    		else{
    			return Color.white;
    		}
    	},
        set: function (value) {
            if (value === Color.red){
                this.sprite = sprites.redBall;
            }
            else if(value == Color.yellow){
            	this.sprite = sprites.yellowBall;
            }
			else if(value == Color.black){
            	this.sprite = sprites.blackBall;
            }
            else{
            	this.sprite = sprites.ball;
            }
        }
    });

Ball.prototype.shoot = function(power, angle){
    if(power <= 0)
        return;

    this.moving = true;

    // تحسين حساب السرعة لتكون أكثر واقعية
    var maxVelocity = 120;
    var velocityMultiplier = (power / 100) * maxVelocity;
    this.velocity = new Vector2(
        Math.cos(angle) * velocityMultiplier,
        Math.sin(angle) * velocityMultiplier
    );
}

Ball.prototype.update = function(delta){
    this.updatePosition(delta);
    
    // تطبيق الاحتكاك بشكل أكثر واقعية
    if(this.moving) {
        this.velocity.multiplyWith(this.friction);
        
        // إيقاف الكرة إذا كانت السرعة صغيرة جداً
        if(this.velocity.length < this.minVelocity){
            this.stop();
        }
    }
}

Ball.prototype.updatePosition = function(delta){

    if(!this.moving || this.inHole)
        return;
    var ball = this;
    var newPos = this.position.add(this.velocity.multiply(delta));

	if(Game.policy.isInsideHole(newPos)){
        if(Game.sound && SOUND_ON){
            var holeSound = sounds.hole.cloneNode(true);
            holeSound.volume = 0.5;
            holeSound.play();
        }
        
        // تأثير بصري عند دخول الكرة في الجيب
        this.createPocketEffect();
        
		this.position = newPos;
        this.inHole = true;
        setTimeout(function(){ball.visible=false;ball.velocity = Vector2.zero;}, 100);
        Game.policy.handleBallInHole(this);
		return;
	}

    var collision = this.handleCollision(newPos);

    if(collision){
        // تقليل السرعة عند الاصطدام مع الحواف
		this.velocity.multiplyWith(this.restitution);
		
		// تأثير بصري للاصطدام
		this.createWallHitEffect();
    }else{
    	this.position = newPos;
    }
}

Ball.prototype.handleCollision = function(newPos){

	var collision = false;

	if(Game.policy.isXOutsideLeftBorder(newPos, this.origin)){
        this.velocity.x = -this.velocity.x * this.restitution;
        this.position.x = Game.policy.leftBorderX + this.origin.x;
        collision = true;
    }
    else if(Game.policy.isXOutsideRightBorder(newPos, this.origin)){
        this.velocity.x = -this.velocity.x * this.restitution;
        this.position.x = Game.policy.rightBorderX - this.origin.x;
        collision = true;
    }

    if(Game.policy.isYOutsideTopBorder(newPos, this.origin)){
        this.velocity.y = -this.velocity.y * this.restitution;
        this.position.y = Game.policy.topBorderY + this.origin.y;
        collision = true;
    }
    else if(Game.policy.isYOutsideBottomBorder(newPos, this.origin)){
        this.velocity.y = -this.velocity.y * this.restitution;
        this.position.y = Game.policy.bottomBorderY - this.origin.y;
        collision = true;
    }

    return collision;
}

Ball.prototype.stop = function(){
    this.moving = false;
    this.velocity = Vector2.zero;
}

Ball.prototype.reset = function(){
	this.inHole = false;
	this.moving = false;
	this.velocity = Vector2.zero;
	this.position = this.initPos;
	this.visible = true;
}

Ball.prototype.out = function(){
	this.position = new Vector2(0, 900);
	this.visible = false;
	this.inHole = true;
}

Ball.prototype.createPocketEffect = function() {
    // تأثير بصري بسيط عند دخول الجيب
    // يمكن تطويره أكثر لاحقاً
    this.pocketEffectTimer = 10;
};

Ball.prototype.createWallHitEffect = function() {
    // تأثير بصري بسيط عند الاصطدام بالحائط
    this.wallHitEffectTimer = 5;
};

Ball.prototype.draw = function () {
    if(!this.visible)
        return;

    // رسم الظل
    this.drawShadow();
    
    // رسم الكرة
	Canvas2D.drawImage(this.sprite, this.position, 0, 1, new Vector2(25,25));
	
	// رسم تأثير الحركة
	if(this.moving) {
	    this.drawMotionTrail();
	}
	
	// رسم تأثيرات خاصة
	this.drawSpecialEffects();
};

Ball.prototype.drawShadow = function() {
    var shadowOffset = new Vector2(3, 3);
    var shadowPos = this.position.add(shadowOffset);
    Canvas2D.drawCircle(shadowPos.x, shadowPos.y, 20, "rgba(0,0,0,0.3)");
};

Ball.prototype.drawMotionTrail = function() {
    if(!this.moving || this.velocity.length < 5 || !BALL_TRAILS_ENABLED) return;
    
    var trailLength = Math.min(this.velocity.length * 2, 40);
    var trailAngle = Math.atan2(-this.velocity.y, -this.velocity.x);
    
    for(var i = 1; i <= 3; i++) {
        var alpha = 0.3 - (i * 0.1);
        var distance = (trailLength / 3) * i;
        var trailX = this.position.x + Math.cos(trailAngle) * distance;
        var trailY = this.position.y + Math.sin(trailAngle) * distance;
        var radius = 20 - (i * 3);
        
        Canvas2D.drawCircle(trailX, trailY, radius, "rgba(255,255,255," + alpha + ")");
    }
};

Ball.prototype.drawSpecialEffects = function() {
    if(!VISUAL_EFFECTS_ENABLED) return;
    
    // تأثير دخول الجيب
    if(this.pocketEffectTimer && this.pocketEffectTimer > 0) {
        var alpha = this.pocketEffectTimer / 10;
        Canvas2D.drawCircle(this.position.x, this.position.y, 30 + (10 - this.pocketEffectTimer) * 3, 
                           "rgba(255,255,0," + alpha + ")");
        this.pocketEffectTimer--;
    }
    
    // تأثير اصطدام الحائط
    if(this.wallHitEffectTimer && this.wallHitEffectTimer > 0) {
        var alpha = this.wallHitEffectTimer / 5;
        Canvas2D.drawCircle(this.position.x, this.position.y, 25 + (5 - this.wallHitEffectTimer) * 2, 
                           "rgba(255,255,255," + alpha + ")");
        this.wallHitEffectTimer--;
    }
};