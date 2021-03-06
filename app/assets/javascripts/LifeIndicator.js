(function(){

  var LifeIndicator = function (nodeId) {
    this.canvas = document.getElementById(nodeId);
    this.ctx = this.canvas.getContext("2d");
    this.life = 1;
    this.render();
  }

  LifeIndicator.prototype.setLife = function (life) {
    this.life = life;
    this.render();
  }

  LifeIndicator.prototype.render = function () {
    var c = this.ctx;
    var w = c.canvas.width, h = c.canvas.height;
    c.clearRect(0, 0, w, h);
    // TODO
    var g = Math.floor(255*this.life);
    var r = 255-g;
    c.fillStyle = "rgb("+r+","+g+",0)";
    var wt = 6;
    var ht = 12;
    c.fillRect((w-wt)/2, 0, wt, ht);
    c.fillRect(0, ht, w, h);
  }

  window.LifeIndicator = LifeIndicator;

}());
