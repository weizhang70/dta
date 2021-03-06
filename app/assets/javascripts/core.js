(function(cp){

  // some default constants
  var TANK_MISSILE_DAMAGE=20;
  var TANK_BULLET_DAMAGE=3;
  var TANK_LIFE=50;
  var TANK_SHOT_DURATION=50; // ms
  var TANK_START_DURATION=2000; // ms
  var TANK_DEATH_DURATION=500; // ms
  var TANK_ROTATION=Math.PI*0.5; // radian/sec
  var TANK_SPEED=800; // unit/sec
  var TANK_BULLET_SPEED=3000; // unit/sec
  var TANK_MISSILE_SPEED=2000; // unit/sec // must be > 2*TANK_SPEED to avoid catch again
  var TANK_STUCK_DAMAGE=5;
  var TANK_STUCK_DAMAGE_FREQ=400;

  var GAME_OBJ_HEIGHT=500;
  var ABSORB_EFFECT_DURATION=40; // ms per bullet force

  var Vector3 = THREE.Vector3
  , Scene = THREE.Scene
  , PerspectiveCamera = THREE.PerspectiveCamera
  , CubeGeometry = THREE.CubeGeometry
  , SphereGeometry = THREE.SphereGeometry
  , Mesh = THREE.Mesh
  , MeshBasicMaterial = THREE.MeshBasicMaterial
  , Color = THREE.Color
  , PlaneGeometry = THREE.PlaneGeometry
  ;

  function tankFireFreqForLevel (l) {
    return 350-Math.min(260, l<=10 ? l*20 : 100+l*10);
  }
  function tankFireMissileFreqForLevel (l) {
    return 2500-Math.min(2000, l*100);
  }

  function randomBetween (a, b) {
    return a+Math.random()*(b-a);
  }

  var GameConnection = Backbone.Model.extend({
    initialize: function () {

    }
  });

  window.GameConnection = GameConnection;


var TankAIControls = function (tank, game) {
  var self = this;
  self.moveForward = false;
	self.moveBackward = false;
	self.moveLeft = false;
	self.moveRight = false;
  self.fire = false;
  self.fireMissile = false;
  
  var objects;

  var lastOutOfBounds = false;

  var trackStart;
  var track;

  var i = 0;

  function followTrack () {
    self.moveLeft = false;
    self.moveRight = false;
    var d = track.mesh.position.clone();
    var m = tank.mesh.matrixWorld.clone();
    m.getInverse(m);
    m.multiplyVector3(d);
    var angle = Math.atan2(d.x, d.y);
    if (Math.abs(angle/Math.PI)*0.5<Math.random()) {
      if (angle>0)
        self.moveLeft = true;
      else
        self.moveRight = true;
    }
  }

  function dist2With (t) {
    return tank.mesh.position.clone().subSelf(t.mesh.position).lengthSq();
  }

  function findClosest () {
    var t = game.tanks.toArray().sort(function(a, b) {
      return dist2With(a) > dist2With(b);
    })[1];
    return t;
  }

  function randomMove () {
    self.moveForward = Math.random()>0.7;
    self.moveBackward = Math.random()>0.3;
  }

  function randomOrientation() {
    self.moveLeft = Math.random()>0.7;
    self.moveRight = Math.random()>0.7;
  }

  function avoidWalls () {
    // compute states & rays
    var position = tank.mesh.position;
    var angleFront = tank.rotationV.clone().negate();
    var angleBack = tank.rotationV.clone();
    var frontObj = _.find(new THREE.Ray(position, angleFront).intersectObjects(objects), function (o) { return o.distance <= 500 });
    var backObj = _.find(new THREE.Ray(position, angleBack).intersectObjects(objects), function (o) { return o.distance <= 400 });

    var outOfBounds = game.outOfBounds(position, 500);
    var goesOutOfBounds = !goesOutOfBounds && outOfBounds;
    var lastMoveForward = self.moveForward;
    var needBackward = goesOutOfBounds && Math.random()>0.5;
    var needForward = goesOutOfBounds && !needBackward;

    // Updates
    lastOutOfBounds = outOfBounds;

    if (needBackward) {
      self.moveForward = false;
      self.moveBackward = true;
    }
    else if (needForward) {
      self.moveForward = true;
      self.moveBackward = false;
    }
    else {
      if (frontObj) 
        self.moveBackward = true;
      if (backObj)
        self.moveForward = true;
    }
  }


  setTimeout (function loop () {
    if (tank.life <= 0) return;
    setTimeout(loop, 400+200*Math.random());
    ++i;

    objects = game.objects.map(function(o) {
      return o.mesh;
    });

    randomMove();
    randomOrientation();

    if(+new Date()-trackStart>5000) track=null;
    if (!track) {
      if (Math.random()<0.7) {
        track = findClosest();
        trackStart = +new Date();
      }
    }

    self.fireMissile = Math.random()<0.05;
    self.fire = Math.random()<0.1;

    if(track) { 
      followTrack();
      var d = Math.sqrt(dist2With(track));
      if (d < 2000) {
        self.moveForward = Math.random()<0.1;
        self.moveBackward = Math.random()<0.9;
        self.fireMissile = Math.random()<0.3;
        self.fire = true;
      }
      else if (d < 4000) {
        self.moveForward = Math.random()<0.1;
        self.fireMissile = Math.random()<0.9;
        self.fire = true;
      }
      else {
        self.fire = Math.random()<0.7;
      }
    }

    avoidWalls();
  }, 500);
}
window.TankAIControls = TankAIControls;

var TankRandomControls = function (tank) {
  var self = this;
  self.moveForward = false;
	self.moveBackward = false;
	self.moveLeft = false;
	self.moveRight = false;
  self.fire = false;
  self.fireMissile = false;
  var i = 0;
  setTimeout (function loop () {
    if (tank.life <= 0) return;
    setTimeout(loop, 400+200*Math.random());
    ++ i;
    self.moveForward = i%3==0 && Math.random() > 0.2;
    self.moveBackward = !self.moveForward && Math.random() > 0.5;
    self.moveLeft = Math.random() < 0.1;
    self.moveRight = Math.random() < 0.1;
    self.fire = Math.random() > 0.2;
    self.fireMissile = Math.random() < 0.2;
  }, 500);
}
window.TankRandomControls = TankRandomControls;

var TankRemoteControls = function (events) {
  this.moveForward = false;
	this.moveBackward = false;
	this.moveLeft = false;
	this.moveRight = false;
  this.fire = false;
  this.fireMissile = false;
}

var TankKeyboardControls = function ( domElement ) {
	this.domElement = ( domElement !== undefined ) ? domElement : document;  

	this.moveForward = false;
	this.moveBackward = false;
	this.moveLeft = false;
	this.moveRight = false;
  this.fire = false;
  this.fireMissile = false;

  var self = this;
  $(window).on("blur", function () {
    self.moveForward = false;
    self.moveBackward = false;
    self.moveLeft = false;
    self.moveRight = false;
    self.fire = false;
    self.fireMissile = false;
  });

	this.onKeyDown = function ( event ) {
    var prevent=true;

		switch( event.keyCode ) {

			case 38: /*up*/
			case 87: /*W*/ this.moveForward = true; break;

			case 37: /*left*/
			case 65: /*A*/ this.moveLeft = true; break;

			case 40: /*down*/
			case 83: /*S*/ this.moveBackward = true; break;

			case 39: /*right*/
			case 68: /*D*/ this.moveRight = true; break;

      case 32: /*space*/ this.fireMissile = true; break;

      case 67: // C
      case 86: // V
      case 17: /*ctrl*/ this.fire = true; break;

      default: prevent = false;
		}

    if (prevent) event.preventDefault();
	};

	this.onKeyUp = function ( event ) {
    var prevent=true;

		switch( event.keyCode ) {

			case 38: /*up*/
			case 87: /*W*/ this.moveForward = false; break;

			case 37: /*left*/
			case 65: /*A*/ this.moveLeft = false; break;

			case 40: /*down*/
			case 83: /*S*/ this.moveBackward = false; break;

			case 39: /*right*/
			case 68: /*D*/ this.moveRight = false; break;

      case 32: /*space*/ this.fireMissile = false; break;

      case 67: // C
      case 86: // V
      case 17: /*ctrl*/ this.fire = false; break;

      default: prevent = false;
		}

    if (prevent) event.preventDefault();
	};

	this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );

	this.domElement.addEventListener( 'keydown', bind( this, this.onKeyDown ), false );
	this.domElement.addEventListener( 'keyup', bind( this, this.onKeyUp ), false );

	function bind( scope, fn ) { return function () { fn.apply( scope, arguments ); }; };

};

  var Game = Backbone.Model.extend({
    initialize: function () {
      this.startTime = +new Date();

      this.effectsEnabled = true;
      
      this.boundMin = this.get("boundMin");
      this.boundMax = this.get("boundMax");

      this.tanks = new Backbone.Collection();
      this.bullets = new Backbone.Collection();
      this.objects = new Backbone.Collection(_.map(this.get("objects")||[], function (obj) {
        if (obj.position) {
          obj.position = new Vector3(obj.position.x, obj.position.y, obj.position.z);
          var o = new RectObj(obj); 
          o.mesh.geometry.computeBoundingBox();
          return o;
        }
      }));

      this.scene = new Scene();
      this.scene.fog = new THREE.Fog(0x000000, 1, 6000);
	    this.camera = new PerspectiveCamera(75, WIDTH/HEIGHT, 1, 10000);
	    this.scene.add(this.camera);
      this.makeGround(100, 0x008800, 0);
      this.makeLimitWalls(100, 0x008800, 10000);
	    this.renderer = new THREE.WebGLRenderer();
	    this.renderer.setSize(WIDTH, HEIGHT);
      //this.renderer.setClearColorHex(0x000000, 1);
      //this.renderer.gammaInput = true;
      //this.renderer.gammaOutput = true;

      var self = this;
      this.objects.forEach(function (o) {
        self.scene.add(o.mesh);
      });

	    $('#game').append(this.renderer.domElement);

      // Add effects

      var rtParameters = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat, stencilBuffer: true };

      this.renderModel = new THREE.RenderPass(this.scene, this.camera);
      this.renderModel.clear = false;

      this.composerScene = new THREE.EffectComposer(this.renderer, new THREE.WebGLRenderTarget(WIDTH, HEIGHT, rtParameters));
      this.composerScene.addPass(this.renderModel);

      this.renderScene = new THREE.TexturePass(this.composerScene.renderTarget2);
      this.renderScene.uniforms["tDiffuse"].texture = this.composerScene.renderTarget2;

      this.effectRadioNoise = new THREE.ShaderPass( Shaders[ "radionoise" ] );
      this.effectPerturbation = new THREE.ShaderPass( Shaders[ "perturbation" ] );
      this.updateEffects();

      var composer1 = this.composer1 = new THREE.EffectComposer( this.renderer, new THREE.WebGLRenderTarget(WIDTH, HEIGHT, rtParameters) );
      this.effectPerturbation.renderToScreen = true; // set to the last pass
		  composer1.addPass( this.renderScene );
			composer1.addPass( this.effectRadioNoise );
			composer1.addPass( this.effectPerturbation );
    },

    updateEffects: function () {
      var now = +new Date();
      var t = now-this.startTime;
      this.effectRadioNoise.uniforms[ "amount" ].value = (this.focusTank?Math.max(0, 20-this.focusTank.life)/60:0)+0.15+0.1*smoothstep(0.9, 1.0, Math.cos(t/2000.));
      this.effectRadioNoise.uniforms[ "width" ].value = WIDTH/4;
      this.effectRadioNoise.uniforms[ "height" ].value = HEIGHT/4;
      this.effectRadioNoise.uniforms[ "time" ].value = t/1000.;

      this.hurts = _.filter(this.hurts, function (h) {
        return now-h.time<1000;
      });

      var damages = 0;
      for (var i=0; i<this.hurts.length; ++i)
        damages += this.hurts[i].force;

      this.effectPerturbation.uniforms[ "lines" ].value = HEIGHT/4;
      this.effectPerturbation.uniforms[ "amount" ].value = damages/100;
      if (damages) {
        this.effectPerturbation.uniforms["p"].value = Math.sin(t/150.);
        this.effectPerturbation.uniforms[ "seed" ].value = Math.random();
      }

      
    },

    makeGround: function (resolution, color, z) {
      var bmin = this.get("boundMin");
      var bmax = this.get("boundMax");
      var dx = bmax.x-bmin.x;
      var dy = bmax.y-bmin.y;

      var plane = new PlaneGeometry(dx, dy, resolution, resolution);
		  var material = new MeshBasicMaterial({ color: color, wireframe: true });
      var mesh = new Mesh(plane, material);
      mesh.rotation.x = Math.PI/2;
      mesh.position.x = 0; //bmin.x;
      mesh.position.y = 0;//bmin.y;
      mesh.position.z = z;
      this.ground=mesh;
      this.scene.add(mesh);
    },
    makeLimitWalls: function (resolution, color, height) {
      var walls = [];
      var bmin = this.get("boundMin");
      var bmax = this.get("boundMax");
      var dx = bmax.x-bmin.x;
      var dy = bmax.y-bmin.y;

      var plane = new PlaneGeometry(dx, height, resolution, resolution*height/dy);
		  var material = new MeshBasicMaterial({ color: color, wireframe: true });
      var mesh = new Mesh(plane, material);
      mesh.position.x = 0;
      mesh.position.y = bmax.y;
      mesh.position.z = height/2;
      walls.push(mesh);

      mesh = new Mesh(plane, material);
      mesh.position.x = 0;
      mesh.position.y = bmin.y;
      mesh.position.z = height/2;
      walls.push(mesh);

      mesh = new Mesh(plane, material);
      mesh.rotation.z = Math.PI/2;
      mesh.position.x = bmin.x;
      mesh.position.y = 0;
      mesh.position.z = height/2;
      walls.push(mesh);

      mesh = new Mesh(plane, material);
      mesh.rotation.z = Math.PI/2;
      mesh.position.x = bmax.x;
      mesh.position.y = 0;
      mesh.position.z = height/2;
      walls.push(mesh);

      this.walls = walls;
      var self = this;
      walls.forEach(function (wall) {
        self.scene.add(wall);
      });
    },
    animate: function () {
      var self=this;
      var startTime = +new Date();
      function animate () {
        requestAnimationFrame(animate);
        update();
        render();
      }

      function update () {
        var objects = self.objects.map(function(o) {
          return o.mesh;
        });
        var tanks = self.tanks.map(function(o) {
          return o.mesh;
        });

        self.tanks.forEach(function (tank) {
          if (tank.z>0) return;

          var position = tank.mesh.position;
          var rotation = tank.mesh.rotation;
          var oldPosition = position.clone();
          var oldRotation = rotation.clone();

          tank.update();
          
          var collide = self.outOfBounds(position, 300);

          if (!collide && (!tank.controls || tank.controls.moveForward || tank.controls.moveLeft || tank.controls.moveRight)) {
            var angle = tank.rotationV.clone().negate();
            var front =  new THREE.Ray(position, angle);
            var frontLeft = new THREE.Ray(tank.mesh.matrixWorld.multiplyVector3(new Vector3(-160, 0, 0)), angle);
            var frontRight = new THREE.Ray(tank.mesh.matrixWorld.multiplyVector3(new Vector3(160, 0, 0)), angle);
            collide = _.find(front.intersectObjects(objects), function (o){ return o.distance <= 300 })
                   || _.find(frontLeft.intersectObjects(objects), function (o){ return o.distance <= 300 }) 
                   || _.find(frontRight.intersectObjects(objects), function (o){ return o.distance <= 300 })
          }

          if (!collide && (!tank.controls || tank.controls.moveBackward || tank.controls.moveLeft || tank.controls.moveRight)) {
            var back = new THREE.Ray(position, tank.rotationV);
            collide = _.find(back.intersectObjects(objects), function (o){ return o.distance <= 200 });
          }

          if (collide) {
            tank.lastStuckTime = +new Date();
            position.copy(oldPosition);
            rotation.copy(oldRotation);
          }

        });

        self.objects.forEach(function (obj) {
          obj.update();
        });
        self.bullets.forEach(function (bullet) {
          var from = bullet.position.clone();
          var vector = bullet.velocity.clone().normalize();
          bullet.update();
          var to = bullet.position;
          var distance = from.clone().subSelf(to).length();
          var ray = new THREE.Ray(from, vector);
          var intersect = _.find(ray.intersectObjects(objects), function (o) {
            return o.distance <= distance;
          });
          if (intersect) {
            var object = self.objects.find(function(o){
              return intersect.object==o.mesh;
            });
            object.trigger("absorb", bullet, intersect);
            bullet.destroy();
            return;
          }

          var originTank = bullet.get("tank");
          var intersect = _.find(ray.intersectObjects(tanks), function (tank) {
            return tank.distance <= distance && (!originTank || tank.object != originTank.mesh);
          });
          if (intersect) {
            var tank = self.tanks.find(function(o){
              return intersect.object==o.mesh;
            });
            if(tank) {
              tank.hurt(bullet.get("force"), bullet.get("tank"));
              tank.trigger("bullet", bullet);
            }
            bullet.destroy();
            return;
          }

          if (self.outOfBounds(to)) {
            bullet.destroy();
          }
        });

        self.updateEffects();
      }

      function render () {
        if (self.effectsEnabled) {
          var delta = 0.01;
          self.renderer.setViewport(0, 0, WIDTH, HEIGHT);
          self.renderer.clear();
          self.composerScene.render(delta);
          self.renderer.setViewport(0, 0, WIDTH, HEIGHT);
          self.composer1.render(delta);
        }
        else {
          self.renderer.render(self.scene, self.camera);
        }
      }
      animate();
    },
    outOfBounds: function (p, safeDelta) {
      if (!safeDelta) safeDelta = 0;
      return p.x < this.boundMin.x+safeDelta || this.boundMax.x-safeDelta < p.x ||
             p.y < this.boundMin.y+safeDelta || this.boundMax.y-safeDelta < p.y ||
             p.z < 0;
    },
    focusCameraOn: function (tank) {
      this.camera.rotation.y = Math.PI;
      this.camera.rotation.x = Math.PI/2;
      this.camera.rotation.z = 0;
      this.camera.position.copy(new Vector3(0, 100, 360));
      this.focusTank = tank;
      tank.mesh.add(this.camera);
      this.hurts = [];
      var self = this;
      tank.on("hurt", function (force) {
        self.hurts.push({ time: +new Date(), force: force });
      });
    },
    onTankFire: function (tank, bullet) {
      var self = this;
      self.bullets.add(bullet);
      self.scene.add(bullet.mesh);
      bullet.on("destroy", function () {
        self.bullets.remove(bullet);
        self.scene.remove(bullet.mesh);
      });
    },
    findFreePosition: function (safeDist) {
      var self = this;
      var d = safeDist*safeDist;
      var p;
      for (var i=0; i<100; ++i) {
        p = new Vector3(randomBetween(this.boundMin.x+safeDist, this.boundMax.x-safeDist), randomBetween(this.boundMin.y+safeDist, this.boundMax.y-safeDist), 0);
        if ( !self.objects.find(function (obj) {
                return obj.mesh.position.clone().subSelf(p).lengthSq() <= d;
        }) ) {
          return p;
        }
      }
      console.log("unable to find a free position...");
      return p;
    },
    addTank: function (tank) {
      var self = this;
      this.tanks.add(tank);
      this.scene.add(tank.mesh);
      tank.on("fire", function (bullet) {
        self.onTankFire(tank, bullet);
      });
      tank.on("destroy", function () {
        self.tanks.remove(tank);
        self.scene.remove(tank.mesh);
      });
    },
    removeTank: function (tank) {
      this.tanks.remove(tank);
      this.scene.remove(tank.mesh);
    }
  });

  var Tank = Backbone.Model.extend({
    initialize: function () {
      this.set("position", this.position=this.get("position")||new Vector3());
      this.set("velocity", new Vector3(0, 0, 0));
      this.falling = true;
      this.startDate = +new Date();
      this.lastFire = 0;
      this.lastShot = 0;
      this.lastMove = +new Date();
      this.life = this.get("life")||TANK_LIFE;
      this.lastFireMissile = 0;
      this.rotationV = new Vector3(0, 1, 0); // TODO rename to orientation and share it with .set()
      this.level = 0;
      var self = this;
      this.on("hurt", function (force, tank) {
        self.lastShot = +new Date();
        self.lastLifeLost = force;
        if (self.life <= 0) return;
        self.life -= self.lastLifeLost;
        if (self.life <= 0) {
          self.timeOfDeath = +new Date();
          self.trigger("death", force, tank);
          if (tank) {
            tank.level ++;
            tank.trigger("kill", force, tank);
          }
        }
      });

      this.makeTank();
    },
    hurt: function (force, tankOrigin /*opt*/) {
      this.trigger("hurt", force, tankOrigin||null);
    },
    move: function () {
      var last = this.lastMove;
      this.lastMove = +new Date();
      var t = (this.lastMove-last)/1000;
      if (this.rotation) {
        var rotation = this.rotation*t;
        this.mesh.rotation.addSelf(new Vector3().setZ(-rotation));
        this.rotationV.x = -Math.sin(this.mesh.rotation.z);
        this.rotationV.y = Math.cos(this.mesh.rotation.z);
        this.rotationV.z = 0;
      }
      var v = this.get("velocity");
      var speed = this.speed*t;
      v.x = speed * this.rotationV.x;
      v.y = speed * this.rotationV.y;
      v.z = speed * this.rotationV.z;
      this.mesh.translateY(-speed);
    },
    fire: function (type) {
      var bullet = new Bullet({
        position: this.getBarrelPosition(),//this.mesh.position.clone().addSelf(new Vector3(0, -100, 70)),
        velocity: this.rotationV.clone().multiplyScalar(type=="missile" ? TANK_MISSILE_SPEED : TANK_BULLET_SPEED).addSelf(this.get("velocity")).negate().addSelf(type=="missile" ? new Vector3(0,0,25) : new Vector3(0,0,5)),
        gravity: type=="missile" ? -30 : -10,
        type: type,
        force: Math.round((type=="missile" ? TANK_MISSILE_DAMAGE : TANK_BULLET_DAMAGE)*(1+0.2*Math.random())),
        tank: this
      });
      this.trigger("fire", bullet);
    },
    update: function () {
      if (+new Date()-this.lastStuckTime<TANK_STUCK_DAMAGE_FREQ) {
        var time = +new Date()-(this.lastStuckDamage||0);
        if (time>TANK_STUCK_DAMAGE_FREQ) {
          this.lastStuckDamage = this.lastShot = +new Date();
          this.hurt(TANK_STUCK_DAMAGE);
          this.trigger("collideWall");
        }
      }
      if (this.life<=0) {
        this.mesh.material.wireframe=false;
        var v = (+new Date()-this.timeOfDeath)/TANK_DEATH_DURATION;
        if (v>1) {
          this.destroy();
        }
        else {
          this.mesh.material.color=new Color().setRGB(Math.max(1, 2*v), 0, 0);
        }
      }
      else if (this.falling) {
        var t = (+new Date()-this.startDate)/TANK_START_DURATION;
        if (t <= 1) {
          this.mesh.position.setZ((1-t)*3000);
        }
        else {
          this.mesh.position.setZ(0);
          this.lastMove = +new Date();
          this.falling = false;
        }
      }
      else {
        this.mesh.position.setZ(0);
        if (+new Date()-this.lastShot<TANK_SHOT_DURATION*this.lastLifeLost) {
          this.mesh.material.wireframe=false;
        }
        else {
          this.mesh.material.wireframe=true;
        }
        if (this.controls) {

          if (this.controls.fireMissile) {
            if (+new Date()-this.lastFireMissile>tankFireMissileFreqForLevel(this.level)) {
              this.lastFireMissile=+new Date();
              this.fire("missile");
            }
          }
          if (this.controls.fire) {
            if (+new Date()-this.lastFire>tankFireFreqForLevel(this.level)) {
              this.lastFire=+new Date();
              this.fire();
            }
          }

          if (this.controls.moveForward && !this.controls.moveBackward) {
            this.speed = TANK_SPEED;
          }
          else if (this.controls.moveBackward) {
            this.speed = -TANK_SPEED;
          }
          else {
            this.speed = 0;
          }
          if (this.controls.moveLeft && !this.controls.moveRight) {
            this.rotation = -TANK_ROTATION;
          }
          else if (this.controls.moveRight) {
            this.rotation = TANK_ROTATION;
          }
          else {
            this.rotation = 0;
          }

          this.move();
        }
      }
      this.trigger("update");
    },

    makeTank: function() {
      var p = this.get("position");
	    var merged = new THREE.Geometry(),
      base = new THREE.CubeGeometry(300, 450, 160),
      turret = new THREE.CubeGeometry(200, 200, 120),
      barrel = new THREE.CubeGeometry(40, 200, 40);

	    var mesh = null,
		      material = new THREE.MeshBasicMaterial({ color: 0x00FF00, wireframe: true, wireframeLinewidth: 2 });

	    mesh = new THREE.Mesh(base, material);
	    THREE.GeometryUtils.merge(merged, mesh);
	    mesh.position.z = 80;

	    mesh = new THREE.Mesh(turret, material);
	    mesh.position.z = 170;
	    THREE.GeometryUtils.merge(merged, mesh);

	    mesh = new THREE.Mesh(barrel, material);
	    mesh.position.z = 180;
	    mesh.position.y = -200;
	    THREE.GeometryUtils.merge(merged, mesh);

	    merged.computeFaceNormals();
      merged.computeBoundingBox();
	    mesh = new THREE.Mesh(merged, material);
      mesh.position = p;

	    this.mesh=mesh;
    },
    getBarrelPosition: function () {
      var v = new Vector3(0, -300, 180);
      return this.mesh.matrixWorld.multiplyVector3(v);
    },
    setControls: function (controls) {
      this.controls = controls;
    }
  });

var Bullet = Backbone.Model.extend({
  initialize: function () {
    this.startDate = +new Date();
    this.startAt = this.get("position");
    this.velocity = this.get("velocity");
    this.maxDistance = this.get("maxDistance")||10000;
    this.gravity = this.get("gravity")||0;
    this.accel = new Vector3(0, 0, this.gravity);
    this.position = this.startAt.clone();
    this.createMesh();
  },
  update: function () {
    var d = new Vector3().sub(this.position, this.startAt).length();
    var t = (+new Date()-this.startDate)/1000; // in sec
    this.position.copy(this.startAt).addSelf(this.velocity.clone().addSelf(this.accel.clone().multiplyScalar(t)).multiplyScalar(t));
    if (d>this.maxDistance) {
      this.destroy();
    }
  },
  createMesh: function () {
    var size = this.get("type")=="missile" ? 20 : 5;
    var geometry = new SphereGeometry(size);
    var material = new MeshBasicMaterial({ color: 0x00FF00 });
    var mesh = new Mesh(geometry, material);
    mesh.position = this.position;
	  this.mesh=mesh;
  }
});

var GameObj = Backbone.Model.extend({
  update: function () {}
});


var RectObj = GameObj.extend({
  initialize: function () {
    var self = this;
    this.absorbs=[];
    this.createMesh();
    this.bind("absorb", function (bullet, context) {
      self.absorbs.push(+new Date()+ABSORB_EFFECT_DURATION*bullet.get("force"));
    });
  },
  update: function () {
    var self = this;
    if (self.absorbs.length) {
      self.absorbs=_.filter(self.absorbs, function (time) {
        return +new Date()-time < 0;
      });
      var nb = self.absorbs.length;
      if (!nb) {
        self.mesh.material.wireframe=false;
      }
      else {
        self.mesh.material.wireframe=true;
      }
    }
  },

  createMesh: function () {
    var geo = new CubeGeometry(this.get("w"), this.get("h"), GAME_OBJ_HEIGHT);
    var mat = new MeshBasicMaterial({ color: 0x00CC66, wireframe: false });
    var mesh = new Mesh(geo, mat);
    mesh.position = this.get("position")||new Vector3();
    mesh.position.z = GAME_OBJ_HEIGHT/2;
    return this.mesh=mesh;
  }
});

cp.Game = Game;
cp.Tank = Tank;
cp.TankKeyboardControls = TankKeyboardControls;
cp.RectObj = RectObj;

}(window));
