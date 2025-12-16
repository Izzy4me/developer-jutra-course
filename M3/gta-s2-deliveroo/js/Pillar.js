export default class Pillar {
  constructor(x, y, r, color = '#888') {
    this.x = x;
    this.y = y;
    this.r = r;
    this.color = color;
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fill();
  }
}
