import * as p5 from './lib/p5';

class Vehicle {
    constructor(x, y) {
        this.acceleration = p5.createVector(0, 0);
        this.velocity = p5.createVector(0, -2);
        this.position = p5.createVector(x, y);
        this.r = 6;
        this.maxspeed = 8;
        this.maxforce = 0.2;
    }

    update() {
        this.velocity.add(this.acceleration);
        this.velocity.limit(this.maxspeed);
        this.position.add(this.velocity);
        this.acceleration.mult(0);
    }

    applyForce(force) {
        this.acceleration.add(force);
    }

    seek(target) {
        let desired = p5.Vector.sub(target, position);

        // Scale to maximum speed
        desired.setMag(this.maxspeed);

        // Steering = Desired minus velocity
        let steer = p5.Vector.sub(desired, this.velocity);
        steer.limit(this.maxforce); // Limit to maximum steering force

        this.applyForce(steer);
    }

    display() {
        // Draw a triangle rotated in the direction of velocity
        let theta = this.velocity.heading() + p5.PI / 2;
        p5.fill(127);
        p5.stroke(200);
        p5.strokeWeight(1);
        p5.push();
        p5.translate(this.position.x, this.position.y);
        p5.rotate(theta);
        p5.beginShape();
        p5.vertex(0, -this.r * 2);
        p5.vertex(-this.r, this.r * 2);
        p5.vertex(this.r, this.r * 2);
        p5.endShape(p5.CLOSE);
        p5.pop();
    }


}
