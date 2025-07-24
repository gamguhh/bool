"use strict";

function Stick(position){
    this.position = position;
    this.origin = new Vector2(970,11);
    this.shotOrigin = new Vector2(950,11);
    this.shooting = false;
    this.visible = true;
    this.rotation = 0;
    this.power = 0;
    this.maxPower = 100;
    this.trackMouse = true;
    this.isPullingBack = false;
    this.pullBackDistance = 0;
    this.maxPullBack = 100;
    this.aimLineVisible = true;
    this.powerBarVisible = false;
}

Stick.prototype.handleInput = function (delta) {

    if(AI_ON && Game.policy.turn === AI_PLAYER_NUM)
      return;

    if(Game.policy.turnPlayed)
      return;

    // التحكم بلوحة المفاتيح (اختياري)
    if(Keyboard.down(Keys.W) && KEYBOARD_INPUT_ON){
      if(this.power < this.maxPower){
        this.pullBackDistance += 2;
        this.power = (this.pullBackDistance / this.maxPullBack) * this.maxPower;
        this.origin.x = this.shotOrigin.x + this.pullBackDistance;
        this.powerBarVisible = true;
      }
    }

    if(Keyboard.down(Keys.S) && KEYBOARD_INPUT_ON){
      if(this.pullBackDistance > 0){
        this.pullBackDistance -= 2;
        this.power = (this.pullBackDistance / this.maxPullBack) * this.maxPower;
        this.origin.x = this.shotOrigin.x + this.pullBackDistance;
        if(this.pullBackDistance <= 0) {
          this.powerBarVisible = false;
        }
      }
    }

    // التحكم بالماوس (الطريقة الأساسية)
    if(Mouse.left.down && !this.isPullingBack) {
      // بداية سحب العصا
      this.isPullingBack = true;
      this.startMousePos = Mouse.position.copy();
      this.powerBarVisible = true;
    }
    
    if(this.isPullingBack && Mouse.left.down) {
      // حساب المسافة المسحوبة
      var currentMousePos = Mouse.position;
      var distanceFromWhiteBall = currentMousePos.distanceFrom(this.position);
      var pullDirection = this.position.subtract(currentMousePos);
      
      // التأكد من أن السحب في الاتجاه المعاكس للهدف
      var dotProduct = pullDirection.dot(new Vector2(Math.cos(this.rotation), Math.sin(this.rotation)));
      
      if(dotProduct > 0 && distanceFromWhiteBall > 50) {
        this.pullBackDistance = Math.min(distanceFromWhiteBall - 50, this.maxPullBack);
        this.power = (this.pullBackDistance / this.maxPullBack) * this.maxPower;
        this.origin.x = this.shotOrigin.x + this.pullBackDistance;
      }
    }
    
    if(this.isPullingBack && !Mouse.left.down) {
      // إطلاق الكرة
      if(this.power > 5) {
        this.shoot(this.power, this.rotation);
      }
      this.isPullingBack = false;
      this.powerBarVisible = false;
      this.pullBackDistance = 0;
      this.origin = this.shotOrigin.copy();
    }
    
    // تتبع الماوس للتصويب
    if(this.trackMouse && !this.isPullingBack){
      var opposite = Mouse.position.y - this.position.y;
      var adjacent = Mouse.position.x - this.position.x;
      this.rotation = Math.atan2(opposite, adjacent);
    }
};

Stick.prototype.shoot = function(power, rotation){
  this.power = power;
  this.rotation = rotation;

  if(Game.sound && SOUND_ON){
    var strike = sounds.strike.cloneNode(true);
    strike.volume = Math.min((this.power/50), 1);
    strike.play();
  }
  
  Game.policy.turnPlayed = true;
  this.shooting = true;
  this.origin = this.shotOrigin.copy();
  this.aimLineVisible = false;

  Game.gameWorld.whiteBall.shoot(this.power, this.rotation);
  var stick = this;
  setTimeout(function(){stick.visible = false;}, 500);
}

Stick.prototype.update = function(){
  if(this.shooting && !Game.gameWorld.whiteBall.moving)
    this.reset();
};

Stick.prototype.reset = function(){
  this.position.x = Game.gameWorld.whiteBall.position.x;
  this.position.y = Game.gameWorld.whiteBall.position.y;
  this.origin = new Vector2(970,11);
  this.shotOrigin = new Vector2(950,11);
  this.shooting = false;
  this.visible = true;
  this.power = 0;
  this.isPullingBack = false;
  this.pullBackDistance = 0;
  this.aimLineVisible = true;
  this.powerBarVisible = false;
};

Stick.prototype.drawAimLine = function() {
  if(!this.aimLineVisible || !this.visible || !AIM_LINE_ENABLED) return;
  
  this.drawTrajectoryLine();
};

Stick.prototype.drawTrajectoryLine = function() {
  var maxBounces = 2; // عدد الانعكاسات المسموحة
  var currentPos = this.position.copy();
  var currentAngle = this.rotation;
  var segmentLength = 15;
  var maxSegments = 20;
  
  for(var bounce = 0; bounce <= maxBounces; bounce++) {
    var segments = bounce === 0 ? maxSegments : Math.floor(maxSegments * 0.7);
    var alpha = bounce === 0 ? 0.8 : 0.4 - (bounce * 0.2);
    
    for(var i = 0; i < segments; i++) {
      var startX = currentPos.x + Math.cos(currentAngle) * (i * segmentLength);
      var startY = currentPos.y + Math.sin(currentAngle) * (i * segmentLength);
      var endX = currentPos.x + Math.cos(currentAngle) * ((i + 1) * segmentLength);
      var endY = currentPos.y + Math.sin(currentAngle) * ((i + 1) * segmentLength);
      
      // فحص الاصطدام مع الحواف
      var collision = this.checkWallCollision(startX, startY, endX, endY);
      
      if(collision.hit) {
        // رسم الخط حتى نقطة الاصطدام
        Canvas2D.drawLine(startX, startY, collision.point.x, collision.point.y, 
                         "rgba(255,255,255," + alpha + ")", 3);
        
        // تحديث الموقع والزاوية للانعكاس
        currentPos = collision.point.copy();
        currentAngle = collision.newAngle;
        break;
      } else {
        // رسم الخط العادي
        if(i % 2 === 0) { // خط متقطع
          Canvas2D.drawLine(startX, startY, endX, endY, 
                           "rgba(255,255,255," + alpha + ")", 3);
        }
      }
      
      // فحص الاصطدام مع الكرات
      if(this.checkBallCollision(endX, endY)) {
        break;
      }
    }
    
    // إذا لم يحدث اصطدام في هذا المسار، توقف
    if(!collision || !collision.hit) break;
  }
};

Stick.prototype.checkWallCollision = function(x1, y1, x2, y2) {
  var result = { hit: false, point: null, newAngle: 0 };
  
  // فحص الحدود
  var leftBorder = Game.policy.leftBorderX + 25;
  var rightBorder = Game.policy.rightBorderX - 25;
  var topBorder = Game.policy.topBorderY + 25;
  var bottomBorder = Game.policy.bottomBorderY - 25;
  
  // فحص الاصطدام مع الحد الأيسر
  if(x1 > leftBorder && x2 <= leftBorder) {
    var t = (leftBorder - x1) / (x2 - x1);
    var hitY = y1 + t * (y2 - y1);
    if(hitY >= topBorder && hitY <= bottomBorder) {
      result.hit = true;
      result.point = new Vector2(leftBorder, hitY);
      result.newAngle = Math.PI - this.rotation; // انعكاس أفقي
      return result;
    }
  }
  
  // فحص الاصطدام مع الحد الأيمن
  if(x1 < rightBorder && x2 >= rightBorder) {
    var t = (rightBorder - x1) / (x2 - x1);
    var hitY = y1 + t * (y2 - y1);
    if(hitY >= topBorder && hitY <= bottomBorder) {
      result.hit = true;
      result.point = new Vector2(rightBorder, hitY);
      result.newAngle = Math.PI - this.rotation; // انعكاس أفقي
      return result;
    }
  }
  
  // فحص الاصطدام مع الحد العلوي
  if(y1 > topBorder && y2 <= topBorder) {
    var t = (topBorder - y1) / (y2 - y1);
    var hitX = x1 + t * (x2 - x1);
    if(hitX >= leftBorder && hitX <= rightBorder) {
      result.hit = true;
      result.point = new Vector2(hitX, topBorder);
      result.newAngle = -this.rotation; // انعكاس عمودي
      return result;
    }
  }
  
  // فحص الاصطدام مع الحد السفلي
  if(y1 < bottomBorder && y2 >= bottomBorder) {
    var t = (bottomBorder - y1) / (y2 - y1);
    var hitX = x1 + t * (x2 - x1);
    if(hitX >= leftBorder && hitX <= rightBorder) {
      result.hit = true;
      result.point = new Vector2(hitX, bottomBorder);
      result.newAngle = -this.rotation; // انعكاس عمودي
      return result;
    }
  }
  
  return result;
};

Stick.prototype.checkBallCollision = function(x, y) {
  for(var i = 0; i < Game.gameWorld.balls.length; i++) {
    var ball = Game.gameWorld.balls[i];
    if(ball === Game.gameWorld.whiteBall || ball.inHole || !ball.visible) continue;
    
    var distance = Math.sqrt((x - ball.position.x) * (x - ball.position.x) + 
                            (y - ball.position.y) * (y - ball.position.y));
    if(distance <= BALL_SIZE) {
      return true;
    }
  }
  return false;
};

Stick.prototype.drawPowerBar = function() {
  if(!this.powerBarVisible || !POWER_BAR_ENABLED) return;
  
  var barX = this.position.x - 60;
  var barY = this.position.y - 120;
  var barWidth = 120;
  var barHeight = 20;
  var powerRatio = this.power / this.maxPower;
  
  // خلفية شريط القوة مع حدود
  Canvas2D.drawRectangle(barX - 2, barY - 2, barWidth + 4, barHeight + 4, "rgba(0,0,0,0.8)");
  Canvas2D.drawRectangle(barX, barY, barWidth, barHeight, "rgba(40,40,40,0.9)");
  
  // شريط القوة الملون مع تدرج
  var powerWidth = powerRatio * barWidth;
  var powerColor = this.getPowerColor();
  
  // رسم شريط القوة مع تأثير متدرج
  for(var i = 0; i < powerWidth; i += 2) {
    var segmentAlpha = 0.8 + (Math.sin(Date.now() * 0.01 + i * 0.1) * 0.2);
    var segmentColor = this.getPowerColorWithAlpha(powerRatio, segmentAlpha);
    Canvas2D.drawRectangle(barX + i, barY, 2, barHeight, segmentColor);
  }
  
  // إطار شريط القوة
  Canvas2D.drawRectangleOutline(barX, barY, barWidth, barHeight, "white", 2);
  
  // علامات القوة
  this.drawPowerMarkers(barX, barY, barWidth, barHeight);
  
  // نص القوة
  var powerText = Math.round(this.power) + "%";
  Canvas2D.drawText(powerText, new Vector2(barX + barWidth/2, barY - 25), 
                   new Vector2(0, 0), "white", "center", "Arial", "14px");
};

Stick.prototype.drawPowerMarkers = function(barX, barY, barWidth, barHeight) {
  // علامات القوة (25%, 50%, 75%)
  var markers = [0.25, 0.5, 0.75];
  for(var i = 0; i < markers.length; i++) {
    var markerX = barX + (markers[i] * barWidth);
    Canvas2D.drawLine(markerX, barY - 5, markerX, barY + barHeight + 5, 
                     "rgba(255,255,255,0.6)", 1);
  }
};

Stick.prototype.getPowerColorWithAlpha = function(powerRatio, alpha) {
  if(powerRatio < 0.3) {
    return "rgba(0,255,0," + alpha + ")"; // أخضر
  } else if(powerRatio < 0.6) {
    return "rgba(255,255,0," + alpha + ")"; // أصفر
  } else if(powerRatio < 0.8) {
    return "rgba(255,165,0," + alpha + ")"; // برتقالي
  } else {
    return "rgba(255,0,0," + alpha + ")"; // أحمر
  }
};

Stick.prototype.getPowerColor = function() {
  var powerRatio = this.power / this.maxPower;
  if(powerRatio < 0.3) return "green";
  else if(powerRatio < 0.6) return "yellow";
  else if(powerRatio < 0.8) return "orange";
  else return "red";
};

Stick.prototype.draw = function () {
  if(!this.visible) return;
  
  // رسم خط التصويب أولاً
  this.drawAimLine();
  
  // رسم العصا
  Canvas2D.drawImage(sprites.stick, this.position, this.rotation, 1, this.origin);
  
  // رسم شريط القوة
  this.drawPowerBar();
};