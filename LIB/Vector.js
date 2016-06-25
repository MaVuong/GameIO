function Vector(x, y) {
    this.x = x;
    this.y = y;

    // this.ux=0;
    // this.uy=0;
    // if (this.legth()==0){
    // 	this.ux=0;
    // 	this.uy=0;
    // }else{
    // 	this.ux=this.x/this.legth();
    // 	this.uy=this.y/this.legth();
    // }
}
Vector.prototype.getDistance = function (otherpos) {
    return Math.sqrt(Math.pow(this.x - otherpos.x, 2) + Math.pow(this.y - otherpos.y, 2));
}
Vector.prototype.multipleNumber = function (num_ber) {
    this.x = this.x * num_ber;
    this.y = this.y * num_ber;
}
Vector.prototype.addVector = function (other_vector) {
    this.x = this.x + other_vector.x;
    this.y = this.y + other_vector.y;
}
Vector.prototype.legth = function () {
    return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
}


module.exports = Vector;