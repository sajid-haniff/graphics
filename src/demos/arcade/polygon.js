export const createPolygon = ({
                                  sk,
                                  points = [],
                                  position = { x: 0, y: 0 },
                                  velocity = sk.createVector(0, 0),
                                  color = '#0F0',
                                  size = 1,
                                  tag = 'entity'
                              }) => {
    return {
        tag,
        color,
        points,
        position: { ...position },
        velocity,
        size,
        draw(sk) {
            sk.push();
            sk.translate(this.position.x, this.position.y);
            sk.stroke(this.color);
            sk.noFill();
            sk.beginShape();
            for (const pt of this.points) {
                sk.vertex(pt.x * this.size, pt.y * this.size);
            }
            sk.endShape(sk.CLOSE);
            sk.pop();
        }
    };
};
